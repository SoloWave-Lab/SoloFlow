import { json, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

// Placeholder for admin check - replace with actual RBAC
async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if ((user as any)?.email !== "youhaveme064@gmail.com") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

const BulkActionSchema = z.object({
  action: z.enum([
    "approve_listings",
    "reject_listings",
    "suspend_listings",
    "delete_listings",
    "suspend_sellers",
    "activate_sellers",
    "feature_listings",
    "unfeature_listings",
  ]),
  targetIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/marketplace/admin/bulk-actions
 * Perform bulk administrative actions
 * 
 * Body:
 * - action: string - Action to perform
 * - targetIds: string[] - IDs of items to act upon (max 100)
 * - reason: string - Optional reason for the action
 * - metadata: object - Additional action-specific data
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  await requireAdmin(request);

  try {
    const body = await request.json();
    const { action, targetIds, reason, metadata } = BulkActionSchema.parse(body);

    let results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    switch (action) {
      case "approve_listings":
        results = await bulkApproveListings(targetIds);
        break;

      case "reject_listings":
        if (!reason) {
          return json({ error: "Reason is required for rejecting listings" }, { status: 400 });
        }
        results = await bulkRejectListings(targetIds, reason);
        break;

      case "suspend_listings":
        if (!reason) {
          return json({ error: "Reason is required for suspending listings" }, { status: 400 });
        }
        results = await bulkSuspendListings(targetIds, reason);
        break;

      case "delete_listings":
        results = await bulkDeleteListings(targetIds);
        break;

      case "suspend_sellers":
        if (!reason) {
          return json({ error: "Reason is required for suspending sellers" }, { status: 400 });
        }
        results = await bulkSuspendSellers(targetIds, reason);
        break;

      case "activate_sellers":
        results = await bulkActivateSellers(targetIds);
        break;

      case "feature_listings":
        results = await bulkFeatureListings(targetIds, metadata);
        break;

      case "unfeature_listings":
        results = await bulkUnfeatureListings(targetIds);
        break;

      default:
        return json({ error: "Unknown action" }, { status: 400 });
    }

    return json({
      success: true,
      action,
      results,
      message: `Bulk action completed: ${results.success} succeeded, ${results.failed} failed`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Bulk action failed:", error);
    return json({ error: "Failed to perform bulk action" }, { status: 500 });
  }
}

// Helper functions for bulk operations

async function bulkApproveListings(listingIds: string[]) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      await marketplaceRepository.updateListingStatus({
        listingId,
        status: "published",
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to approve ${listingId}: ${error}`);
    }
  }

  return results;
}

async function bulkRejectListings(listingIds: string[], reason: string) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      await marketplaceRepository.updateListingStatus({
        listingId,
        status: "rejected",
      });
      // TODO: Create notification for seller with rejection reason
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to reject ${listingId}: ${error}`);
    }
  }

  return results;
}

async function bulkSuspendListings(listingIds: string[], reason: string) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      await marketplaceRepository.updateListingStatus({
        listingId,
        status: "suspended",
      });
      // TODO: Create notification for seller with suspension reason
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to suspend ${listingId}: ${error}`);
    }
  }

  return results;
}

async function bulkDeleteListings(listingIds: string[]) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      // Only allow deletion of draft listings
      const listing = await marketplaceRepository.getListingById(listingId);
      if (listing && listing.status === "draft") {
        await marketplaceRepository.deleteListing(listingId);
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Cannot delete ${listingId}: not a draft`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to delete ${listingId}: ${error}`);
    }
  }

  return results;
}

async function bulkSuspendSellers(sellerIds: string[], reason: string) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const sellerId of sellerIds) {
    try {
      await marketplaceRepository.updateSellerStatus({
        sellerId,
        status: "suspended",
      });
      // TODO: Create notification for seller with suspension reason
      // TODO: Also suspend all their active listings
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to suspend seller ${sellerId}: ${error}`);
    }
  }

  return results;
}

async function bulkActivateSellers(sellerIds: string[]) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const sellerId of sellerIds) {
    try {
      await marketplaceRepository.updateSellerStatus({
        sellerId,
        status: "active",
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to activate seller ${sellerId}: ${error}`);
    }
  }

  return results;
}

async function bulkFeatureListings(listingIds: string[], metadata?: Record<string, any>) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      await marketplaceRepository.featureListing({
        listingId,
        featured: true,
        featuredUntil: metadata?.featuredUntil,
        featuredPosition: metadata?.featuredPosition,
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to feature ${listingId}: ${error}`);
    }
  }

  return results;
}

async function bulkUnfeatureListings(listingIds: string[]) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const listingId of listingIds) {
    try {
      await marketplaceRepository.featureListing({
        listingId,
        featured: false,
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to unfeature ${listingId}: ${error}`);
    }
  }

  return results;
}