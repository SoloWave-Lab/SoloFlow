import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const { id: listingId } = params;

  if (!listingId) {
    return json({ error: "Listing ID required" }, { status: 400 });
  }

  const listing = await marketplaceRepository.getListingById(listingId);
  if (!listing) {
    return json({ error: "Listing not found" }, { status: 404 });
  }

  // Verify ownership
  const seller = await marketplaceRepository.getSellerByUserId(user.userId);
  if (!seller || listing.seller_id !== seller.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  // Validate listing has required assets
  const assets = await marketplaceRepository.listAssetsForListing(listingId);
  const hasPreview = assets.some((a) => a.kind === "preview");
  const hasDeliverable = assets.some((a) => a.kind === "deliverable");

  if (!hasPreview || !hasDeliverable) {
    return json(
      { error: "Listing must have at least one preview and one deliverable asset" },
      { status: 400 }
    );
  }

  // Validate listing has at least one license plan
  const licensePlans = await marketplaceRepository.listLicensePlans(listingId);
  if (licensePlans.length === 0) {
    return json({ error: "Listing must have at least one license plan" }, { status: 400 });
  }

  // Run automated checks
  await marketplaceRepository.recordAutomatedCheck({
    listingId,
    checkType: "metadata_validation",
    result: "pass",
    score: 100,
  });

  // Create moderation ticket
  const ticket = await marketplaceRepository.createModerationTicket({
    listingId,
  });

  // Update listing status
  await marketplaceRepository.updateListing({
    listingId,
    status: "pending_review",
  });

  return json({ success: true, ticket }, { status: 200 });
}