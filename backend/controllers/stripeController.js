/**
 * Stripe Payment Controller
 * 
 * Kredi kartı ödemeleri için Stripe entegrasyonu.
 * iyzico controller'a paralel yapıda, CardTransaction ve PaymentProvider
 * tablolarını kullanır.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const { v4: uuidv4 } = require('uuid');

// ============================================
// STRIPE API HELPERS
// ============================================

/**
 * Stripe API yapılandırmasını PaymentProvider'dan al
 */
const getStripeConfig = async () => {
  try {
    const { data: provider, error } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('name', 'stripe')
      .eq('is_active', true)
      .single();

    if (error || !provider) {
      // Fallback to environment variables
      return {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.STRIPE_ENVIRONMENT || 'test',
        provider: null
      };
    }

    return {
      secretKey: provider.secret_key || process.env.STRIPE_SECRET_KEY,
      webhookSecret: provider.settings?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET,
      environment: provider.environment,
      provider
    };
  } catch (err) {
    logger.error('Error getting Stripe config:', err);
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      environment: 'test',
      provider: null
    };
  }
};

/**
 * Stripe client oluştur
 */
const getStripeClient = async () => {
  const config = await getStripeConfig();
  return stripe;
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * Tek seferlik ödeme için Payment Intent oluştur
 * POST /api/stripe/payment-intent
 */
exports.createPaymentIntent = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const { planId, saveCard } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
    }

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID gerekli' });
    }

    // Plan bilgisini al
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan bulunamadı' });
    }

    // Kullanıcı bilgisini al
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Provider bilgisini al
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id')
      .eq('name', 'stripe')
      .eq('is_active', true)
      .single();

    // Stripe Payment Intent oluştur
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100), // Kuruş cinsinden
      currency: plan.currency?.toLowerCase() || 'try',
      receipt_email: user.email,
      metadata: {
        userId,
        planId,
        requestId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Transaction kaydı oluştur
    const { data: transaction, error: txError } = await supabase
      .from('card_transactions')
      .insert({
        user_id: userId,
        payment_provider_id: provider?.id,
        plan_id: planId,
        transaction_type: 'payment',
        status: 'pending',
        amount: plan.price,
        currency: plan.currency || 'TRY',
        stripe_payment_intent_id: paymentIntent.id,
        customer_email: user.email,
        customer_ip: req.ip || req.headers['x-forwarded-for'],
        metadata: { requestId, planName: plan.name }
      })
      .select()
      .single();

    if (txError) {
      logger.error('Transaction kayıt hatası:', txError);
    }

    logger.info(`Payment Intent oluşturuldu: ${paymentIntent.id} - User: ${userId}`);

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction?.id,
      amount: plan.price,
      currency: plan.currency || 'TRY'
    });

  } catch (error) {
    logger.error('Payment Intent oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme başlatılamadı',
      error: error.message
    });
  }
};

/**
 * Stripe Checkout Session oluştur (hosted checkout)
 * POST /api/stripe/checkout
 */
exports.createCheckoutSession = async (req, res) => {
  const requestId = uuidv4();

  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
    }

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID gerekli' });
    }

    // Plan bilgisini al
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan bulunamadı' });
    }

    // Kullanıcı bilgisini al
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Stripe customer oluştur veya mevcut olanı kullan
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId }
      });
      customerId = customer.id;

      // Customer ID'yi kaydet
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Checkout session oluştur
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency?.toLowerCase() || 'try',
          product_data: {
            name: plan.name,
            description: plan.description || `LingRoot ${plan.name} Paketi`
          },
          unit_amount: Math.round(plan.price * 100),
          ...(plan.interval && plan.interval !== 'one_time' ? {
            recurring: { interval: plan.interval === 'yearly' ? 'year' : 'month' }
          } : {})
        },
        quantity: 1
      }],
      mode: plan.interval && plan.interval !== 'one_time' ? 'subscription' : 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/checkout/result?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/checkout/result?status=cancelled`,
      metadata: {
        userId,
        planId,
        requestId
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Provider bilgisini al
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id')
      .eq('name', 'stripe')
      .eq('is_active', true)
      .single();

    // Transaction kaydı oluştur
    await supabase
      .from('card_transactions')
      .insert({
        user_id: userId,
        payment_provider_id: provider?.id,
        plan_id: planId,
        transaction_type: 'payment',
        status: 'pending',
        amount: plan.price,
        currency: plan.currency || 'TRY',
        stripe_session_id: session.id,
        customer_email: user.email,
        customer_ip: req.ip || req.headers['x-forwarded-for'],
        metadata: { requestId, planName: plan.name, mode: sessionConfig.mode }
      });

    logger.info(`Checkout session oluşturuldu: ${session.id} - User: ${userId}`);

    return res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    logger.error('Checkout session oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme sayfası oluşturulamadı',
      error: error.message
    });
  }
};

/**
 * Stripe Webhook handler
 * POST /api/stripe/webhook
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const config = await getStripeConfig();
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, config.webhookSecret);
    } catch (err) {
      logger.error('Webhook signature doğrulama hatası:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    logger.info(`Stripe webhook alındı: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return res.json({ received: true });

  } catch (error) {
    logger.error('Webhook işleme hatası:', error);
    return res.status(500).json({ error: 'Webhook işlenemedi' });
  }
};

/**
 * Ödeme durumunu kontrol et
 * GET /api/stripe/payment-status/:paymentIntentId
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Transaction kaydını güncelle
    const { data: transaction } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    return res.json({
      success: true,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      transactionId: transaction?.id
    });

  } catch (error) {
    logger.error('Payment status kontrol hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme durumu kontrol edilemedi'
    });
  }
};

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handlePaymentIntentSucceeded(paymentIntent) {
  const { userId, planId } = paymentIntent.metadata;

  logger.info(`Payment Intent başarılı: ${paymentIntent.id}`);

  // Transaction güncelle
  const { error } = await supabase
    .from('card_transactions')
    .update({
      status: 'completed',
      stripe_payment_id: paymentIntent.id,
      card_last_four_digits: paymentIntent.payment_method_details?.card?.last4,
      card_type: paymentIntent.payment_method_details?.card?.brand,
      processed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    logger.error('Transaction güncelleme hatası:', error);
  }

  // Kullanıcı planını güncelle
  if (userId && planId) {
    await supabase
      .from('users')
      .update({ plan_id: planId, membership_status: 'premium' })
      .eq('id', userId);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  logger.info(`Payment Intent başarısız: ${paymentIntent.id}`);

  await supabase
    .from('card_transactions')
    .update({
      status: 'failed',
      error_code: paymentIntent.last_payment_error?.code,
      error_message: paymentIntent.last_payment_error?.message,
      processed_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handleCheckoutCompleted(session) {
  const { userId, planId } = session.metadata;

  logger.info(`Checkout completed: ${session.id}`);

  // Transaction güncelle
  const { error } = await supabase
    .from('card_transactions')
    .update({
      status: 'completed',
      stripe_payment_id: session.payment_intent,
      stripe_subscription_id: session.subscription,
      processed_at: new Date().toISOString()
    })
    .eq('stripe_session_id', session.id);

  if (error) {
    logger.error('Transaction güncelleme hatası:', error);
  }

  // Kullanıcı planını güncelle
  if (userId && planId) {
    await supabase
      .from('users')
      .update({ plan_id: planId, membership_status: 'premium' })
      .eq('id', userId);

    // Subscription kaydı oluştur (eğer subscription mode ise)
    if (session.subscription) {
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          provider: 'stripe',
          provider_subscription_id: session.subscription,
          status: 'active',
          start_date: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
  }
}

async function handleSubscriptionUpdate(subscription) {
  logger.info(`Subscription güncellendi: ${subscription.id} - Status: ${subscription.status}`);

  // Subscription kaydını güncelle
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status,
      end_date: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null
    })
    .eq('provider_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
  logger.info(`Subscription iptal edildi: ${subscription.id}`);

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      end_date: new Date().toISOString()
    })
    .eq('provider_subscription_id', subscription.id);
}

async function handleChargeRefunded(charge) {
  logger.info(`Charge iade edildi: ${charge.id}`);

  await supabase
    .from('card_transactions')
    .update({
      status: 'refunded',
      refunded_amount: charge.amount_refunded / 100,
      refunded_at: new Date().toISOString()
    })
    .eq('stripe_payment_id', charge.payment_intent);
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * İade işlemi
 * POST /api/stripe/admin/refund
 */
exports.adminRefund = async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    // Transaction'ı bul
    const { data: transaction, error: txError } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return res.status(404).json({ success: false, message: 'İşlem bulunamadı' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Sadece tamamlanmış işlemler iade edilebilir' });
    }

    const paymentIntentId = transaction.stripe_payment_intent_id || transaction.stripe_payment_id;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Stripe payment ID bulunamadı' });
    }

    // İade miktarını hesapla
    const refundAmount = amount || (transaction.amount - transaction.refunded_amount);
    const maxRefundable = transaction.amount - transaction.refunded_amount;

    if (refundAmount > maxRefundable) {
      return res.status(400).json({ 
        success: false, 
        message: `Maksimum iade edilebilir tutar: ${maxRefundable}` 
      });
    }

    // Stripe iade
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason: reason === 'fraudulent' ? 'fraudulent' : 
              reason === 'duplicate' ? 'duplicate' : 'requested_by_customer'
    });

    // Transaction güncelle
    const newRefundedAmount = (transaction.refunded_amount || 0) + refundAmount;
    const newStatus = newRefundedAmount >= transaction.amount ? 'refunded' : 'completed';

    await supabase
      .from('card_transactions')
      .update({
        status: newStatus,
        refunded_amount: newRefundedAmount,
        refunded_at: new Date().toISOString(),
        refund_reason: reason
      })
      .eq('id', transactionId);

    logger.info(`İade tamamlandı: Transaction ${transactionId}, Refund ${refund.id}, Amount ${refundAmount}`);

    return res.json({
      success: true,
      refundId: refund.id,
      refundedAmount: refundAmount,
      totalRefunded: newRefundedAmount,
      status: newStatus
    });

  } catch (error) {
    logger.error('İade hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'İade işlemi başarısız',
      error: error.message
    });
  }
};

/**
 * Stripe sağlayıcı bağlantısını test et
 * POST /api/stripe/admin/test-connection
 */
exports.testConnection = async (req, res) => {
  try {
    // Stripe balance endpoint'i ile bağlantı testi
    const balance = await stripe.balance.retrieve();

    // Provider'ı güncelle
    await supabase
      .from('payment_providers')
      .update({
        last_tested_at: new Date().toISOString(),
        test_result: true
      })
      .eq('name', 'stripe');

    return res.json({
      success: true,
      testResult: true,
      message: 'Stripe bağlantısı başarılı',
      environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'production' : 'test'
    });

  } catch (error) {
    logger.error('Stripe bağlantı testi hatası:', error);

    await supabase
      .from('payment_providers')
      .update({
        last_tested_at: new Date().toISOString(),
        test_result: false
      })
      .eq('name', 'stripe');

    return res.status(400).json({
      success: false,
      testResult: false,
      message: 'Stripe bağlantısı başarısız',
      error: error.message
    });
  }
};

/**
 * Müşteri kart bilgilerini al
 * GET /api/stripe/admin/customer/:userId/cards
 */
exports.getCustomerCards = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.json({ success: true, cards: [] });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card'
    });

    const cards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year
    }));

    return res.json({ success: true, cards });

  } catch (error) {
    logger.error('Müşteri kartları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Kart bilgileri alınamadı'
    });
  }
};

module.exports = exports;
