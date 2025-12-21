/**
 * Subscription Downgrader Utility
 * Süresi dolen abonelikleri otomatik olarak Free Trial planına düşürür
 */

const { supabase } = require('./supabaseClient');
const logger = require('./logger');

/**
 * Free Trial planını veritabanından alır
 * @returns {Promise<object|null>} Free Trial plan objesi veya null
 */
async function getFreeTrialPlan() {
    const { data: trialPlan, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Free Trial')
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        logger.error('[DOWNGRADE] Error fetching Free Trial plan:', error);
        return null;
    }

    return trialPlan;
}

/**
 * Süresi dolmuş abonelikleri tespit eder
 * @returns {Promise<Array>} Süresi dolmuş abonelik listesi
 */
async function getExpiredSubscriptions() {
    const now = new Date().toISOString();

    // Süresi dolmuş ve hala "active" durumunda olan abonelikleri bul
    // Free Trial zaten olan kullanıcıları hariç tut
    const { data: expired, error } = await supabase
        .from('subscriptions')
        .select(`
      *,
      users!inner(id, email, firstname, lastname),
      subscription_plans!plan_id(id, name)
    `)
        .eq('status', 'active')
        .lt('enddate', now)
        .neq('plantype', 'Free Trial');

    if (error) {
        logger.error('[DOWNGRADE] Error fetching expired subscriptions:', error);
        return [];
    }

    return expired || [];
}

/**
 * Tek bir kullanıcıyı Free Trial planına düşürür
 * @param {string} userId - Kullanıcı ID
 * @param {object} freeTrialPlan - Free Trial plan objesi
 * @param {object} existingSubscription - Mevcut abonelik objesi
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function downgradeUserToFreeTrial(userId, freeTrialPlan, existingSubscription) {
    try {
        // Mevcut aboneliği "expired" olarak işaretle
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingSubscription.id);

        if (updateError) {
            logger.error(`[DOWNGRADE] Error marking subscription as expired for user ${userId}:`, updateError);
            return { success: false, message: `Abonelik güncellenemedi: ${updateError.message}` };
        }

        // Yeni Free Trial aboneliği oluştur
        const newSubscription = {
            user_id: userId,
            plan_id: freeTrialPlan.id,
            stripepriceid: freeTrialPlan.id, // Plan ID'yi stripepriceid olarak da set et (usageLimiter uyumu için)
            plantype: 'Free Trial',
            status: 'active',
            startdate: new Date().toISOString(),
            enddate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl
            audio_creation_count: 0,
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await supabase
            .from('subscriptions')
            .insert([newSubscription])
            .select()
            .single();

        if (insertError) {
            logger.error(`[DOWNGRADE] Error creating Free Trial subscription for user ${userId}:`, insertError);
            return { success: false, message: `Free Trial oluşturulamadı: ${insertError.message}` };
        }

        logger.info(`[DOWNGRADE] User ${userId} downgraded to Free Trial. New subscription ID: ${inserted.id}`);
        return { success: true, message: 'Kullanıcı Free Trial planına düşürüldü' };
    } catch (e) {
        logger.error(`[DOWNGRADE] Unexpected error for user ${userId}:`, e);
        return { success: false, message: e.message };
    }
}

/**
 * Tüm süresi dolmuş abonelikleri Free Trial'a düşürür
 * @returns {Promise<{processed: number, succeeded: number, failed: number, details: Array}>}
 */
async function downgradeAllExpiredSubscriptions() {
    const startTime = Date.now();
    logger.info('[DOWNGRADE] Starting expired subscription downgrade process...');

    // Free Trial planını al
    const freeTrialPlan = await getFreeTrialPlan();
    if (!freeTrialPlan) {
        logger.error('[DOWNGRADE] Free Trial plan not found. Aborting.');
        return {
            processed: 0,
            succeeded: 0,
            failed: 0,
            details: [],
            error: 'Free Trial plan bulunamadı',
        };
    }

    // Süresi dolmuş abonelikleri bul
    const expiredSubscriptions = await getExpiredSubscriptions();
    logger.info(`[DOWNGRADE] Found ${expiredSubscriptions.length} expired subscription(s) to process`);

    if (expiredSubscriptions.length === 0) {
        return {
            processed: 0,
            succeeded: 0,
            failed: 0,
            details: [],
            message: 'Süresi dolmuş abonelik bulunamadı',
        };
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const sub of expiredSubscriptions) {
        const userId = sub.user_id;
        const userEmail = sub.users?.email || 'unknown';
        const oldPlan = sub.subscription_plans?.name || sub.plantype || 'Unknown';

        const result = await downgradeUserToFreeTrial(userId, freeTrialPlan, sub);

        results.push({
            userId,
            userEmail,
            oldPlan,
            expiredAt: sub.enddate,
            ...result,
        });

        if (result.success) {
            succeeded++;
            logger.info(`[DOWNGRADE] ✅ ${userEmail} (${oldPlan}) -> Free Trial`);
        } else {
            failed++;
            logger.warn(`[DOWNGRADE] ❌ ${userEmail}: ${result.message}`);
        }
    }

    const duration = Date.now() - startTime;
    logger.info(`[DOWNGRADE] Process completed in ${duration}ms. Succeeded: ${succeeded}, Failed: ${failed}`);

    return {
        processed: expiredSubscriptions.length,
        succeeded,
        failed,
        duration,
        details: results,
    };
}

/**
 * Belirli bir kullanıcının aboneliğini kontrol edip gerekirse düşürür
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<{wasDowngraded: boolean, message: string}>}
 */
async function checkAndDowngradeIfExpired(userId) {
    const now = new Date();

    // Kullanıcının aktif aboneliğini bul
    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !subscription) {
        return { wasDowngraded: false, message: 'Aktif abonelik bulunamadı' };
    }

    // Free Trial zaten ise downgrade yapma
    if (subscription.plantype === 'Free Trial') {
        return { wasDowngraded: false, message: 'Kullanıcı zaten Free Trial planında' };
    }

    // Bitiş tarihini kontrol et
    const endDate = subscription.enddate ? new Date(subscription.enddate) : null;
    if (!endDate || endDate >= now) {
        return { wasDowngraded: false, message: 'Abonelik henüz sona ermemiş' };
    }

    // Free Trial planını al ve düşür
    const freeTrialPlan = await getFreeTrialPlan();
    if (!freeTrialPlan) {
        return { wasDowngraded: false, message: 'Free Trial plan bulunamadı' };
    }

    const result = await downgradeUserToFreeTrial(userId, freeTrialPlan, subscription);
    return {
        wasDowngraded: result.success,
        message: result.message,
    };
}

module.exports = {
    getFreeTrialPlan,
    getExpiredSubscriptions,
    downgradeUserToFreeTrial,
    downgradeAllExpiredSubscriptions,
    checkAndDowngradeIfExpired,
};
