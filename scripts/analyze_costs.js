const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lingroot_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function analyzeCosts() {
  try {
    await client.connect();
    
    console.log("Veritabanı bağlantısı başarılı. Maliyet analizi yapılıyor...");

    const query = `
      SELECT 
        id,
        created_at,
        input_type,
        entry_source,
        openai_model,
        audio_duration_seconds,
        tts_characters,
        openai_prompt_tokens, 
        openai_completion_tokens,
        openai_total_tokens,
        openai_cost_usd
      FROM contenthistory
      WHERE input_type IN ('topic', 'text')
      ORDER BY created_at DESC
      LIMIT 20;
    `;

    const res = await client.query(query);
    
    console.log("\n--- SON İŞLEMLERİN DETAYLI ANALİZİ ---");
    console.log("Tarih".padEnd(25) + "Tip".padEnd(10) + "Süre(dk)".padEnd(10) + "Maliyet($)".padEnd(12) + "ToplamToken".padEnd(15) + "Girdi/Çıktı");
    console.log("-".repeat(100));

    res.rows.forEach(row => {
        const date = new Date(row.created_at).toLocaleString('tr-TR');
        const duration = row.audio_duration_seconds ? (row.audio_duration_seconds / 60).toFixed(2) : '0.00';
        const cost = row.openai_cost_usd ? parseFloat(row.openai_cost_usd).toFixed(4) : '0.0000';
        const tokens = row.openai_total_tokens || 0;
        const breakdown = `${row.openai_prompt_tokens || 0}/${row.openai_completion_tokens || 0}`;
        
        // Maliyet verimliliği (Dakika başına maliyet)
        let efficiency = 'N/A';
        if (row.audio_duration_seconds > 0 && parseFloat(cost) > 0) {
            const costPerMin = (parseFloat(cost) / (row.audio_duration_seconds / 60)).toFixed(4);
            efficiency = `$${costPerMin}/dk`;
        }

        console.log(`${date.padEnd(24)} ${row.input_type.padEnd(10)} ${duration.padEnd(10)} ${cost.padEnd(12)} ${String(tokens).padEnd(15)} ${breakdown.padEnd(15)} ${efficiency}`);
    });
    
  } catch (err) {
    console.error('Hata:', err);
  } finally {
    await client.end();
  }
}

analyzeCosts();
