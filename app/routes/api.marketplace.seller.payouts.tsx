import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/seller/payouts
 * Get seller's payout history and available balance
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  try {
    // Get seller profile
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    // Get payout history
    const payouts = await marketplaceRepository.getPayoutsBySellerId(seller.id);

    // Get available balance (total sales minus already paid out)
    const balance = await marketplaceRepository.getSellerBalance(seller.id);

    // Get pending transactions (completed orders not yet paid out)
    const pendingTransactions = await marketplaceRepository.getPendingPayoutTransactions(seller.id);

    return json({
      seller: {
        id: seller.id,
        displayName: seller.display_name,
        payoutAccount: seller.payout_account,
      },
      balance: {
        availableCents: balance.availableCents,
        pendingCents: balance.pendingCents,
        totalEarnedCents: balance.totalEarnedCents,
        totalPaidOutCents: balance.totalPaidOutCents,
        currency: "INR",
      },
      payouts,
      pendingTransactions,
    });
  } catch (error) {
    console.error("Failed to fetch payout data:", error);
    return json({ error: "Failed to fetch payout data" }, { status: 500 });
  }
}

const RequestPayoutSchema = z.object({
  amountCents: z.number().int().positive(),
  payoutMethod: z.enum(["bank_transfer", "upi"]),
  payoutDetails: z.record(z.string()),
});

/**
 * POST /api/marketplace/seller/payouts
 * Request a payout
 * 
 * Body:
 * - amountCents: number - Amount to withdraw
 * - payoutMethod: "bank_transfer" | "upi"
 * - payoutDetails: object - Bank account or UPI details
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await requireUser(request);

  try {
    const body = await request.json();
    const { amountCents, payoutMethod, payoutDetails } = RequestPayoutSchema.parse(body);

    // Get seller profile
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    // Check if seller is active
    if (seller.status !== "active") {
      return json({ 
        error: "Seller account must be active to request payouts" 
      }, { status: 403 });
    }

    // Get available balance
    const balance = await marketplaceRepository.getSellerBalance(seller.id);

    // Validate amount
    if (amountCents > balance.availableCents) {
      return json({ 
        error: "Insufficient balance",
        availableCents: balance.availableCents,
      }, { status: 400 });
    }

    // Minimum payout amount (e.g., ₹500)
    const MIN_PAYOUT_CENTS = 50000;
    if (amountCents < MIN_PAYOUT_CENTS) {
      return json({ 
        error: `Minimum payout amount is ₹${MIN_PAYOUT_CENTS / 100}`,
        minimumCents: MIN_PAYOUT_CENTS,
      }, { status: 400 });
    }

    // Create payout request
    const payout = await marketplaceRepository.createPayout({
      sellerId: seller.id,
      amountCents,
      payoutMethod,
      payoutDetails,
    });

    // TODO: Integrate with payment gateway for actual payout processing
    // For now, payout is created with status 'pending'

    return json({
      success: true,
      payout,
      message: "Payout request submitted successfully",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Failed to request payout:", error);
    return json({ error: "Failed to process payout request" }, { status: 500 });
  }
}