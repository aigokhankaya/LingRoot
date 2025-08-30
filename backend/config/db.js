const { Pool } = require('pg');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabase } = require('../utils/supabaseClient');

// Logger yapılandırması
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

// Supabase client is provided by shared utility

// SUPABASE_URL'den proje referansını çıkar ve DB host oluştur (örn: db.<ref>.supabase.co)
const supabaseUrlEnv = (process.env.SUPABASE_URL || '').trim();
let derivedDbHost = '';
try {
  if (supabaseUrlEnv) {
    const u = new URL(supabaseUrlEnv);
    const host = u.hostname; // <ref>.supabase.co veya api.<ref>.supabase.co
    const match = host.match(/^(?:api\.)?([a-z0-9-]{10,})\.supabase\.co$/i);
    if (match && match[1]) {
      derivedDbHost = `db.${match[1]}.supabase.co`;
    }
  }
} catch { /* ignore parse errors */ }

// SSL kullanımını ortam ve host'a göre belirle
// Production'da pooler kullanıyoruz: aws-0-eu-central-1.pooler.supabase.com:6543
// Local env'de PGHOST varsa ama db.*.supabase.co ise pooler'a yönlendir
let configuredHost = process.env.PGHOST || process.env.DB_HOST || process.env.SUPABASE_DB_HOST;
if (configuredHost && configuredHost.startsWith('db.') && configuredHost.includes('.supabase.co')) {
  configuredHost = 'aws-0-eu-central-1.pooler.supabase.com';
}
const resolvedHost = (configuredHost || 'aws-0-eu-central-1.pooler.supabase.com').trim();
const isSupabaseHost = /\.supabase\.co$/i.test(resolvedHost) || resolvedHost.includes('pooler.supabase.com');
const sslRequiredByEnv = (process.env.DB_SSL || '').toLowerCase() === 'true' || (process.env.PGSSLMODE || '').toLowerCase() === 'require';
const useSSL = sslRequiredByEnv || isSupabaseHost || process.env.NODE_ENV === 'production';
logger.info(`[DB] Connecting to PostgreSQL`, {
  host: resolvedHost.replace(/([\w-])\w*(\.[\w-]+)+/, '$1***'), // lightly mask
  port: process.env.PGPORT || process.env.DB_PORT,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  ssl: useSSL,
  isSupabaseHost
});
logger.debug(`[DB] Resolved host (unmasked): ${resolvedHost}`);

// PostgreSQL havuzu (ENV değişkenlerinden bağlan)
const pool = new Pool({
  host: resolvedHost,
  port: configuredHost === 'aws-0-eu-central-1.pooler.supabase.com' ? 6543 : (process.env.PGPORT || process.env.DB_PORT || 6543),
  user: configuredHost === 'aws-0-eu-central-1.pooler.supabase.com' ? 'postgres.ffqfcmmbeeieouoghrac' : (process.env.PGUSER || process.env.DB_USER || 'postgres.ffqfcmmbeeieouoghrac'),
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'postgres',
  // Supabase ve üretim ortamları için SSL'i etkinleştir
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20, // Bağlantı havuzu boyutu
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Bağlantı havuzu olayları
pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error:', err);
});

// Veritabanı bağlantısını test etme fonksiyonu
const testConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('PostgreSQL database connection successful');
    client.release();
    return true;
  } catch (error) {
    logger.error('PostgreSQL database connection failed:', error);
    return false;
  }
};

// Supabase bağlantısını test etme fonksiyonu
const testSupabaseConnection = async () => {
  if (!supabase) {
    logger.error('Supabase client not initialized');
    return false;
  }

  try {
    const { data, error } = await supabase.from('Health_check').select('*').limit(1);
    
    if (error) {
      logger.error('Supabase connection test failed:', error);
      return false;
    }
    
    logger.info('Supabase connection test successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection test failed with exception:', error);
    return false;
  }
};

const dbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST,
  port: process.env.PGPORT || process.env.DB_PORT,
  user: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.PGDATABASE || process.env.DB_NAME,
};

module.exports = {
  pool,
  supabase,
  testConnection,
  testSupabaseConnection,
  query: (text, params) => pool.query(text, params),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
  dbConfig,
};
