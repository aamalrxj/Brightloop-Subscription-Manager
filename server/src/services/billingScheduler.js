
import cron from 'node-cron';
import { runBilling } from './billingService.js';

let isRunning = false;

export function startBillingScheduler() {
  if (process.env.BILLING_CRON_ENABLED === 'false') {
    console.log('[Billing Scheduler] Disabled by configuration');
    return null;
  }

  const task = cron.schedule(
    '5 0 * * *',
    async () => {
      if (isRunning) {
        console.warn('[Billing Scheduler] Previous run is still active. Skipping.');
        return;
      }

      isRunning = true;

      try {
        console.log('[Billing Scheduler] Starting daily billing...');

        const summary = await runBilling({
          asOf: new Date(),
          autoConfirm: true,
        });

        console.log('[Billing Scheduler] Completed:', {
          created: summary.created,
          skipped: summary.skipped,
          failed: summary.failed,
          closed: summary.closed,
        });

        if (summary.errors.length > 0) {
          console.error('[Billing Scheduler] Errors:', summary.errors);
        }
      } catch (error) {
        console.error('[Billing Scheduler] Failed:', error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log(
    '[Billing Scheduler] Enabled: daily at 12:05 AM Asia/Kolkata'
  );

  return task;
}
