// ============================================================
// VALUES SYNC SERVICE
// Read-only client for the company-values framework owned by the
// AI Talent Assessment app (ATA). Pulls definitions + rubric over a plain
// fetch (no SDK) from ATA's read-only endpoint and hands them to the values
// router, which upserts the local `company_values` cache.
//
// Config (Railway env — all optional; when unset, sync is a graceful no-op
// so local 'seed' values keep working):
//   ATA_VALUES_API_URL  full URL to ATA's values endpoint
//                       e.g. https://<ata-host>/api/values
//   ATA_VALUES_API_KEY  shared secret; sent as `x-api-key`
//
// Mirrors the fetch-based transport pattern used by services/email.ts.
// ============================================================

export interface RemoteValue {
  externalId: string;
  name: string;
  pillar: string;
  category: string | null;
  description: string | null;
  rubric: unknown;
  meta: unknown;
  sortOrder: number;
  active: boolean;
}

/** True when the ATA values endpoint is configured. */
export function isValuesSyncConfigured(): boolean {
  return Boolean(process.env.ATA_VALUES_API_URL && process.env.ATA_VALUES_API_KEY);
}

export function valuesSyncConfig() {
  return {
    configured: isValuesSyncConfigured(),
    url: process.env.ATA_VALUES_API_URL ?? null,
  };
}

/**
 * Fetch the current values framework from ATA. Throws on network/HTTP/shape
 * failure so the caller can report it; never partially applies.
 */
export async function fetchRemoteValues(): Promise<RemoteValue[]> {
  const url = process.env.ATA_VALUES_API_URL;
  const key = process.env.ATA_VALUES_API_KEY;
  if (!url || !key) {
    throw new Error('ATA values sync is not configured (set ATA_VALUES_API_URL + ATA_VALUES_API_KEY).');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': key, accept: 'application/json' },
    });
  } catch (e: any) {
    throw new Error(`Could not reach ATA values endpoint: ${e?.message ?? e}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ATA values endpoint returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const json: any = await res.json().catch(() => null);
  const raw = Array.isArray(json) ? json : json?.values;
  if (!Array.isArray(raw)) {
    throw new Error('ATA values endpoint returned an unexpected shape (expected { values: [...] }).');
  }

  // Normalize + tolerate id/externalId naming from the source.
  return raw.map((v: any): RemoteValue => ({
    externalId: String(v.externalId ?? v.id ?? ''),
    name: String(v.name ?? ''),
    pillar: String(v.pillar ?? ''),
    category: v.category ?? null,
    description: v.description ?? null,
    rubric: v.rubric ?? {},
    meta: v.meta ?? {},
    sortOrder: Number.isFinite(v.sortOrder) ? Number(v.sortOrder) : 0,
    active: v.active !== false,
  })).filter((v) => v.externalId && v.name && v.pillar);
}
