import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { requireUser } from "~/lib/auth.server";

// ============================================================================
// ADMIN AUTHORIZATION (Placeholder - implement proper RBAC)
// ============================================================================

async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if ((user as any)?.email !== "youhaveme064@gmail.com") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createFeeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  feeType: z.enum(['percentage', 'fixed', 'tiered']),
  feeValue: z.number().positive(),
  appliesTo: z.enum(['all', 'category', 'seller']).default('all'),
  targetId: z.string().uuid().optional(),
  minAmountCents: z.number().int().nonnegative().optional(),
  maxAmountCents: z.number().int().positive().optional(),
  priority: z.number().int().default(0),
});

const updateFeeSchema = z.object({
  feeId: z.string().uuid(),
  isActive: z.boolean().optional(),
  feeValue: z.number().positive().optional(),
  priority: z.number().int().optional(),
});

const calculateFeesSchema = z.object({
  amountCents: z.number().int().positive(),
  sellerId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

// ============================================================================
// LOADER - GET PLATFORM FEES
// ============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Calculate fees for a transaction (preview)
  if (action === "calculate") {
    const amountCents = url.searchParams.get("amountCents");
    const sellerId = url.searchParams.get("sellerId");
    const categoryId = url.searchParams.get("categoryId");

    if (!amountCents || !sellerId || !categoryId) {
      return json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
      const data = calculateFeesSchema.parse({
        amountCents: parseInt(amountCents),
        sellerId,
        categoryId,
      });

      const result = await marketplaceRepository.calculatePlatformFees(data);

      return json({
        amountCents: data.amountCents,
        totalFeeCents: result.totalFeeCents,
        sellerReceivesCents: data.amountCents - result.totalFeeCents,
        feeBreakdown: result.feeBreakdown,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
      }
      throw error;
    }
  }

  // Get all platform fees
  const fees = await marketplaceRepository.getPlatformFees();

  return json({
    fees: fees.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      feeType: f.fee_type,
      feeValue: parseFloat(f.fee_value),
      appliesTo: f.applies_to,
      targetId: f.target_id,
      minAmountCents: f.min_amount_cents,
      maxAmountCents: f.max_amount_cents,
      isActive: f.is_active,
      priority: f.priority,
      createdAt: f.created_at,
    })),
  });
}

// ============================================================================
// ACTION - CREATE OR UPDATE PLATFORM FEE
// ============================================================================

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const method = request.method;

  // CREATE PLATFORM FEE
  if (method === "POST") {
    try {
      const body = await request.json();
      const data = createFeeSchema.parse(body);

      // Validate fee value based on type
      if (data.feeType === 'percentage' && (data.feeValue < 0 || data.feeValue > 100)) {
        return json({ error: "Percentage fee must be between 0 and 100" }, { status: 400 });
      }

      // Validate target ID requirement
      if (data.appliesTo !== 'all' && !data.targetId) {
        return json({ error: "targetId required when appliesTo is not 'all'" }, { status: 400 });
      }

      const fee = await marketplaceRepository.createPlatformFee({
        name: data.name,
        description: data.description,
        feeType: data.feeType,
        feeValue: data.feeValue,
        appliesTo: data.appliesTo,
        targetId: data.targetId,
        minAmountCents: data.minAmountCents,
        maxAmountCents: data.maxAmountCents,
        priority: data.priority,
      });

      return json({
        success: true,
        fee: {
          id: fee.id,
          name: fee.name,
          feeType: fee.fee_type,
          feeValue: parseFloat(fee.fee_value),
          createdAt: fee.created_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid fee data", details: error.errors }, { status: 400 });
      }
      console.error("Error creating platform fee:", error);
      return json({ error: "Failed to create platform fee" }, { status: 500 });
    }
  }

  // UPDATE PLATFORM FEE
  if (method === "PATCH") {
    try {
      const body = await request.json();
      const data = updateFeeSchema.parse(body);

      // Validate fee value if provided
      if (data.feeValue !== undefined) {
        // Get fee type to validate value
        const fees = await marketplaceRepository.getPlatformFees();
        const fee = fees.find(f => f.id === data.feeId);
        
        if (!fee) {
          return json({ error: "Fee not found" }, { status: 404 });
        }

        if (fee.fee_type === 'percentage' && (data.feeValue < 0 || data.feeValue > 100)) {
          return json({ error: "Percentage fee must be between 0 and 100" }, { status: 400 });
        }
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.feeValue !== undefined) {
        updates.push(`fee_value = $${paramIndex++}`);
        values.push(data.feeValue);
      }
      if (data.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(data.priority);
      }

      if (updates.length === 0) {
        return json({ error: "No updates provided" }, { status: 400 });
      }

      updates.push(`updated_at = NOW()`);
      values.push(data.feeId);

      await marketplaceRepository['getPool']().query(
        `UPDATE marketplace_platform_fees SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      return json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid update data", details: error.errors }, { status: 400 });
      }
      console.error("Error updating platform fee:", error);
      return json({ error: "Failed to update platform fee" }, { status: 500 });
    }
  }

  // DELETE PLATFORM FEE
  if (method === "DELETE") {
    try {
      const body = await request.json();
      const feeId = body.feeId;

      if (!feeId) {
        return json({ error: "feeId required" }, { status: 400 });
      }

      // Soft delete by setting is_active to false
      await marketplaceRepository['getPool']().query(
        `UPDATE marketplace_platform_fees SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [feeId]
      );

      return json({ success: true });
    } catch (error) {
      console.error("Error deleting platform fee:", error);
      return json({ error: "Failed to delete platform fee" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}