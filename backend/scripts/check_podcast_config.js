
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

async function checkConfig() {
    console.log('Checking podcast configuration in external_services...');
    try {
        const { data, error } = await supabase
            .from('external_services')
            .select('*')
            .eq('service_name', 'podcast_generator');

        if (error) {
            console.error('Error querying external_services:', error);
        } else {
            console.log('Podcast Generator Config:', data);
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

checkConfig();
