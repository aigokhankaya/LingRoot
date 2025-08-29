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

// PostgreSQL havuzu
const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST,
  port: process.env.PGPORT || process.env.DB_PORT,
  user: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  // Render/Postgres bazı ortamlarda self-signed sertifika döndürebilir.
  // Üretimde SSL açık, sertifika doğrulamasını kapatıyoruz.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
