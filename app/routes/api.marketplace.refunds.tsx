import { json, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { db } from "~/lib/db.server";

/**
 * POST /api/marketplace/refunds
 * 
 * Request a refund for a purchase (buyer)
 * This creates a dispute with type 'refund_request'
 */
const RequestRefundSchema = z.object({
  purchaseId: z.string().uuid(),
  reason: z.string().min(20).max(1000),
  details: z.string().optional(),
});

/**
 * PATCH /api/marketplace/refunds
 * 
 * Process a refund (admin only)
 */
const ProcessRefundSchema = z.object({
  disputeId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().optional(),
  refundAmountCents: z.number().int().min(0).optional(),
});

// Placeholder for admin check
async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  // TODO: Check if user has admin role
  return user;
}

export async function action({ request }: ActionFunctionArgs) {
  const repo = new marketplaceRepository();

  try {
    if (request.method === "POST") {
      // Buyer requests refund
      const user = await requireUser(request);
      const body = await request.json();
      const data = RequestRefundSchema.parse(body);

      // Get purchase and verify ownership
      const purchase = await repo.getPurchaseById(data.purchaseId);
      
      if (!purchase) {
        return json({ error: "Purchase not found" }, { status: 404 });
      }

      if (purchase.buyer_id !== user.userId) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Check if refund already requested
      const existingDisputes = await repo.getDisputesByPurchaseId(data.purchaseId);
      const hasRefundRequest = existingDisputes.some(
        d => d.dispute_type === 'refund_request' && d.status !== 'resolved'
      );

      if (hasRefundRequest) {
        return json(
          { error: "Refund already requested for this purchase" },
          { status: 400 }
        );
      }

      // Create dispute for refund request
      const dispute = await repo.createDispute({
        purchase_id: data.purchaseId,
        raised_by_user_id: user.userId,
        dispute_type: 'refund_request',
        description: data.reason,
        details: data.details ? { details: data.details } : null,
      });

      return json({ dispute });
    }

    if (request.method === "PATCH") {
      // Admin processes refund
      await requireAdmin(request);
      const body = await request.json();
      const data = ProcessRefundSchema.parse(body);

      // Get dispute
      const dispute = await repo.getDisputeById(data.disputeId);
      
      if (!dispute) {
        return json({ error: "Dispute not found" }, { status: 404 });
      }

      if (dispute.dispute_type !== 'refund_request') {
        return json(
          { error: "This dispute is not a refund request" },
          { status: 400 }
        );
      }

      if (data.action === 'approve') {
        // Get purchase details
        const purchase = await repo.getPurchaseById(dispute.purchase_id);
        
        if (!purchase) {
          return json({ error: "Purchase not found" }, { status: 404 });
        }

        const refundAmount = data.refundAmountCents ?? purchase.price_paid_cents;

        // Create refund transaction
        const transaction = await repo.createTransaction({
          order_id: purchase.order_id,
          transaction_type: 'refund',
          amount_cents: refundAmount,
          status: 'completed',
          payment_method: 'razorpay',
          metadata: {
            dispute_id: dispute.id,
            original_purchase_id: purchase.id,
            admin_notes: data.adminNotes,
          },
        });

        // Update purchase status
        await db.query(
          `UPDATE marketplace_purchases 
           SET metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{refunded}',
             'true'::jsonb
           )
           WHERE id = $1`,
          [purchase.id]
        );

        // Resolve dispute
        await repo.updateDispute(dispute.id, {
          status: 'resolved',
          resolution: 'Refund approved and processed',
          resolved_at: new Date(),
        });

        // TODO: Trigger Razorpay refund API call here
        // await razorpayService.createRefund(purchase.payment_id, refundAmount);

        return json({
          success: true,
          transaction,
          message: 'Refund processed successfully',
        });
      } else {
        // Reject refund
        await repo.updateDispute(dispute.id, {
          status: 'resolved',
          resolution: data.adminNotes || 'Refund request rejected',
          resolved_at: new Date(),
        });

        return json({
          success: true,
          message: 'Refund request rejected',
        });
      }
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    console.error("Error processing refund:", error);
    return json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}