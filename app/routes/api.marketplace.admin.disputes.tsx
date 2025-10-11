import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { z } from "zod";

async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if ((user as any)?.email !== "youhaveme064@gmail.com") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const disputes = await marketplaceRepository.listOpenDisputes();

  // Enrich with purchase and listing details
  const enriched = await Promise.all(
    disputes.map(async (dispute) => {
      const purchase = await marketplaceRepository.getPurchaseByOrderId(dispute.purchase_id);
      const listing = purchase
        ? await marketplaceRepository.getListingById(purchase.listing_id)
        : null;
      return {
        ...dispute,
        purchase,
        listing,
      };
    })
  );

  return json({ disputes: enriched });
}

const resolveDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  status: z.enum(["investigating", "resolved", "closed"]),
  resolution: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  const body = await request.json();
  const parsed = resolveDisputeSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  await marketplaceRepository.updateDispute({
    disputeId: parsed.data.disputeId,
    status: parsed.data.status,
    resolution: parsed.data.resolution,
    resolvedBy: admin.id,
  });

  return json({ success: true }, { status: 200 });
}