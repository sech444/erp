export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'],

  // Email
  SMTP_HOST:    process.env.SMTP_HOST    || 'smtp.sendgrid.net',
  SMTP_PORT:    process.env.SMTP_PORT    || '587',
  SMTP_USER:    process.env.SMTP_USER    || 'apikey',
  SMTP_PASS:    process.env.SMTP_PASS    || '',
  FROM_EMAIL:   process.env.FROM_EMAIL   || 'noreply@techserv.ae',
  FROM_NAME:    process.env.FROM_NAME    || 'TechServ ERP',
  HR_ALERT_EMAIL: process.env.HR_ALERT_EMAIL || '',

  BCRYPT_ROUNDS: 12,
  VAT_RATE: 0.05,
};
