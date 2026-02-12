const { Pool } = require('pg');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabase } = require('../utils/storage/supabaseClient.js');

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

// SUPABASE_URL'den proje referansını çıkar
const supabaseUrlEnv = (process.env.SUPABASE_URL || '').trim();
let projectRef = '';
try {
  if (supabaseUrlEnv) {
    const u = new URL(supabaseUrlEnv);
    const host = u.hostname; // <ref>.supabase.co veya api.<ref>.supabase.co
    const match = host.match(/^(?:api\.)?([a-z0-9-]{10,})\.supabase\.co$/i);
    if (match && match[1]) {
      projectRef = match[1];
    }
  }
} catch { /* ignore parse errors */ }

// SSL kullanımını ortam ve host'a göre belirle
// PGHOST tanımlıysa onu kullan, yoksa pooler kullan
let configuredHost = process.env.PGHOST || process.env.DB_HOST || process.env.SUPABASE_DB_HOST;
if (!configuredHost) {
  configuredHost = 'aws-0-eu-central-1.pooler.supabase.com';
}
const resolvedHost = configuredHost.trim();
const isPooler = resolvedHost.includes('pooler.supabase.com');

// Pooler kullanılıyorsa ve user sadece 'postgres' ise, project ref ekle
let dbUser = process.env.PGUSER || process.env.DB_USER || 'postgres';
if (isPooler && dbUser === 'postgres' && projectRef) {
  dbUser = `postgres.${projectRef}`;
}
const isSupabaseHost = /\.supabase\.co$/i.test(resolvedHost) || resolvedHost.includes('pooler.supabase.com');
const sslRequiredByEnv = (process.env.DB_SSL || '').toLowerCase() === 'true' || (process.env.PGSSLMODE || '').toLowerCase() === 'require';
const useSSL = sslRequiredByEnv || isSupabaseHost || process.env.NODE_ENV === 'production';
const resolvedPort = parseInt(process.env.PGPORT || process.env.DB_PORT || (isPooler ? '6543' : '5432'), 10);
logger.info(`[DB] Connecting to PostgreSQL`, {
  host: resolvedHost.replace(/([\w-])\w*(\.[\w-]+)+/, '$1***'), // lightly mask
  port: resolvedPort,
  user: dbUser.replace(/\..*/, '.*****'), // mask project ref
  database: process.env.PGDATABASE || process.env.DB_NAME,
  ssl: useSSL,
  isPooler
});
logger.debug(`[DB] Resolved host (unmasked): ${resolvedHost}`);

// PostgreSQL havuzu (ENV değişkenlerinden bağlan)
const pool = new Pool({
  host: resolvedHost,
  port: resolvedPort,
  user: dbUser,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'postgres',
  // Supabase ve üretim ortamları için SSL'i etkinleştir
  ssl: useSSL ? { rejectUnauthorized: process.env.NODE_ENV === 'production' } : false,
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
  host: resolvedHost,
  port: resolvedPort,
  user: dbUser,
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
