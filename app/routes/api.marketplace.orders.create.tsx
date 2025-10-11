import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { z } from "zod";
import { db } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";
import { createRazorpayOrder } from "../lib/marketplace/payment";
import crypto from "crypto";

// Schema for cart checkout
const createOrderSchema = z.object({
  items: z.array(
    z.object({
      listingId: z.string().uuid(),
      licensePlanId: z.string().uuid().optional(),
    })
  ),
  couponCode: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get authenticated user
    const { userId } = await requireAuth(request);
    
    console.log(`🛒 Creating order for user: ${userId}`);

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items, couponCode } = parsed.data;

    if (items.length === 0) {
      return json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate total from cart items
    let subtotalCents = 0;
    const orderItems = [];

    for (const item of items) {
      // Get listing details
      const { rows: listingRows } = await db.query<{
        id: string;
        title: string;
        price_cents: number;
        currency: string;
        status: string;
      }>(
        `SELECT id, title, price_cents, currency, status 
         FROM marketplace_listings 
         WHERE id = $1`,
        [item.listingId]
      );

      const listing = listingRows[0];
      if (!listing) {
        return json(
          { error: `Listing ${item.listingId} not found` },
          { status: 404 }
        );
      }

      if (listing.status !== "published") {
        return json(
          { error: `Listing "${listing.title}" is not available for purchase` },
          { status: 400 }
        );
      }

      // If license plan is specified, get its price
      let itemPrice = listing.price_cents;
      if (item.licensePlanId) {
        const { rows: planRows } = await db.query<{
          id: string;
          price_cents: number;
        }>(
          `SELECT id, price_cents 
           FROM marketplace_license_plans 
           WHERE id = $1 AND listing_id = $2`,
          [item.licensePlanId, item.listingId]
        );

        const plan = planRows[0];
        if (plan) {
          itemPrice = plan.price_cents;
        }
      }

      subtotalCents += itemPrice;
      orderItems.push({
        listingId: item.listingId,
        licensePlanId: item.licensePlanId || null,
        priceCents: itemPrice,
      });
    }

    // Apply coupon if provided
    let discountCents = 0;
    let couponDetails = null;

    if (couponCode) {
      const { rows: couponRows } = await db.query<{
        id: string;
        code: string;
        discount_type: string;
        discount_value: number;
        min_purchase_cents: number;
        max_discount_cents: number;
        valid_from: Date;
        valid_until: Date;
        usage_count: number;
        usage_limit: number;
        is_active: boolean;
      }>(
        `SELECT * FROM marketplace_coupons 
         WHERE code = $1 AND is_active = true`,
        [couponCode]
      );

      const coupon = couponRows[0];

      if (coupon) {
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = new Date(coupon.valid_until);

        if (now >= validFrom && now <= validUntil) {
          if (
            !coupon.usage_limit ||
            coupon.usage_count < coupon.usage_limit
          ) {
            if (subtotalCents >= coupon.min_purchase_cents) {
              if (coupon.discount_type === "percentage") {
                discountCents = Math.floor(
                  (subtotalCents * coupon.discount_value) / 100
                );
                if (
                  coupon.max_discount_cents &&
                  discountCents > coupon.max_discount_cents
                ) {
                  discountCents = coupon.max_discount_cents;
                }
              } else if (coupon.discount_type === "fixed") {
                discountCents = coupon.discount_value;
              }

              couponDetails = {
                id: coupon.id,
                code: coupon.code,
                discountType: coupon.discount_type,
                discountValue: coupon.discount_value,
                discountCents,
              };
            }
          }
        }
      }
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);

    if (totalCents === 0) {
      return json(
        { error: "Order total cannot be zero" },
        { status: 400 }
      );
    }

    // Create order in database
    const orderId = crypto.randomUUID();

    await db.query(
      `INSERT INTO marketplace_orders 
       (id, buyer_id, status, subtotal_cents, discount_cents, total_cents, coupon_code, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        orderId,
        userId,
        "pending",
        subtotalCents,
        discountCents,
        totalCents,
        couponCode || null,
        JSON.stringify({ items: orderItems }),
      ]
    );

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amountCents: totalCents,
      currency: "INR",
      receipt: orderId,
      notes: {
        order_id: orderId,
        buyer_id: userId,
        items_count: items.length.toString(),
      },
    });

    // Update order with Razorpay order ID
    await db.query(
      `UPDATE marketplace_orders 
       SET razorpay_order_id = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [razorpayOrder.id, "payment_required", orderId]
    );

    // Increment coupon usage if applied
    if (couponDetails) {
      await db.query(
        `UPDATE marketplace_coupons 
         SET usage_count = usage_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [couponDetails.id]
      );
    }

    return json({
      success: true,
      order: {
        id: orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        subtotalCents,
        discountCents,
        totalCents,
        coupon: couponDetails,
        items: orderItems,
      },
    });
  } catch (error) {
    console.error("❌ Order creation failed:", error);
    return json(
      {
        error: "Failed to create order",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}