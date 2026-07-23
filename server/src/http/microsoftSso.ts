// ============================================================
// MICROSOFT ENTRA SSO (AIE 2026-07-23)
// "Sign in with Microsoft", restricted to the Lightspeed email domain.
//
// Standard OAuth2 authorization-code flow implemented with built-in fetch —
// no extra dependency. Inert until the Entra app registration values are set
// in the environment (MS_CLIENT_ID / MS_CLIENT_SECRET / MS_TENANT_ID /
// MS_REDIRECT_URI). MS_ALLOWED_DOMAIN restricts which email domain may sign in.
//
// TO GO LIVE (Lightspeed IT): register an app in Entra, add a Web redirect URI
// of {app-origin}/auth/microsoft/callback, create a client secret, then set the
// five MS_* env vars in Railway. No code change needed.
// ============================================================
import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool } from '../db.js';
import { mintToken } from '../auth.js';
import { env } from '../env.js';

export function microsoftSsoConfigured(): boolean {
  return !!(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.MS_TENANT_ID && env.MS_REDIRECT_URI);
}

export function registerMicrosoftSso(app: Express) {
  const base = () => `https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0`;

  // Kick off sign-in.
  app.get('/auth/microsoft', (req: Request, res: Response) => {
    if (!microsoftSsoConfigured()) return res.redirect('/login?sso=unconfigured');
    const state = crypto.randomBytes(16).toString('hex');
    (req as any).session.msState = state;
    const params = new URLSearchParams({
      client_id: env.MS_CLIENT_ID,
      response_type: 'code',
      redirect_uri: env.MS_REDIRECT_URI,
      response_mode: 'query',
      scope: 'openid email profile',
      state,
    });
    res.redirect(`${base()}/authorize?${params.toString()}`);
  });

  // OAuth callback: exchange the code, enforce the domain, sign in.
  app.get('/auth/microsoft/callback', async (req: Request, res: Response) => {
    try {
      if (!microsoftSsoConfigured()) return res.redirect('/login?sso=unconfigured');
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const expected = (req as any).session?.msState;
      if (!code || !state || state !== expected) return res.redirect('/login?sso=state');
      delete (req as any).session.msState;

      const body = new URLSearchParams({
        client_id: env.MS_CLIENT_ID,
        client_secret: env.MS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.MS_REDIRECT_URI,
        scope: 'openid email profile',
      });
      const tokenRes = await fetch(`${base()}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!tokenRes.ok) return res.redirect('/login?sso=token');
      const tok = (await tokenRes.json()) as { id_token?: string };
      if (!tok.id_token) return res.redirect('/login?sso=token');

      // Decode the id_token payload. Tokens come directly from Microsoft over
      // TLS during the code exchange; add JWKS signature verification if this
      // ever accepts tokens from an untrusted source.
      const payloadB64 = tok.id_token.split('.')[1] ?? '';
      const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, any>;
      const email = String(claims.email || claims.preferred_username || '').toLowerCase().trim();
      const name = (claims.name as string) || null;
      if (!email || !email.includes('@')) return res.redirect('/login?sso=noemail');

      const domain = (env.MS_ALLOWED_DOMAIN || '').toLowerCase();
      if (domain && !email.endsWith(`@${domain}`)) return res.redirect('/login?sso=domain');

      // Find or create the user (identity only; org attributes come from the
      // admin upload). Existing password/SSO users match on email.
      const existing = await pool.query('SELECT id, is_active FROM users WHERE email = $1', [email]);
      let userId: string;
      if (existing.rows[0]) {
        if (existing.rows[0].is_active === false) return res.redirect('/login?sso=inactive');
        userId = existing.rows[0].id;
        await pool.query('UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1', [userId]);
      } else {
        const ins = await pool.query(
          `INSERT INTO users (sub, email, name, role, is_active, last_login_at)
           VALUES ($1, $2, $3, 'user', true, now()) RETURNING id`,
          [`msft:${email}`, email, name],
        );
        userId = ins.rows[0].id;
      }

      (req as any).session.userId = userId;
      // Also hand the SPA a bearer token (used in cross-site-iframe contexts).
      const token = mintToken(userId);
      (req as any).session.save(() => res.redirect(`/?token=${encodeURIComponent(token)}`));
    } catch (e) {
      console.error('[sso] callback error', e);
      res.redirect('/login?sso=error');
    }
  });
}
