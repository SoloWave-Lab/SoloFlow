import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { requireUser } from "~/lib/auth.server";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  listingId: z.string().uuid(),
  amountCents: z.number().int().positive(),
});

const createCouponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minPurchaseCents: z.number().int().nonnegative().optional(),
  maxDiscountCents: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  applicableTo: z.enum(['all', 'specific_listings', 'categories']).default('all'),
  applicableIds: z.array(z.string().uuid()).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const updateCouponSchema = z.object({
  couponId: z.string().uuid(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
});

// ============================================================================
// LOADER - GET COUPONS
// ============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Validate coupon code
  if (action === "validate") {
    const code = url.searchParams.get("code");
    const listingId = url.searchParams.get("listingId");
    const amountCents = url.searchParams.get("amountCents");

    if (!code || !listingId || !amountCents) {
      return json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
      const validation = validateCouponSchema.parse({
        code,
        listingId,
        amountCents: parseInt(amountCents),
      });

      const result = await marketplaceRepository.validateCoupon({
        code: validation.code,
        userId: user.userId,
        listingId: validation.listingId,
        amountCents: validation.amountCents,
      });

      if (!result.valid) {
        return json({ valid: false, reason: result.reason }, { status: 200 });
      }

      return json({
        valid: true,
        discountCents: result.discountCents,
        finalAmountCents: validation.amountCents - (result.discountCents || 0),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
      }
      throw error;
    }
  }

  // Get seller's coupons
  const seller = await marketplaceRepository.getSellerByUserId(user.userId);
  if (!seller) {
    return json({ error: "Seller profile not found" }, { status: 404 });
  }

  const coupons = await marketplaceRepository.getSellerCoupons(seller.id);

  return json({
    coupons: coupons.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minPurchaseCents: c.min_purchase_cents,
      maxDiscountCents: c.max_discount_cents,
      usageLimit: c.usage_limit,
      usageCount: c.usage_count,
      perUserLimit: c.per_user_limit,
      applicableTo: c.applicable_to,
      applicableIds: c.applicable_ids,
      startsAt: c.starts_at,
      expiresAt: c.expires_at,
      isActive: c.is_active,
      totalUsage: parseInt(c.total_usage || '0'),
      totalDiscountGiven: parseInt(c.total_discount_given || '0'),
      createdAt: c.created_at,
    })),
  });
}

// ============================================================================
// ACTION - CREATE/UPDATE COUPON
// ============================================================================

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const seller = await marketplaceRepository.getSellerByUserId(user.userId);

  if (!seller) {
    return json({ error: "Seller profile not found" }, { status: 404 });
  }

  if (seller.status !== "active") {
    return json({ error: "Seller account is not active" }, { status: 403 });
  }

  const method = request.method;

  // CREATE COUPON
  if (method === "POST") {
    try {
      const body = await request.json();
      const data = createCouponSchema.parse(body);

      // Validate discount value
      if (data.discountType === 'percentage' && (data.discountValue < 1 || data.discountValue > 100)) {
        return json({ error: "Percentage discount must be between 1 and 100" }, { status: 400 });
      }

      // Validate applicable IDs
      if (data.applicableTo !== 'all' && (!data.applicableIds || data.applicableIds.length === 0)) {
        return json({ error: "Applicable IDs required when applicableTo is not 'all'" }, { status: 400 });
      }

      // Check if code already exists
      const existing = await marketplaceRepository.getCouponByCode(data.code);
      if (existing) {
        return json({ error: "Coupon code already exists" }, { status: 409 });
      }

      const coupon = await marketplaceRepository.createCoupon({
        sellerId: seller.id,
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchaseCents: data.minPurchaseCents,
        maxDiscountCents: data.maxDiscountCents,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit,
        applicableTo: data.applicableTo,
        applicableIds: data.applicableIds,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });

      return json({
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          createdAt: coupon.created_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid coupon data", details: error.errors }, { status: 400 });
      }
      console.error("Error creating coupon:", error);
      return json({ error: "Failed to create coupon" }, { status: 500 });
    }
  }

  // UPDATE COUPON
  if (method === "PATCH") {
    try {
      const body = await request.json();
      const data = updateCouponSchema.parse(body);

      // Verify coupon belongs to seller
      const coupon = await marketplaceRepository.getCouponByCode(data.couponId);
      if (!coupon || coupon.seller_id !== seller.id) {
        return json({ error: "Coupon not found" }, { status: 404 });
      }

      await marketplaceRepository.updateCoupon({
        couponId: data.couponId,
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        usageLimit: data.usageLimit,
      });

      return json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid update data", details: error.errors }, { status: 400 });
      }
      console.error("Error updating coupon:", error);
      return json({ error: "Failed to update coupon" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}