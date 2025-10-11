import { marketplaceRepository } from "./repository";

/**
 * Automated content checks for marketplace listings
 */

export async function runAutomatedChecks(listingId: string): Promise<{
  passed: boolean;
  checks: Array<{ type: string; result: "pass" | "fail" | "warning"; message: string }>;
}> {
  const checks: Array<{ type: string; result: "pass" | "fail" | "warning"; message: string }> = [];

  // 1. Metadata validation
  const listing = await marketplaceRepository.getListingById(listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  if (!listing.title || listing.title.length < 10) {
    checks.push({
      type: "metadata_validation",
      result: "fail",
      message: "Title must be at least 10 characters",
    });
  } else {
    checks.push({
      type: "metadata_validation",
      result: "pass",
      message: "Metadata validation passed",
    });
  }

  // 2. Asset validation
  const assets = await marketplaceRepository.listAssetsForListing(listingId);
  const hasPreview = assets.some((a) => a.kind === "preview");
  const hasDeliverable = assets.some((a) => a.kind === "deliverable");

  if (!hasPreview || !hasDeliverable) {
    checks.push({
      type: "asset_validation",
      result: "fail",
      message: "Listing must have at least one preview and one deliverable",
    });
  } else {
    checks.push({
      type: "asset_validation",
      result: "pass",
      message: "Asset validation passed",
    });
  }

  // 3. License plan validation
  const licensePlans = await marketplaceRepository.listLicensePlans(listingId);
  if (licensePlans.length === 0) {
    checks.push({
      type: "license_validation",
      result: "fail",
      message: "Listing must have at least one license plan",
    });
  } else {
    checks.push({
      type: "license_validation",
      result: "pass",
      message: "License validation passed",
    });
  }

  // 4. Copyright scan (placeholder - integrate with actual service)
  checks.push({
    type: "copyright_scan",
    result: "warning",
    message: "Automated copyright scan not yet implemented",
  });

  // Record all checks
  for (const check of checks) {
    await marketplaceRepository.recordAutomatedCheck({
      listingId,
      checkType: check.type,
      result: check.result,
      score: check.result === "pass" ? 100 : check.result === "warning" ? 50 : 0,
      rawPayload: { message: check.message },
    });
  }

  const passed = checks.every((c) => c.result !== "fail");

  return { passed, checks };
}

export async function autoApproveListing(listingId: string): Promise<boolean> {
  const { passed } = await runAutomatedChecks(listingId);

  if (passed) {
    await marketplaceRepository.updateListing({
      listingId,
      status: "published",
    });

    // Create approval ticket
    const ticket = await marketplaceRepository.createModerationTicket({
      listingId,
    });

    await marketplaceRepository.updateModerationTicket({
      ticketId: ticket.id,
      status: "approved",
      notes: "Auto-approved by automated checks",
    });

    return true;
  }

  return false;
}