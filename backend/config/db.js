const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const winston = require('winston');

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

// Supabase istemcisi
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  logger.info('Supabase client initialized');
} else {
  logger.warn('Supabase URL or key not provided. Supabase client not initialized.');
}

// PostgreSQL havuzu
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production',
  max: 20, // Bağlantı havuzu boyutu
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    
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

module.exports = {
  pool,
  supabase,
  testConnection,
  testSupabaseConnection,
  query: (text, params) => pool.query(text, params),
};
