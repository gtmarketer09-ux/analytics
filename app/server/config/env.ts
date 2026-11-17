import 'server-only';
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export const env = {
  get database() {
    const port = Number(process.env.DB_PORT || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be a valid TCP port');
    }
    return {
      host: process.env.DB_HOST?.trim() || 'localhost',
      port,
      username: required('DB_USER'),
      password: process.env.DB_PASSWORD ?? '',
      database: required('DB_NAME'),
    };
  },
  get admob() {
    const publisherId = required('ADMOB_PUBLISHER_ID');
    if (!/^pub-\d+$/.test(publisherId)) throw new Error('ADMOB_PUBLISHER_ID must look like pub-1234567890123456');
    return {
      clientId: required('GOOGLE_CLIENT_ID'),
      clientSecret: required('GOOGLE_CLIENT_SECRET'),
      refreshToken: required('ADMOB_REFRESH_TOKEN'),
      publisherId,
      redirectUri: process.env.ADMOB_REDIRECT_URI?.trim() || 'http://localhost:3000/auth/google/callback',
    };
  },
  get cronSecret() {
    return required('CRON_SECRET');
  },
};


export const settings = {
  timeZone: 'Asia/Karachi',
  lookbackDays: 3,
  maxDaysPerSync: 90,
  get admobAudToUsdRate() {
    const rate = Number(process.env.ADMOB_AUD_TO_USD_RATE || 0.65);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('ADMOB_AUD_TO_USD_RATE must be a positive number.');
    }
    return rate;
  },
};