import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { z } from "zod";
import { marketplaceRepository } from "../lib/marketplace/repository";

const onboardSellerSchema = z.object({
  displayName: z.string().min(3).max(100),
  biography: z.string().max(500).optional(),
  payoutAccount: z
    .object({
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = onboardSellerSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // Check if seller already exists
  const existing = await marketplaceRepository.getSellerByUserId(user.userId);
  if (existing) {
    return json({ error: "Seller profile already exists" }, { status: 409 });
  }

  const seller = await marketplaceRepository.createSeller({
    userId: user.userId,
    displayName: parsed.data.displayName,
    biography: parsed.data.biography,
  });

  // Update payout account if provided
  if (parsed.data.payoutAccount) {
    await marketplaceRepository.updateSellerStatus({
      sellerId: seller.id,
      status: "pending", // Admin approval required
    });
  }

  return json({ seller }, { status: 201 });
}