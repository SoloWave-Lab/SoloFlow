import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { requireUser } from "~/lib/auth.server";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPlanSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly']),
  features: z.array(z.string()).optional(),
  maxDownloads: z.number().int().positive().optional(),
});

const subscribeSchema = z.object({
  planId: z.string().uuid(),
  paymentGatewaySubscriptionId: z.string().optional(),
});

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

// ============================================================================
// LOADER - GET SUBSCRIPTION PLANS OR USER SUBSCRIPTIONS
// ============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId");
  const view = url.searchParams.get("view"); // 'plans', 'my-subscriptions', 'subscribers'

  // Get subscription plans for a seller
  if (view === "plans" && sellerId) {
    const plans = await marketplaceRepository.getSubscriptionPlans(sellerId);

    return json({
      plans: plans.map(p => ({
        id: p.id,
        sellerId: p.seller_id,
        name: p.name,
        description: p.description,
        priceCents: p.price_cents,
        billingInterval: p.billing_interval,
        features: p.features,
        maxDownloads: p.max_downloads,
        activeSubscribers: parseInt(p.active_subscribers || '0'),
        isActive: p.is_active,
        createdAt: p.created_at,
      })),
    });
  }

  // Get user's subscriptions
  if (view === "my-subscriptions") {
    const subscriptions = await marketplaceRepository.getUserSubscriptions(user.userId);

    return json({
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        planId: s.plan_id,
        planName: s.plan_name,
        priceCents: s.price_cents,
        billingInterval: s.billing_interval,
        maxDownloads: s.max_downloads,
        sellerId: s.seller_id,
        sellerName: s.seller_name,
        status: s.status,
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        cancelAtPeriodEnd: s.cancel_at_period_end,
        cancelledAt: s.cancelled_at,
        downloadsUsed: s.downloads_used,
        downloadsRemaining: s.max_downloads ? s.max_downloads - s.downloads_used : null,
        createdAt: s.created_at,
      })),
    });
  }

  // Get seller's subscribers (seller only)
  if (view === "subscribers") {
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    const subscribers = await marketplaceRepository.getSellerSubscribers(seller.id);

    return json({
      subscribers: subscribers.map(s => ({
        id: s.id,
        planId: s.plan_id,
        planName: s.plan_name,
        userId: s.user_id,
        userEmail: s.user_email,
        status: s.status,
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        downloadsUsed: s.downloads_used,
        createdAt: s.created_at,
      })),
    });
  }

  // Check subscription access for a specific seller
  if (sellerId && !view) {
    const access = await marketplaceRepository.checkSubscriptionAccess({
      userId: user.userId,
      sellerId,
    });

    return json({
      hasAccess: access.hasAccess,
      subscription: access.subscription ? {
        id: access.subscription.id,
        status: access.subscription.status,
        currentPeriodEnd: access.subscription.current_period_end,
        downloadsUsed: access.subscription.downloads_used,
        downloadsRemaining: access.downloadsRemaining,
      } : null,
    });
  }

  return json({ error: "Invalid request parameters" }, { status: 400 });
}

// ============================================================================
// ACTION - CREATE PLAN, SUBSCRIBE, OR CANCEL
// ============================================================================

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const method = request.method;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // CREATE SUBSCRIPTION PLAN (Seller only)
  if (method === "POST" && action === "create-plan") {
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    if (seller.status !== "active") {
      return json({ error: "Seller account is not active" }, { status: 403 });
    }

    try {
      const body = await request.json();
      const data = createPlanSchema.parse(body);

      const plan = await marketplaceRepository.createSubscriptionPlan({
        sellerId: seller.id,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
        billingInterval: data.billingInterval,
        features: data.features,
        maxDownloads: data.maxDownloads,
      });

      return json({
        success: true,
        plan: {
          id: plan.id,
          name: plan.name,
          priceCents: plan.price_cents,
          billingInterval: plan.billing_interval,
          createdAt: plan.created_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid plan data", details: error.errors }, { status: 400 });
      }
      console.error("Error creating subscription plan:", error);
      return json({ error: "Failed to create subscription plan" }, { status: 500 });
    }
  }

  // SUBSCRIBE TO A PLAN
  if (method === "POST" && action === "subscribe") {
    try {
      const body = await request.json();
      const data = subscribeSchema.parse(body);

      // Get plan details
      const { rows: planRows } = await marketplaceRepository['getPool']().query(
        `SELECT * FROM marketplace_subscription_plans WHERE id = $1 AND is_active = true`,
        [data.planId]
      );

      if (planRows.length === 0) {
        return json({ error: "Subscription plan not found" }, { status: 404 });
      }

      const plan = planRows[0];

      // Check if user already has an active subscription to this seller
      const existingAccess = await marketplaceRepository.checkSubscriptionAccess({
        userId: user.userId,
        sellerId: plan.seller_id,
      });

      if (existingAccess.hasAccess) {
        return json({ error: "You already have an active subscription with this seller" }, { status: 409 });
      }

      // TODO: Process payment through payment gateway
      // For now, we'll create the subscription directly
      // In production, this should be done after successful payment

      const subscription = await marketplaceRepository.createSubscription({
        planId: data.planId,
        userId: user.userId,
        sellerId: plan.seller_id,
        paymentGatewaySubscriptionId: data.paymentGatewaySubscriptionId,
      });

      return json({
        success: true,
        subscription: {
          id: subscription.id,
          planId: subscription.plan_id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          createdAt: subscription.created_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid subscription data", details: error.errors }, { status: 400 });
      }
      console.error("Error creating subscription:", error);
      return json({ error: "Failed to create subscription" }, { status: 500 });
    }
  }

  // CANCEL SUBSCRIPTION
  if (method === "POST" && action === "cancel") {
    try {
      const body = await request.json();
      const data = cancelSubscriptionSchema.parse(body);

      // Verify subscription belongs to user
      const subscriptions = await marketplaceRepository.getUserSubscriptions(user.userId);
      const subscription = subscriptions.find(s => s.id === data.subscriptionId);

      if (!subscription) {
        return json({ error: "Subscription not found" }, { status: 404 });
      }

      if (subscription.status !== 'active') {
        return json({ error: "Subscription is not active" }, { status: 400 });
      }

      await marketplaceRepository.cancelSubscription(
        data.subscriptionId,
        data.cancelAtPeriodEnd
      );

      return json({
        success: true,
        message: data.cancelAtPeriodEnd
          ? "Subscription will be cancelled at the end of the current billing period"
          : "Subscription cancelled immediately",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid cancellation data", details: error.errors }, { status: 400 });
      }
      console.error("Error cancelling subscription:", error);
      return json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action or method" }, { status: 400 });
}