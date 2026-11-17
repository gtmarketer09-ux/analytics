# AdMob Analytics Dashboard

Next.js dashboard for daily AdMob metrics stored in MySQL.

## Requirements

- Node.js 20 or later
- MySQL 8.0+
- AdMob OAuth client credentials and a publisher ID

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the database and AdMob credentials.
3. Start the dashboard with `npm run dev` and open [http://localhost:3000](http://localhost:3000).
4. Run `npm run lint` and `npm run build` to check the project.

The dashboard displays an empty state until reports have been synchronized. Dashboard pages and charts read only from MySQL; they never call the AdMob API.

## Daily data refresh

Run `npm run cron:local` on a machine that stays online to schedule the daily data pipeline at 11:00 AM Asia/Karachi. The scheduler starts the local Next.js development server if one is not already reachable at `LOCAL_APP_URL` (defaults to `http://localhost:3000`), then refreshes currency rates, AdMob, Play Console, Google Ads, Firebase, and the daily analytics aggregate for yesterday. Keep the scheduler process running; stop it with Ctrl+C.

When targeting a production deployment, set `LOCAL_APP_URL` to its base URL and provide `CRON_SECRET`. For a production deployment, keep this scheduler running on an always-on host.

The dashboard displays an empty state until reports have been synchronized. The sync endpoint is `GET /api/cron/admob`; in production it requires an `Authorization: Bearer <CRON_SECRET>` header. Each sync updates the report for that date, so retries are safe.
