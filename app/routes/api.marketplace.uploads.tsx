import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { z } from "zod";
import { requestSignedUpload } from "../lib/marketplace/storage";
import { marketplaceRepository } from "../lib/marketplace/repository";

const uploadRequestSchema = z.object({
  listingId: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["preview", "deliverable"]),
  checksum: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = uploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // Verify listing ownership
  const listing = await marketplaceRepository.getListingById(parsed.data.listingId);
  if (!listing) {
    return json({ error: "Listing not found" }, { status: 404 });
  }

  const seller = await marketplaceRepository.getSellerByUserId(user.userId);
  if (!seller || listing.seller_id !== seller.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Request signed upload URL from Cloudify
    const signedUpload = await requestSignedUpload({
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      checksum: parsed.data.checksum,
      kind: parsed.data.kind,
      listingId: parsed.data.listingId,
    });

    // Record asset in database (pending upload completion)
    const asset = await marketplaceRepository.addListingAsset({
      listingId: parsed.data.listingId,
      kind: parsed.data.kind,
      storageKey: signedUpload.storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
      checksum: parsed.data.checksum,
    });

    return json(
      {
        asset,
        uploadUrl: signedUpload.uploadUrl,
        headers: signedUpload.headers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload request failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Upload request failed" },
      { status: 500 }
    );
  }
}