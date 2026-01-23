const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Get API costs analytics from api_costs table
 * GET /api/admin/api-costs?from=...&to=...&groupBy=feature|user|provider
 */
router.get('/api-costs', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const { from, to, groupBy = 'feature', limit = 100, userId } = req.query;

        // Date range: default last 30 days
        const now = new Date();
        const toDate = to ? new Date(String(to)) : now;
        const fromDate = from ? new Date(String(from)) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const fromIso = fromDate.toISOString();
        const toIso = toDate.toISOString();

        logger.info(`[ADMIN API COSTS] Fetching from ${fromIso} to ${toIso}, groupBy=${groupBy}, userId=${userId || 'ALL'}`);

        // 1. Overview: Total costs
        let overviewQuery = supabase
            .from('api_costs')
            .select('cost_usd, provider, user_id')
            .gte('created_at', fromIso)
            .lt('created_at', toIso);

        if (userId) {
            overviewQuery = overviewQuery.eq('user_id', userId);
        }

        const { data: allCosts, error: overviewError } = await overviewQuery;

        if (overviewError) {
            logger.error('[ADMIN API COSTS] Overview query failed:', overviewError);
            return res.status(500).json({ success: false, message: 'Error fetching API costs overview' });
        }

        let totalCost = 0;
        const uniqueUsers = new Set();
        const providerCosts = {};

        (allCosts || []).forEach(row => {
            totalCost += Number(row.cost_usd || 0);
            if (row.user_id) uniqueUsers.add(row.user_id);
            const provider = row.provider || 'unknown';
            providerCosts[provider] = (providerCosts[provider] || 0) + Number(row.cost_usd || 0);
        });

        // 2. Group by selection
        let groupedData = [];

        if (groupBy === 'feature') {
            let query = supabase
                .from('api_costs')
                .select('feature, provider, model, cost_usd, input_quantity, output_quantity')
                .gte('created_at', fromIso)
                .lt('created_at', toIso)
                .order('created_at', { ascending: false });

            if (userId) query = query.eq('user_id', userId);

            const { data, error } = await query;

            if (error) {
                logger.error('[ADMIN API COSTS] Feature grouping failed:', error);
            } else {
                const featureMap = new Map();
                (data || []).forEach(row => {
                    const key = row.feature || 'unknown';
                    const current = featureMap.get(key) || {
                        feature: key,
                        total_cost_usd: 0,
                        call_count: 0,
                        providers: {},
                        models: {},
                        total_input: 0,
                        total_output: 0,
                    };
                    current.total_cost_usd += Number(row.cost_usd || 0);
                    current.call_count += 1;
                    current.total_input += Number(row.input_quantity || 0);
                    current.total_output += Number(row.output_quantity || 0);

                    const provider = row.provider || 'unknown';
                    current.providers[provider] = (current.providers[provider] || 0) + Number(row.cost_usd || 0);

                    const model = row.model || 'unknown';
                    current.models[model] = (current.models[model] || 0) + 1;

                    featureMap.set(key, current);
                });

                groupedData = Array.from(featureMap.values())
                    .map(item => ({
                        ...item,
                        total_cost_usd: Number(item.total_cost_usd.toFixed(6)),
                        avg_cost_per_call: item.call_count > 0 ? Number((item.total_cost_usd / item.call_count).toFixed(6)) : 0,
                    }))
                    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
            }
        } else if (groupBy === 'user') {
            let query = supabase
                .from('api_costs')
                .select('user_id, feature, cost_usd')
                .gte('created_at', fromIso)
                .lt('created_at', toIso)
                .not('user_id', 'is', null);

            if (userId) query = query.eq('user_id', userId);

            const { data, error } = await query;

            if (error) {
                logger.error('[ADMIN API COSTS] User grouping failed:', error);
            } else {
                const userMap = new Map();
                (data || []).forEach(row => {
                    const key = row.user_id;
                    const current = userMap.get(key) || {
                        user_id: key,
                        total_cost_usd: 0,
                        call_count: 0,
                        features: {},
                    };
                    current.total_cost_usd += Number(row.cost_usd || 0);
                    current.call_count += 1;

                    const feature = row.feature || 'unknown';
                    current.features[feature] = (current.features[feature] || 0) + Number(row.cost_usd || 0);

                    userMap.set(key, current);
                });

                groupedData = Array.from(userMap.values())
                    .map(item => ({
                        ...item,
                        total_cost_usd: Number(item.total_cost_usd.toFixed(6)),
                    }))
                    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
            }
        } else if (groupBy === 'provider') {
            let query = supabase
                .from('api_costs')
                .select('provider, model, feature, cost_usd, input_quantity, output_quantity')
                .gte('created_at', fromIso)
                .lt('created_at', toIso);

            if (userId) query = query.eq('user_id', userId);

            const { data, error } = await query;

            if (error) {
                logger.error('[ADMIN API COSTS] Provider grouping failed:', error);
            } else {
                const providerMap = new Map();
                (data || []).forEach(row => {
                    const key = row.provider || 'unknown';
                    const current = providerMap.get(key) || {
                        provider: key,
                        total_cost_usd: 0,
                        call_count: 0,
                        models: {},
                        features: {},
                        total_input: 0,
                        total_output: 0,
                    };
                    current.total_cost_usd += Number(row.cost_usd || 0);
                    current.call_count += 1;
                    current.total_input += Number(row.input_quantity || 0);
                    current.total_output += Number(row.output_quantity || 0);

                    const model = row.model || 'unknown';
                    current.models[model] = (current.models[model] || 0) + Number(row.cost_usd || 0);

                    const feature = row.feature || 'unknown';
                    current.features[feature] = (current.features[feature] || 0) + Number(row.cost_usd || 0);

                    providerMap.set(key, current);
                });

                groupedData = Array.from(providerMap.values())
                    .map(item => ({
                        ...item,
                        total_cost_usd: Number(item.total_cost_usd.toFixed(6)),
                    }))
                    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
            }
        }

        // 3. Recent API calls (for detail view)
        let recentQuery = supabase
            .from('api_costs')
            .select('*')
            .gte('created_at', fromIso)
            .lt('created_at', toIso)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (userId) recentQuery = recentQuery.eq('user_id', userId);

        const { data: recentCalls, error: recentError } = await recentQuery;

        if (recentError) {
            logger.warn('[ADMIN API COSTS] Recent calls query failed:', recentError);
        }

        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    from: fromIso,
                    to: toIso,
                    total_cost_usd: Number(totalCost.toFixed(6)),
                    total_calls: allCosts?.length || 0,
                    unique_users: uniqueUsers.size,
                    avg_cost_per_call: allCosts?.length > 0 ? Number((totalCost / allCosts.length).toFixed(6)) : 0,
                    by_provider: Object.entries(providerCosts).map(([provider, cost]) => ({
                        provider,
                        cost_usd: Number(cost.toFixed(6)),
                    })).sort((a, b) => b.cost_usd - a.cost_usd),
                },
                grouped: groupedData,
                recent_calls: (recentCalls || []).map(call => ({
                    ...call,
                    cost_usd: Number((call.cost_usd || 0).toFixed(6)),
                })),
            },
        });
    } catch (error) {
        logger.error('[ADMIN API COSTS] Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
