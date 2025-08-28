const { supabase } = require('../utils/supabaseClient');

async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.value : null;
}

async function setSetting(key, value) {
  // Upsert by key
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
  return true;
}

async function getUsdTryRate(defaultRate = 40) {
  try {
    const v = await getSetting('usd_try_rate');
    const num = v != null ? Number(v) : NaN;
    if (!isNaN(num) && num > 0) return num;
    // Seed default if missing/invalid
    await setSetting('usd_try_rate', String(defaultRate));
    return defaultRate;
  } catch {
    return defaultRate;
  }
}

module.exports = { getSetting, setSetting, getUsdTryRate };
