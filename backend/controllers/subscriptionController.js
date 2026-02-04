const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();
const logger = require('../utils/common/logger.js'); // Import logger
const { supabase } = require('../utils/storage/supabaseClient.js');
// const { logStep } = require('../utils/common/stepLogger.js');
const { v4: uuidv4 } = require('uuid');
const { checkLimits } = require('../utils/infra/usageLimiter.js');
const { getTtsProvider } = require('../services/voiceModelService.js');
const { getTtsTiers } = require('../utils/infra/costTracker.js');

// Supabase client is provided by utils/supabaseClient (guarded init)

// Get subscription plans
exports.getSubscriptionPlans = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    logger.info("Fetching subscription plans");
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      logger.error("Error fetching subscription plans from Supabase:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching subscription plans",
        error: error.message,
      });
    }

    logger.info(`Successfully fetched ${data.length} subscription plans`);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error("Server error while fetching subscription plans:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching subscription plans",
      error: error.message,
    });
  }
};

// Create checkout session
exports.createCheckoutSession = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const { planId } = req.body;
    const userId = req.user.id;
    logger.info(`Creating checkout session for user ID: ${userId}, Plan ID: ${planId}`);

    // Validate input
    if (!planId) {
      logger.warn(`Create checkout session failed for user ID ${userId}: Missing planId`);
      return res.status(400).json({
        success: false,
        message: "Please provide planId",
      });
    }

    // Fetch plan and user details in parallel (independent queries)
    logger.debug(`Fetching plan (${planId}) and user (${userId}) details in parallel`);
    const [planResult, userResult] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("id", planId).single(),
      supabase.from("users").select("email").eq("id", userId).single(),
    ]);

    const { data: plan, error: planError } = planResult;
    if (planError || !plan) {
      logger.warn(`Create checkout session failed: Plan ID ${planId} not found or Supabase error:`, planError);
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    const { data: user, error: userError } = userResult;
    if (userError || !user) {
      logger.warn(`Create checkout session failed: User ID ${userId} not found or Supabase error:`, userError);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create Stripe checkout session
    logger.info(`Creating Stripe checkout session for user ID: ${userId}, Email: ${user.email}, Plan ID: ${planId}`);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.price * 100, // Stripe uses cents
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId,
        planId,
      },
    });

    logger.info(`Stripe checkout session created successfully for user ID: ${userId}, Session ID: ${session.id}`);
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    logger.error(`Server error while creating checkout session for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating checkout session",
      error: error.message,
    });
  }
};

// Handle webhook
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    logger.info("Received Stripe webhook event");
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      logger.info(`Stripe webhook event constructed successfully: ${event.type} (ID: ${event.id})`);
    } catch (err) {
      logger.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        logger.info(`Handling checkout.session.completed event for Session ID: ${session.id}`);
        await handleCheckoutSessionCompleted(session);
        break;
      case "customer.subscription.updated":
        const subscription = event.data.object;
        logger.info(`Handling customer.subscription.updated event for Subscription ID: ${subscription.id}, Status: ${subscription.status}`);
        await handleSubscriptionUpdated(subscription);
        break;
      case "customer.subscription.deleted":
        const canceledSubscription = event.data.object;
        logger.info(`Handling customer.subscription.deleted event for Subscription ID: ${canceledSubscription.id}`);
        await handleSubscriptionCanceled(canceledSubscription);
        break;
      default:
        logger.warn(`Unhandled Stripe webhook event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    // Errors from helper functions are caught here
    logger.error(`Webhook handler error for event type ${event?.type} (ID: ${event?.id}):`, error);
    // Respond with 500 but let Stripe retry if needed
    return res.status(500).json({
      success: false,
      message: "Server error while handling webhook",
      error: error.message,
    });
  }
};

// Helper function to handle checkout session completed
async function handleCheckoutSessionCompleted(session) {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const { userId, planId } = session.metadata;
    logger.info(`Processing completed checkout session for User ID: ${userId}, Plan ID: ${planId}, Subscription ID: ${session.subscription}`);

    // Create subscription record in database
    const { error } = await supabase.from("Subscriptions").insert([
      {
        user_id: userId,
        plan_id: planId,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        status: "active", // Initial status, will be confirmed by subscription.updated
        // Placeholder end date, will be updated by subscription.updated event
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), 
      },
    ]);

    if (error) {
      logger.error(`Error creating subscription record in Supabase for User ID ${userId}, Subscription ID ${session.subscription}:`, error);
      throw error; // Re-throw to be caught by the main webhook handler
    }
    logger.info(`Subscription record created successfully for User ID: ${userId}, Subscription ID: ${session.subscription}`);

    // Do not modify users.role here; access should derive from subscriptions.status
    logger.info(`Subscription provisioned for User ID: ${userId}; access will derive from subscriptions.status`);

  } catch (error) {
    // Log error from this specific helper
    logger.error(`Error in handleCheckoutSessionCompleted for Session ID ${session.id}:`, error);
    throw error; // Re-throw to be caught by the main webhook handler
  }
}

// Helper function to handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    logger.info(`Processing updated subscription for Stripe Subscription ID: ${subscription.id}, Status: ${subscription.status}`);
    // Get subscription from database
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (error || !data) {
      logger.error(`Error finding subscription in Supabase for Stripe Subscription ID ${subscription.id}:`, error);
      throw error || new Error("Subscription not found in DB");
    }
    logger.debug(`Found subscription record ID ${data.id} for Stripe Subscription ID ${subscription.id}`);

    // Update subscription status
    const newStatus = subscription.status;
    const newEndDate = new Date(subscription.current_period_end * 1000).toISOString();
    logger.info(`Updating subscription record ID ${data.id} to Status: ${newStatus}, End Date: ${newEndDate}`);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: newStatus,
        current_period_end: newEndDate,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq("id", data.id);

    if (updateError) {
      logger.error(`Error updating subscription record ID ${data.id} in Supabase:`, updateError);
      throw updateError;
    }
    logger.info(`Subscription record ID ${data.id} updated successfully.`);

    // Do not modify users.role; clients should read subscriptions.status for access control
    logger.info(`Subscription status for User ID ${data.user_id} is now ${newStatus}; clients should derive access from this`);

  } catch (error) {
    logger.error(`Error in handleSubscriptionUpdated for Stripe Subscription ID ${subscription.id}:`, error);
    throw error; // Re-throw to be caught by the main webhook handler
  }
}

// Helper function to handle subscription canceled (deleted in Stripe)
async function handleSubscriptionCanceled(subscription) {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    logger.info(`Processing canceled subscription for Stripe Subscription ID: ${subscription.id}`);
    // Get subscription from database
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (error || !data) {
      // It might already be marked as canceled if cancel_at_period_end was true
      logger.warn(`Subscription not found or already processed for Stripe Subscription ID ${subscription.id}:`, error);
      return; // Exit gracefully if not found
    }
    logger.debug(`Found subscription record ID ${data.id} for Stripe Subscription ID ${subscription.id}`);

    // Update subscription status to 'canceled'
    logger.info(`Updating subscription record ID ${data.id} to Status: canceled`);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: false, // Ensure this is false now
      })
      .eq("id", data.id);

    if (updateError) {
      logger.error(`Error updating subscription record ID ${data.id} to canceled in Supabase:`, updateError);
      throw updateError;
    }
    logger.info(`Subscription record ID ${data.id} updated to canceled.`);

    // Do not modify users.role on cancellation; access will adjust via subscriptions.status
    logger.info(`Subscription canceled for User ID ${data.user_id}; access will adjust via subscriptions.status`);

  } catch (error) {
    logger.error(`Error in handleSubscriptionCanceled for Stripe Subscription ID ${subscription.id}:`, error);
    throw error; // Re-throw to be caught by the main webhook handler
  }
}

// Get user subscription
exports.getUserSubscription = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const userId = req.user.id;
    logger.info(`Fetching subscription details for user ID: ${userId}`);

    // Get user's subscription (no relational select)
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") { // Ignore 'No rows found' error
      logger.error(`Error fetching subscription for user ID ${userId} from Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error fetching subscription",
        error: error.message,
      });
    }

    if (!sub) {
        logger.info(`No active subscription found for user ID: ${userId}`);
        return res.status(200).json({
          success: true,
          data: null // Return null if no subscription exists
        });
    }

    // Load plan separately (avoid FK relationship requirement)
    let plan = null;
    try {
      if (sub.plan_id) {
        const { data: p } = await supabase
          .from('subscription_plans')
          .select('id, name, price, plantype, is_active, audio_limit, features, monthly_price, yearly_price, description, interval, created_at')
          .eq('id', sub.plan_id)
          .single();
        plan = p || null;
      }
    } catch {}

    logger.info(`Successfully fetched subscription details for user ID: ${userId}, Subscription ID: ${sub.id}`);
    return res.status(200).json({
      success: true,
      data: { ...sub, plan },
    });
  } catch (error) {
    logger.error(`Server error while fetching subscription for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching subscription",
      error: error.message,
    });
  }
};

// Cancel subscription (at period end)
exports.cancelSubscription = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const userId = req.user.id;
    logger.info(`Request to cancel subscription at period end for user ID: ${userId}`);

    // Get user's active subscription
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
        logger.error(`Error fetching active subscription for cancellation for user ID ${userId}:`, error);
        return res.status(500).json({ success: false, message: "Error checking subscription status" });
    }

    if (!data || !data.stripe_subscription_id) {
      logger.warn(`Cancel subscription failed: Active subscription not found for user ID ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    // Cancel subscription at period end via Stripe
    logger.info(`Requesting Stripe to cancel subscription ${data.stripe_subscription_id} at period end.`);
    await stripe.subscriptions.update(data.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    logger.info(`Stripe subscription ${data.stripe_subscription_id} set to cancel at period end.`);

    // Update subscription in database
    logger.info(`Updating subscription record ${data.id} in Supabase to reflect cancellation at period end.`);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      })
      .eq("id", data.id);

    if (updateError) {
      logger.error(`Error updating subscription record ${data.id} in Supabase after Stripe cancellation request:`, updateError);
      // Proceed to inform user, but log the inconsistency
      return res.status(500).json({
        success: false,
        message: "Error updating local subscription status after cancellation request",
        error: updateError.message,
      });
    }

    logger.info(`Subscription ${data.id} for user ${userId} successfully marked for cancellation at period end.`);
    return res.status(200).json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error) {
    logger.error(`Server error while canceling subscription for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while canceling subscription",
      error: error.message,
    });
  }
};

// Resume subscription
exports.resumeSubscription = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const userId = req.user.id;
    logger.info(`Request to resume subscription for user ID: ${userId}`);

    // Get user's subscription scheduled for cancellation
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active") // Must be active to resume
      .eq("cancel_at_period_end", true)
      .maybeSingle();

     if (error && error.code !== "PGRST116") {
        logger.error(`Error fetching subscription scheduled for cancellation for user ID ${userId}:`, error);
        return res.status(500).json({ success: false, message: "Error checking subscription status" });
    }

    if (!data || !data.stripe_subscription_id) {
      logger.warn(`Resume subscription failed: Active subscription scheduled for cancellation not found for user ID ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Subscription not found or not scheduled for cancellation",
      });
    }

    // Resume subscription via Stripe
    logger.info(`Requesting Stripe to resume subscription ${data.stripe_subscription_id}.`);
    await stripe.subscriptions.update(data.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    logger.info(`Stripe subscription ${data.stripe_subscription_id} resumed.`);

    // Update subscription in database
    logger.info(`Updating subscription record ${data.id} in Supabase to reflect resumption.`);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
      })
      .eq("id", data.id);

    if (updateError) {
      logger.error(`Error updating subscription record ${data.id} in Supabase after Stripe resumption request:`, updateError);
       // Proceed to inform user, but log the inconsistency
      return res.status(500).json({
        success: false,
        message: "Error updating local subscription status after resumption request",
        error: updateError.message,
      });
    }

    logger.info(`Subscription ${data.id} for user ${userId} successfully resumed.`);
    return res.status(200).json({
      success: true,
      message: "Subscription resumed successfully",
    });
  } catch (error) {
    logger.error(`Server error while resuming subscription for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while resuming subscription",
      error: error.message,
    });
  }
};

// Update subscription (Change Plan) - Creates a checkout session for update
exports.updateSubscription = async (req, res) => {
  const requestId = uuidv4();
  // let stepSequence = 1;
  // logStep({ ... });

  try {
    const userId = req.user.id;
    const { planId } = req.body;
    logger.info(`Request to update subscription for user ID: ${userId} to new Plan ID: ${planId}`);

    // Validate input
    if (!planId) {
      logger.warn(`Update subscription failed for user ID ${userId}: Missing planId`);
      return res.status(400).json({
        success: false,
        message: "Please provide planId",
      });
    }

    // Get user's active subscription
    logger.debug(`Fetching active subscription for user ID: ${userId}`);
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
        logger.error(`Error fetching active subscription for update for user ID ${userId}:`, error);
        return res.status(500).json({ success: false, message: "Error checking current subscription" });
    }

    if (!subscription || !subscription.stripe_subscription_id) {
      logger.warn(`Update subscription failed: Active subscription not found for user ID ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    // Get new plan details (specifically Stripe Price ID)
    logger.debug(`Fetching new plan details for Plan ID: ${planId}`);
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("stripe_price_id") // Assuming you have stripe_price_id in your plans table
      .eq("id", planId)
      .single();

    if (planError || !plan || !plan.stripe_price_id) {
      logger.warn(`Update subscription failed: New Plan ID ${planId} or its Stripe Price ID not found:`, planError);
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found or missing Stripe Price ID",
      });
    }

    // Create Stripe checkout session for subscription update
    // Note: This might not be the standard way. Usually, you update the subscription directly.
    // Using checkout for updates might create new subscriptions or items.
    // Consider using stripe.subscriptions.update with the new price ID directly if possible.
    // However, if using checkout is intended:
    logger.info(`Creating Stripe checkout session for subscription update for User ID: ${userId}, Customer: ${subscription.stripe_customer_id}, New Price ID: ${plan.stripe_price_id}`);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: subscription.stripe_customer_id,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      // This part is tricky with checkout. Check Stripe docs for best practice.
      // 'subscription_behavior: update' might not exist. 
      // You might need to handle the update logic in the webhook based on the checkout session completion.
      // subscription: subscription.stripe_subscription_id, // This might link it
      metadata: {
        userId,
        planId,
        existingSubscriptionId: subscription.stripe_subscription_id, // Pass existing ID for webhook logic
        update: "true", // Flag for webhook logic
      },
    });

    logger.info(`Stripe checkout session for update created successfully for user ID: ${userId}, Session ID: ${session.id}`);
    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    logger.error(`Server error while updating subscription for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating subscription",
      error: error.message,
    });
  }
};

// Try an operation on multiple candidate table names (case differences in legacy db)
async function tryOnTables(opFactory) {
  const tables = ['subscriptions', 'Subscriptions'];
  let lastError = null;
  for (const t of tables) {
    try {
      const result = await opFactory(t);
      if (!result || !result.error) return result;
      lastError = result.error;
      const msg = String(lastError?.message || '').toLowerCase();
      if (msg.includes('relation') && msg.includes('does not exist')) {
        continue;
      }
    } catch (e) {
      lastError = e;
    }
  }
  return { data: null, error: lastError };
}

// Mock Iyzico payment: immediately provision subscription without external call
exports.mockIyzicoPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body || {};
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId gereklidir' });
    }

    // Verify plan exists and active
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, price, plantype, is_active, audio_limit, features, interval, created_at')
      .eq('id', planId)
      .eq('is_active', true)
      .single();
    if (planError || !plan) {
      return res.status(404).json({ success: false, message: 'Plan bulunamadı' });
    }

    // Upsert active subscription for user
    const now = Date.now();
    const end = new Date(now + (plan.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    // Build base payload (will prune unknown columns on error and retry)
    // Align with existing subscriptions schema (see provided columns)
    const insertPayloadBase = {
      user_id: userId,
      plantype: plan?.name || String(plan?.id || ''),
      status: 'active',
      startdate: new Date().toISOString(),
      enddate: end,
      stripesubscriptionid: `mock_sub_${uuidv4()}`,
      stripepriceid: plan?.stripe_price_id || String(plan?.id || ''),
      cancelatperiodend: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Helper: extract missing column name from error message
    const extractMissingColumn = (errMsg) => {
      try {
        const s = String(errMsg || '');
        // Postgres style: column "col" does not exist
        let m = s.match(/column\s+\"?([a-zA-Z0-9_]+)\"?\s+does not exist/i);
        if (m) return m[1];
        // Supabase style: Could not find the 'col' column of 'subscriptions' in the schema cache
        m = s.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
        if (m) return m[1];
        // Single quote variant
        m = s.match(/column\s+'([a-zA-Z0-9_]+)'\s+does not exist/i);
        if (m) return m[1];
        return null;
      } catch { return null; }
    };

    async function insertWithPrune(payload, maxRetries = 5) {
      let attempt = 0;
      let lastError = null;
      let working = { ...payload };
      while (attempt <= maxRetries) {
        const resIns = await supabase
          .from('subscriptions')
          .insert([working])
          .select()
          .single();
        if (!resIns.error) return resIns;
        lastError = resIns.error;
        const missing = extractMissingColumn(lastError.message);
        if (!missing) break;
        // Do not prune critical keys
        if (missing === 'user_id' || missing === 'plan_id') break;
        delete working[missing];
        attempt += 1;
      }
      return { data: null, error: lastError };
    }

    let dbRes = await insertWithPrune(insertPayloadBase, 6);

    // If duplicate/unique error, update latest record for this user (best effort)
    if (dbRes.error) {
      const code = dbRes.error.code || '';
      const msg = (dbRes.error.message || '').toLowerCase();
      if (code === '23505' || msg.includes('duplicate')) {
        const latest = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest.data) {
          // Try update with pruning as well
          async function updateWithPrune(payload, maxRetries = 5) {
            let attempt = 0;
            let lastError = null;
            let working = { ...payload };
            while (attempt <= maxRetries) {
              const resUpd = await supabase
                .from('subscriptions')
                .update(working)
                .eq('id', latest.data.id)
                .select()
                .single();
              if (!resUpd.error) return resUpd;
              lastError = resUpd.error;
              const missing = extractMissingColumn(lastError.message);
              if (!missing) break;
              if (missing === 'user_id' || missing === 'plan_id') break;
              delete working[missing];
              attempt += 1;
            }
            return { data: null, error: lastError };
          }

          const updatePayload = {
            plantype: insertPayloadBase.plantype,
            status: 'active',
            startdate: new Date().toISOString(),
            enddate: end,
            stripesubscriptionid: insertPayloadBase.stripesubscriptionid,
            stripepriceid: insertPayloadBase.stripepriceid,
            cancelatperiodend: false,
            updated_at: new Date().toISOString(),
          };
          dbRes = await updateWithPrune(updatePayload, 6);
        }
      }
    }

    if (dbRes.error) {
      logger.error('[MOCK-PAYMENT] Abonelik güncelleme/ekleme hatası:', dbRes.error);
      return res.status(500).json({ success: false, message: 'Abonelik güncellenemedi', error: dbRes.error.message });
    }

    // Do not modify users.role; subscription is active and clients should read subscriptions.status

    return res.json({ success: true, message: 'Mock ödeme başarılı, abonelik aktif edildi', data: dbRes.data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: e.message });
  }
};

// Usage summary for current period based on active subscription
exports.getUsageSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = await checkLimits(userId);

    // Resolve TTS provider & tier pricing (non-blocking for hasPlan=false)
    let ttsProvider = 'google';
    try { ttsProvider = await getTtsProvider(); } catch {}
    const ttsTiers = getTtsTiers(ttsProvider);

    if (!state.hasPlan) {
      return res.json({
        success: true,
        data: {
          hasPlan: false,
          isExpired: state.isExpired || false,
          expiredAt: state.expiredAt,
          message: state.message,
          ttsProvider,
          ttsTiers,
        }
      });
    }
    return res.json({
      success: true,
      data: {
        hasPlan: true,
        subscription: state.subscription,
        plan: state.plan,
        plantype: state.plan?.name,
        periodStart: state.periodStart,
        usage: state.usage,
        limits: state.limits,
        exceeded: state.exceeded,
        isExceeded: state.isExceeded,
        ttsProvider,
        ttsTiers,
        // Free Trial özel alanları
        isFreeTrialExhausted: state.isFreeTrialExhausted || false,
        audioCreationCount: state.audioCreationCount,
        maxAudioCount: state.maxAudioCount,
        remainingAudioCount: state.remainingAudioCount,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: e.message });
  }
};

