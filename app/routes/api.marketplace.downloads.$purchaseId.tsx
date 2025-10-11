import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { generateDownloadLink } from "../lib/marketplace/service";
import { z } from "zod";

const downloadRequestSchema = z.object({
  assetId: z.string().uuid(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const { purchaseId } = params;

  if (!purchaseId) {
    return json({ error: "Purchase ID required" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = downloadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // Verify purchase belongs to user
  const purchase = await marketplaceRepository.getPurchaseByOrderId(purchaseId);
  if (!purchase || purchase.buyer_id !== user.userId) {
    return json({ error: "Purchase not found or unauthorized" }, { status: 404 });
  }

  // Check if license is still valid
  if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
    return json({ error: "License has expired" }, { status: 403 });
  }

  // Verify asset belongs to listing
  const assets = await marketplaceRepository.listAssetsForListing(purchase.listing_id);
  const asset = assets.find((a) => a.id === parsed.data.assetId && a.kind === "deliverable");

  if (!asset) {
    return json({ error: "Asset not found or not deliverable" }, { status: 404 });
  }

  try {
    const download = await generateDownloadLink({
      purchaseId: purchase.id,
      assetId: asset.id,
    });

    await marketplaceRepository.logLicenseAction({
      purchaseId: purchase.id,
      action: "download_requested",
      details: { assetId: asset.id, downloadId: download.id },
      performedBy: user.userId,
    });

    return json({ download }, { status: 200 });
  } catch (error) {
    console.error("Download link generation failed", error);
    return json({ error: "Failed to generate download link" }, { status: 500 });
  }
}