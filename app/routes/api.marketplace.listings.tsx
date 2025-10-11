import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { z } from "zod";

const createListingSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  summary: z.string().max(280).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const category = url.searchParams.get("categoryId") ?? undefined;
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  const listings = await marketplaceRepository.listPublishedListings({
    search,
    categoryId: category,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });

  return json({ listings });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const payload = await request.json();
  const parsed = createListingSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const seller = await marketplaceRepository.getSellerByUserId(user.userId);
  if (!seller || seller.status !== "active") {
    return json({ error: "Seller profile not active" }, { status: 403 });
  }

  const listing = await marketplaceRepository.createListing({
    sellerId: seller.id,
    categoryId: parsed.data.categoryId,
    slug: parsed.data.slug,
    title: parsed.data.title,
    summary: parsed.data.summary,
    description: parsed.data.description,
    priceCents: parsed.data.priceCents,
    currency: parsed.data.currency,
    metadata: parsed.data.metadata,
  });

  return json({ listing }, { status: 201 });
}