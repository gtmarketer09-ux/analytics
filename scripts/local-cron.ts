import { spawn, type ChildProcess } from 'node:child_process';
import cron from 'node-cron';

const TIME_ZONE = 'Asia/Karachi';
const BASE_URL = process.env.LOCAL_APP_URL ?? 'http://localhost:3000';

function getTodayMinusOne(timeZone: string): string {
  const now = new Date();
  const localDate = new Date(now.toLocaleString('en-US', { timeZone }));
  localDate.setDate(localDate.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = localDate.getFullYear();
  const m = pad(localDate.getMonth() + 1);
  const d = pad(localDate.getDate());
  return `${y}-${m}-${d}`;
}

async function waitForServer(attempts = 30): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return true;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function syncUrl(name: string, path: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (process.env.CRON_SECRET) {
    headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  }
  console.log(`[cron] Triggering ${name}: ${BASE_URL}${path}`);
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[${name}] ERROR (${response.status}): ${body}`);
    throw new Error(`${name} failed (${response.status}): ${body}`);
  }
  console.log(`[${name}] Success: ${body}`);
}

let server: ChildProcess | null = null;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
    throw new Error('CRON_SECRET is required when the cron scheduler targets production.');
  }

  const alreadyRunning = await waitForServer(2);
  if (!alreadyRunning) {
    console.log('[cron] Starting Next.js development server...');
    server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
      shell: true,
    });
  } else {
    console.log('[cron] Next.js server already reachable at ' + BASE_URL);
  }

  const ready = alreadyRunning || (await waitForServer(60));
  if (!ready) throw new Error(`Next.js server did not start at ${BASE_URL}`);

  console.log(`[cron] Server ready at ${BASE_URL}`);

  const TARGET_DATE = getTodayMinusOne(TIME_ZONE);
  console.log(`[cron] Target date (today-1): ${TARGET_DATE}`);

  // 1. 10:55 AM - Currency API (clear previous, fetch new)
  cron.schedule(
    '55 10 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 1: Currency API triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Clearing previous currency table and fetching for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('currency-conversion', `/api/cron/currency-conversion?clear=true&date=${TARGET_DATE}`);
        console.log('[cron] Currency conversion completed successfully.');
      } catch (err) {
        console.error('[cron] Currency conversion failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  // 2. 10:56 AM - Google Ads API
  cron.schedule(
    '15 12 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 2: Google Ads API triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Fetching Google Ads for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('googleads', `/api/cron/googleads?start=${TARGET_DATE}&end=${TARGET_DATE}&refresh=true`);
        console.log('[cron] Google Ads sync completed successfully.');
      } catch (err) {
        console.error('[cron] Google Ads sync failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  // 3. 10:57 AM - AdMob API
  cron.schedule(
    '57 10 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 3: AdMob API triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Fetching AdMob for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('admob', `/api/cron/admob?start=${TARGET_DATE}&end=${TARGET_DATE}&refresh=true`);
        console.log('[cron] AdMob sync completed successfully.');
      } catch (err) {
        console.error('[cron] AdMob sync failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  // 4. 10:58 AM - Google Play Console API
  cron.schedule(
    '58 10 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 4: Play Console API triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Fetching Play Console for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('play-console', `/api/cron/play-console?start=${TARGET_DATE}&end=${TARGET_DATE}`);
        console.log('[cron] Play Console sync completed successfully.');
      } catch (err) {
        console.error('[cron] Play Console sync failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  // 5. 10:59 AM - Firebase API (fetches and saves in-apps into play_console_daily_reports)
  cron.schedule(
    '59 10 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 5: Firebase API triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Fetching Firebase for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('firebase', `/api/cron/firebase?start=${TARGET_DATE}&end=${TARGET_DATE}&refresh=true`);
        console.log('[cron] Firebase sync completed successfully.');
      } catch (err) {
        console.error('[cron] Firebase sync failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  // 6. 11:00 AM - Daily Analytics calculation
  cron.schedule(
    '0 11 * * *',
    async () => {
      console.log(`\n======================================================`);
      console.log(`[cron] Stage 6: Daily Analytics calculation triggered at ${new Date().toLocaleTimeString()} (${TIME_ZONE})`);
      console.log(`[cron] Recalculating daily analytics for ${TARGET_DATE}...`);
      console.log(`======================================================\n`);
      try {
        await syncUrl('daily-analytics', `/api/cron/daily-analytics?date=${TARGET_DATE}`);
        console.log('[cron] Daily Analytics calculation completed successfully.');
      } catch (err) {
        console.error('[cron] Daily Analytics calculation failed:', err);
      }
    },
    { timezone: TIME_ZONE },
  );

  console.log(`[cron] Full Pipeline Registered (Timezone: ${TIME_ZONE}, Date: ${TARGET_DATE}):
  - 10:55 AM: Currency API (clear=true)
  - 10:56 AM: Google Ads API
  - 10:57 AM: AdMob API
  - 10:58 AM: Google Play Console API
  - 10:59 AM: Firebase API (syncs in-apps to Play Console)
  - 11:00 AM: Daily Analytics calculation
  Waiting for triggers...`);
}

process.on('SIGINT', () => {
  server?.kill();
  process.exit(0);
});

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  server?.kill();
  process.exit(1);
});
