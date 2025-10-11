import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { requireUser } from "~/lib/auth.server";

// ============================================================================
// ADMIN AUTHORIZATION (Placeholder - implement proper RBAC)
// ============================================================================

async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  // TODO: Implement proper admin role check
  return user;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const awardBadgeSchema = z.object({
  sellerId: z.string().uuid(),
  badgeType: z.enum(['verified', 'top_seller', 'fast_responder', 'quality_assured', 'new_seller', 'exclusive']),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const revokeBadgeSchema = z.object({
  sellerId: z.string().uuid(),
  badgeType: z.string(),
});

// ============================================================================
// LOADER - GET SELLER BADGES
// ============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId");

  if (!sellerId) {
    return json({ error: "sellerId parameter required" }, { status: 400 });
  }

  const badges = await marketplaceRepository.getSellerBadges(sellerId);

  return json({
    badges: badges.map(b => ({
      id: b.id,
      sellerId: b.seller_id,
      badgeType: b.badge_type,
      awardedAt: b.awarded_at,
      expiresAt: b.expires_at,
      metadata: b.metadata,
    })),
  });
}

// ============================================================================
// ACTION - AWARD OR REVOKE BADGE (Admin only)
// ============================================================================

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const method = request.method;

  // AWARD BADGE
  if (method === "POST") {
    try {
      const body = await request.json();
      const data = awardBadgeSchema.parse(body);

      // Verify seller exists
      const { rows: sellerRows } = await marketplaceRepository['getPool']().query(
        `SELECT id FROM marketplace_sellers WHERE id = $1`,
        [data.sellerId]
      );

      if (sellerRows.length === 0) {
        return json({ error: "Seller not found" }, { status: 404 });
      }

      const badge = await marketplaceRepository.awardBadge({
        sellerId: data.sellerId,
        badgeType: data.badgeType,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        metadata: data.metadata,
      });

      return json({
        success: true,
        badge: {
          id: badge.id,
          badgeType: badge.badge_type,
          awardedAt: badge.awarded_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid badge data", details: error.errors }, { status: 400 });
      }
      console.error("Error awarding badge:", error);
      return json({ error: "Failed to award badge" }, { status: 500 });
    }
  }

  // REVOKE BADGE
  if (method === "DELETE") {
    try {
      const body = await request.json();
      const data = revokeBadgeSchema.parse(body);

      await marketplaceRepository.revokeBadge(data.sellerId, data.badgeType);

      return json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid data", details: error.errors }, { status: 400 });
      }
      console.error("Error revoking badge:", error);
      return json({ error: "Failed to revoke badge" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}