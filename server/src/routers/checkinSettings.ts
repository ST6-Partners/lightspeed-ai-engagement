// ============================================================
// CHECK-IN SETTINGS ROUTER — singleton config (cadence).
// get is open to any signed-in user; update is admin-only.
// ============================================================

import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { checkinSettings } from '../db/schema/checkins.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

const cadenceEnum = z.enum(['weekly', 'biweekly', 'monthly']);

async function ensureRow(db: any) {
  const existing = await db.query.checkinSettings.findFirst({ orderBy: [desc(checkinSettings.updatedAt)] });
  if (existing) return existing;
  const [row] = await db.insert(checkinSettings).values({ cadence: 'weekly' }).returning();
  return row;
}

export const checkinSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => ensureRow(ctx.db)),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ cadence: cadenceEnum }))
    .mutation(async ({ ctx, input }) => {
      const current = await ensureRow(ctx.db);
      const [row] = await ctx.db.update(checkinSettings)
        .set({ cadence: input.cadence, updatedAt: new Date() })
        .where(eq(checkinSettings.id, current.id)).returning();
      await auditChange(ctx.db, ctx.user.id, current.id, 'checkin_settings', 'update');
      return row;
    }),
});
