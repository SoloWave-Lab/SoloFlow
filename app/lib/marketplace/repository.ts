import crypto from "crypto";
import { Pool } from "pg";
import { db } from "../db.server";
import type {
  MarketplaceAssetKind,
  MarketplaceAssetRecord,
  MarketplaceCategoryRecord,
  MarketplaceLicensePlanRecord,
  MarketplaceListingRecord,
  MarketplaceOrderRecord,
  MarketplacePurchaseRecord,
  MarketplaceSellerRecord,
  MarketplaceTransactionRecord,
  MarketplaceListingStatus,
  MarketplaceOrderStatus,
  MarketplaceDownloadRecord,
  MarketplaceLicenseAuditRecord,
  MarketplaceModerationTicketRecord,
  MarketplaceAutomatedCheckRecord,
  MarketplaceReviewRecord,
  MarketplaceDisputeRecord,
  MarketplaceSellerAnalyticsRecord,
} from "./db.types";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const rawDbUrl = process.env.DATABASE_URL || "";
    let connectionString = rawDbUrl;
    try {
      const u = new URL(rawDbUrl);
      u.search = "";
      connectionString = u.toString();
    } catch {
      throw new Error("Invalid database URL");
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("supabase.co")
        ? { rejectUnauthorized: false }
        : process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function withClient<T>(callback: (client: Pool) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export const marketplaceRepository = {
  // Categories -----------------------------------------------------------------
  async listCategories(): Promise<MarketplaceCategoryRecord[]> {
    const { rows } = await db.query<MarketplaceCategoryRecord>(
      `select * from marketplace_categories order by name asc`
    );
    return rows;
  },

  // Sellers --------------------------------------------------------------------
  async getSellerByUserId(userId: string): Promise<MarketplaceSellerRecord | null> {
    const { rows } = await db.query<MarketplaceSellerRecord>(
      `select * from marketplace_sellers where user_id = $1`,
      [userId]
    );
    return rows[0] ?? null;
  },

  async createSeller(params: {
    userId: string;
    displayName: string;
    biography?: string | null;
  }): Promise<MarketplaceSellerRecord> {
    const { rows } = await db.query<MarketplaceSellerRecord>(
      `insert into marketplace_sellers (id, user_id, display_name, biography)
       values ($1, $2, $3, $4)
       returning *`,
      [crypto.randomUUID(), params.userId, params.displayName, params.biography ?? null]
    );
    return rows[0];
  },

  async updateSellerStatus(params: {
    sellerId: string;
    status: MarketplaceSellerRecord["status"];
  }): Promise<void> {
    await db.query(`update marketplace_sellers set status = $1 where id = $2`, [
      params.status,
      params.sellerId,
    ]);
  },

  // Listings -------------------------------------------------------------------
  async createListing(params: {
    sellerId: string;
    categoryId: string;
    slug: string;
    title: string;
    summary?: string | null;
    description?: string | null;
    priceCents: number;
    currency?: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceListingRecord> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `insert into marketplace_listings
         (id, seller_id, category_id, slug, title, summary, description, price_cents, currency, metadata)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.categoryId,
        params.slug,
        params.title,
        params.summary ?? null,
        params.description ?? null,
        params.priceCents,
        params.currency ?? "INR",
        params.metadata ?? null,
      ]
    );
    return rows[0];
  },

  async updateListing(params: {
    listingId: string;
    title?: string;
    summary?: string | null;
    description?: string | null;
    priceCents?: number;
    status?: MarketplaceListingStatus;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceListingRecord | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (params.title !== undefined) {
      fields.push(`title = $${fields.length + 1}`);
      values.push(params.title);
    }
    if (params.summary !== undefined) {
      fields.push(`summary = $${fields.length + 1}`);
      values.push(params.summary);
    }
    if (params.description !== undefined) {
      fields.push(`description = $${fields.length + 1}`);
      values.push(params.description);
    }
    if (params.priceCents !== undefined) {
      fields.push(`price_cents = $${fields.length + 1}`);
      values.push(params.priceCents);
    }
    if (params.status !== undefined) {
      fields.push(`status = $${fields.length + 1}`);
      values.push(params.status);
    }
    if (params.metadata !== undefined) {
      fields.push(`metadata = $${fields.length + 1}`);
      values.push(params.metadata);
    }

    if (!fields.length) {
      return this.getListingById(params.listingId);
    }

    values.push(params.listingId);

    const query = `update marketplace_listings
      set ${fields.join(", ")}
      where id = $${fields.length + 1}
      returning *`;

    const { rows } = await db.query<MarketplaceListingRecord>(query, values);
    return rows[0] ?? null;
  },

  async getListingById(listingId: string): Promise<MarketplaceListingRecord | null> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `select * from marketplace_listings where id = $1`,
      [listingId]
    );
    return rows[0] ?? null;
  },

  async getListingBySlug(slug: string): Promise<MarketplaceListingRecord | null> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `select * from marketplace_listings where slug = $1`,
      [slug]
    );
    return rows[0] ?? null;
  },

  async listListingsForSeller(sellerId: string): Promise<MarketplaceListingRecord[]> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `select * from marketplace_listings where seller_id = $1 order by created_at desc`,
      [sellerId]
    );
    return rows;
  },

  async listPublishedListings(params: {
    search?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceListingRecord[]> {
    const conditions: string[] = [`status = 'published'`];
    const values: unknown[] = [];

    if (params.categoryId) {
      conditions.push(`category_id = $${values.length + 1}`);
      values.push(params.categoryId);
    }

    if (params.search) {
      conditions.push(`(
        title ILIKE $${values.length + 1}
        OR summary ILIKE $${values.length + 1}
        OR coalesce(metadata ->> 'keywords', '') ILIKE $${values.length + 1}
      )`);
      values.push(`%${params.search}%`);
    }

    const limit = params.limit ?? 24;
    const offset = params.offset ?? 0;

    const query = `select *
      from marketplace_listings
      where ${conditions.join(" and ")}
      order by created_at desc
      limit ${limit}
      offset ${offset}`;

    const { rows } = await db.query<MarketplaceListingRecord>(query, values);
    return rows;
  },

  // License Plans --------------------------------------------------------------
  async createLicensePlan(params: {
    listingId: string;
    name: string;
    description?: string | null;
    priceCents: number;
    maxDownloads?: number | null;
    licenseTerms: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceLicensePlanRecord> {
    const { rows } = await db.query<MarketplaceLicensePlanRecord>(
      `insert into marketplace_license_plans
         (id, listing_id, name, description, price_cents, max_downloads, license_terms, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        crypto.randomUUID(),
        params.listingId,
        params.name,
        params.description ?? null,
        params.priceCents,
        params.maxDownloads ?? null,
        params.licenseTerms,
        params.metadata ?? null,
      ]
    );
    return rows[0];
  },

  async listLicensePlans(listingId: string): Promise<MarketplaceLicensePlanRecord[]> {
    const { rows } = await db.query<MarketplaceLicensePlanRecord>(
      `select * from marketplace_license_plans where listing_id = $1 order by price_cents asc`,
      [listingId]
    );
    return rows;
  },

  // Assets --------------------------------------------------------------------
  async addListingAsset(params: {
    listingId: string;
    kind: MarketplaceAssetKind;
    storageKey: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    checksum?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceAssetRecord> {
    const { rows } = await db.query<MarketplaceAssetRecord>(
      `insert into marketplace_assets
         (id, listing_id, kind, storage_key, file_name, mime_type, size_bytes, checksum, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        crypto.randomUUID(),
        params.listingId,
        params.kind,
        params.storageKey,
        params.fileName,
        params.mimeType ?? null,
        params.sizeBytes ?? null,
        params.checksum ?? null,
        params.metadata ?? null,
      ]
    );
    return rows[0];
  },

  async listAssetsForListing(listingId: string): Promise<MarketplaceAssetRecord[]> {
    const { rows } = await db.query<MarketplaceAssetRecord>(
      `select * from marketplace_assets where listing_id = $1 order by created_at asc`,
      [listingId]
    );
    return rows;
  },

  // Orders & Transactions -----------------------------------------------------
  async createOrder(params: {
    buyerId: string;
    listingId: string;
    licensePlanId: string;
    subtotalCents: number;
    feesCents?: number;
    taxesCents?: number;
    totalCents: number;
    currency?: string;
    razorpayOrderId?: string | null;
  }): Promise<MarketplaceOrderRecord> {
    const { rows } = await db.query<MarketplaceOrderRecord>(
      `insert into marketplace_orders
         (id, buyer_id, listing_id, license_plan_id, subtotal_cents, fees_cents, taxes_cents, total_cents, currency, razorpay_order_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        crypto.randomUUID(),
        params.buyerId,
        params.listingId,
        params.licensePlanId,
        params.subtotalCents,
        params.feesCents ?? 0,
        params.taxesCents ?? 0,
        params.totalCents,
        params.currency ?? "INR",
        params.razorpayOrderId ?? null,
      ]
    );
    return rows[0];
  },

  async updateOrderStatus(params: {
    orderId: string;
    status: MarketplaceOrderStatus;
    razorpayOrderId?: string | null;
  }): Promise<void> {
    const fields = [`status = $1`];
    const values: unknown[] = [params.status];

    if (params.razorpayOrderId !== undefined) {
      fields.push(`razorpay_order_id = $2`);
      values.push(params.razorpayOrderId);
    }
    values.push(params.orderId);

    await db.query(
      `update marketplace_orders set ${fields.join(", ")}
       where id = $${values.length}`,
      values
    );
  },

  async recordTransaction(params: {
    orderId: string;
    razorpayPaymentId?: string | null;
    razorpaySignature?: string | null;
    status: string;
    amountCents: number;
    paymentMethod?: string | null;
    paymentMetadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceTransactionRecord> {
    const { rows } = await db.query<MarketplaceTransactionRecord>(
      `insert into marketplace_transactions
         (id, order_id, razorpay_payment_id, razorpay_signature, status, amount_cents, payment_method, payment_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        crypto.randomUUID(),
        params.orderId,
        params.razorpayPaymentId ?? null,
        params.razorpaySignature ?? null,
        params.status,
        params.amountCents,
        params.paymentMethod ?? null,
        params.paymentMetadata ?? null,
      ]
    );
    return rows[0];
  },

  async getOrderById(orderId: string): Promise<MarketplaceOrderRecord | null> {
    const { rows } = await db.query<MarketplaceOrderRecord>(
      `SELECT * FROM marketplace_orders WHERE id = $1`,
      [orderId]
    );
    return rows[0] ?? null;
  },

  async getOrdersByBuyerId(
    buyerId: string,
    limit: number = 20,
    status?: MarketplaceOrderStatus
  ): Promise<MarketplaceOrderRecord[]> {
    const statusFilter = status ? `AND status = $2` : '';
    const params = status ? [buyerId, status, limit] : [buyerId, limit];
    const limitParam = status ? '$3' : '$2';

    const { rows } = await db.query<MarketplaceOrderRecord>(
      `SELECT * FROM marketplace_orders 
       WHERE buyer_id = $1 ${statusFilter}
       ORDER BY created_at DESC
       LIMIT ${limitParam}`,
      params
    );
    return rows;
  },

  async getOrdersBySellerId(
    sellerId: string,
    limit: number = 20,
    status?: MarketplaceOrderStatus,
    listingId?: string
  ): Promise<MarketplaceOrderRecord[]> {
    const conditions = ['l.seller_id = $1'];
    const params: any[] = [sellerId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (listingId) {
      conditions.push(`o.listing_id = $${paramIndex}`);
      params.push(listingId);
      paramIndex++;
    }

    params.push(limit);

    const { rows } = await db.query<MarketplaceOrderRecord>(
      `SELECT o.* FROM marketplace_orders o
       JOIN marketplace_listings l ON l.id = o.listing_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );
    return rows;
  },

  async getTransactionsByOrderId(orderId: string): Promise<MarketplaceTransactionRecord[]> {
    const { rows } = await db.query<MarketplaceTransactionRecord>(
      `SELECT * FROM marketplace_transactions WHERE order_id = $1 ORDER BY created_at DESC`,
      [orderId]
    );
    return rows;
  },

  // Purchases & Licensing -----------------------------------------------------
  async grantPurchase(params: {
    orderId: string;
    buyerId: string;
    listingId: string;
    licensePlanId: string;
    licenseKey?: string;
    expiresAt?: Date | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplacePurchaseRecord> {
    const licenseKey = params.licenseKey ?? crypto.randomUUID();
    const { rows } = await db.query<MarketplacePurchaseRecord>(
      `insert into marketplace_purchases
         (id, order_id, buyer_id, listing_id, license_plan_id, license_key, expires_at, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        crypto.randomUUID(),
        params.orderId,
        params.buyerId,
        params.listingId,
        params.licensePlanId,
        licenseKey,
        params.expiresAt ? params.expiresAt.toISOString() : null,
        params.metadata ?? null,
      ]
    );
    return rows[0];
  },

  async getPurchaseByOrderId(orderId: string): Promise<MarketplacePurchaseRecord | null> {
    const { rows } = await db.query<MarketplacePurchaseRecord>(
      `select * from marketplace_purchases where order_id = $1`,
      [orderId]
    );
    return rows[0] ?? null;
  },

  async getPurchasesForBuyer(buyerId: string): Promise<MarketplacePurchaseRecord[]> {
    const { rows } = await db.query<MarketplacePurchaseRecord>(
      `select * from marketplace_purchases where buyer_id = $1 order by licensed_at desc`,
      [buyerId]
    );
    return rows;
  },

  async logLicenseAction(params: {
    purchaseId: string;
    action: string;
    details?: Record<string, unknown> | null;
    performedBy?: string | null;
  }): Promise<MarketplaceLicenseAuditRecord> {
    const { rows } = await db.query<MarketplaceLicenseAuditRecord>(
      `insert into marketplace_license_audit
         (id, purchase_id, action, details, performed_by)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        crypto.randomUUID(),
        params.purchaseId,
        params.action,
        params.details ?? null,
        params.performedBy ?? null,
      ]
    );
    return rows[0];
  },

  // Downloads -----------------------------------------------------------------
  async createDownload(params: {
    purchaseId: string;
    assetId: string;
    downloadUrl: string;
    expiresAt: Date;
  }): Promise<MarketplaceDownloadRecord> {
    const { rows } = await db.query<MarketplaceDownloadRecord>(
      `insert into marketplace_downloads
         (id, purchase_id, asset_id, download_url, expires_at)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        crypto.randomUUID(),
        params.purchaseId,
        params.assetId,
        params.downloadUrl,
        params.expiresAt.toISOString(),
      ]
    );
    return rows[0];
  },

  async touchDownload(downloadId: string): Promise<void> {
    await db.query(
      `update marketplace_downloads
       set last_accessed_at = NOW(),
           download_count = download_count + 1
       where id = $1`,
      [downloadId]
    );
  },

  async cleanupExpiredDownloads(): Promise<number> {
    const { rowCount } = await db.query(
      `delete from marketplace_downloads where expires_at < NOW()`
    );
    return rowCount ?? 0;
  },

  // Moderation ----------------------------------------------------------------
  async createModerationTicket(params: {
    listingId: string;
    assignedAdmin?: string | null;
  }): Promise<MarketplaceModerationTicketRecord> {
    const { rows } = await db.query<MarketplaceModerationTicketRecord>(
      `insert into marketplace_moderation_tickets (id, listing_id, assigned_admin)
       values ($1, $2, $3)
       returning *`,
      [crypto.randomUUID(), params.listingId, params.assignedAdmin ?? null]
    );
    return rows[0];
  },

  async updateModerationTicket(params: {
    ticketId: string;
    status?: MarketplaceModerationTicketRecord["status"];
    assignedAdmin?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (params.status !== undefined) {
      fields.push(`status = $${fields.length + 1}`);
      values.push(params.status);
    }
    if (params.assignedAdmin !== undefined) {
      fields.push(`assigned_admin = $${fields.length + 1}`);
      values.push(params.assignedAdmin);
    }
    if (params.notes !== undefined) {
      fields.push(`notes = $${fields.length + 1}`);
      values.push(params.notes);
    }

    if (params.status === "approved" || params.status === "rejected") {
      fields.push(`actioned_at = NOW()`);
    }

    if (!fields.length) return;

    values.push(params.ticketId);

    await db.query(
      `update marketplace_moderation_tickets
       set ${fields.join(", ")}
       where id = $${fields.length + 1}`,
      values
    );
  },

  async listPendingModerationTickets(): Promise<MarketplaceModerationTicketRecord[]> {
    const { rows } = await db.query<MarketplaceModerationTicketRecord>(
      `select * from marketplace_moderation_tickets
       where status = 'pending'
       order by created_at asc`
    );
    return rows;
  },

  async getModerationTicketByListingId(
    listingId: string
  ): Promise<MarketplaceModerationTicketRecord | null> {
    const { rows } = await db.query<MarketplaceModerationTicketRecord>(
      `select * from marketplace_moderation_tickets
       where listing_id = $1
       order by created_at desc
       limit 1`,
      [listingId]
    );
    return rows[0] ?? null;
  },

  // Automated Checks ----------------------------------------------------------
  async recordAutomatedCheck(params: {
    listingId: string;
    checkType: string;
    result: "pass" | "fail" | "warning";
    score?: number | null;
    rawPayload?: Record<string, unknown> | null;
  }): Promise<MarketplaceAutomatedCheckRecord> {
    const { rows } = await db.query<MarketplaceAutomatedCheckRecord>(
      `insert into marketplace_automated_checks
         (id, listing_id, check_type, result, score, raw_payload)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        crypto.randomUUID(),
        params.listingId,
        params.checkType,
        params.result,
        params.score ?? null,
        params.rawPayload ?? null,
      ]
    );
    return rows[0];
  },

  async listAutomatedChecks(listingId: string): Promise<MarketplaceAutomatedCheckRecord[]> {
    const { rows } = await db.query<MarketplaceAutomatedCheckRecord>(
      `select * from marketplace_automated_checks
       where listing_id = $1
       order by created_at desc`,
      [listingId]
    );
    return rows;
  },

  // Reviews -------------------------------------------------------------------
  async createReview(params: {
    listingId: string;
    buyerId: string;
    purchaseId: string;
    rating: number;
    title?: string | null;
    comment?: string | null;
  }): Promise<MarketplaceReviewRecord> {
    const { rows } = await db.query<MarketplaceReviewRecord>(
      `insert into marketplace_reviews
         (id, listing_id, buyer_id, purchase_id, rating, title, comment)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        crypto.randomUUID(),
        params.listingId,
        params.buyerId,
        params.purchaseId,
        params.rating,
        params.title ?? null,
        params.comment ?? null,
      ]
    );
    return rows[0];
  },

  async listReviewsForListing(listingId: string): Promise<MarketplaceReviewRecord[]> {
    const { rows } = await db.query<MarketplaceReviewRecord>(
      `select * from marketplace_reviews
       where listing_id = $1 and status = 'published'
       order by created_at desc`,
      [listingId]
    );
    return rows;
  },

  // Disputes ------------------------------------------------------------------
  async createDispute(params: {
    purchaseId: string;
    buyerId: string;
    sellerId: string;
    reason: string;
    description?: string | null;
  }): Promise<MarketplaceDisputeRecord> {
    const { rows } = await db.query<MarketplaceDisputeRecord>(
      `insert into marketplace_disputes
         (id, purchase_id, buyer_id, seller_id, reason, description)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        crypto.randomUUID(),
        params.purchaseId,
        params.buyerId,
        params.sellerId,
        params.reason,
        params.description ?? null,
      ]
    );
    return rows[0];
  },

  async updateDispute(params: {
    disputeId: string;
    status?: MarketplaceDisputeRecord["status"];
    resolution?: string | null;
    resolvedBy?: string | null;
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (params.status !== undefined) {
      fields.push(`status = $${fields.length + 1}`);
      values.push(params.status);
    }
    if (params.resolution !== undefined) {
      fields.push(`resolution = $${fields.length + 1}`);
      values.push(params.resolution);
    }
    if (params.resolvedBy !== undefined) {
      fields.push(`resolved_by = $${fields.length + 1}`);
      values.push(params.resolvedBy);
    }

    if (params.status === "resolved" || params.status === "closed") {
      fields.push(`resolved_at = NOW()`);
    }

    if (!fields.length) return;

    values.push(params.disputeId);

    await db.query(
      `update marketplace_disputes
       set ${fields.join(", ")}
       where id = $${fields.length + 1}`,
      values
    );
  },

  async listOpenDisputes(): Promise<MarketplaceDisputeRecord[]> {
    const { rows } = await db.query<MarketplaceDisputeRecord>(
      `select * from marketplace_disputes
       where status IN ('open', 'investigating')
       order by created_at asc`
    );
    return rows;
  },

  // Analytics -----------------------------------------------------------------
  async getSellerAnalytics(params: {
    sellerId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<MarketplaceSellerAnalyticsRecord | null> {
    const { rows } = await db.query<MarketplaceSellerAnalyticsRecord>(
      `select * from marketplace_seller_analytics
       where seller_id = $1 and period_start = $2 and period_end = $3`,
      [params.sellerId, params.periodStart.toISOString(), params.periodEnd.toISOString()]
    );
    return rows[0] ?? null;
  },

  async upsertSellerAnalytics(params: {
    sellerId: string;
    periodStart: Date;
    periodEnd: Date;
    totalSalesCents: number;
    totalOrders: number;
    totalRefundsCents?: number;
    avgRating?: number | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<MarketplaceSellerAnalyticsRecord> {
    const { rows } = await db.query<MarketplaceSellerAnalyticsRecord>(
      `insert into marketplace_seller_analytics
         (id, seller_id, period_start, period_end, total_sales_cents, total_orders, total_refunds_cents, avg_rating, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (seller_id, period_start, period_end)
       do update set
         total_sales_cents = EXCLUDED.total_sales_cents,
         total_orders = EXCLUDED.total_orders,
         total_refunds_cents = EXCLUDED.total_refunds_cents,
         avg_rating = EXCLUDED.avg_rating,
         metadata = EXCLUDED.metadata
       returning *`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.periodStart.toISOString(),
        params.periodEnd.toISOString(),
        params.totalSalesCents,
        params.totalOrders,
        params.totalRefundsCents ?? 0,
        params.avgRating ?? null,
        params.metadata ?? null,
      ]
    );
    return rows[0];
  },

  // ============================================================================
  // Platform Analytics Methods
  // ============================================================================

  async getPlatformAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalSellers: number;
    activeSellers: number;
    totalListings: number;
    publishedListings: number;
    totalOrders: number;
    completedOrders: number;
    totalRevenueCents: number;
    totalPurchases: number;
    avgOrderValueCents: number;
    conversionRate: number;
  }> {
    const dateFilter = startDate && endDate
      ? `WHERE created_at >= $1 AND created_at <= $2`
      : '';
    const dateParams = startDate && endDate ? [startDate.toISOString(), endDate.toISOString()] : [];

    const { rows } = await db.query<{
      total_sellers: string;
      active_sellers: string;
      total_listings: string;
      published_listings: string;
      total_orders: string;
      completed_orders: string;
      total_revenue_cents: string;
      total_purchases: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM marketplace_sellers) as total_sellers,
         (SELECT COUNT(*) FROM marketplace_sellers WHERE status = 'active') as active_sellers,
         (SELECT COUNT(*) FROM marketplace_listings) as total_listings,
         (SELECT COUNT(*) FROM marketplace_listings WHERE status = 'published') as published_listings,
         (SELECT COUNT(*) FROM marketplace_orders ${dateFilter}) as total_orders,
         (SELECT COUNT(*) FROM marketplace_orders WHERE status = 'completed' ${dateFilter}) as completed_orders,
         (SELECT COALESCE(SUM(total_amount_cents), 0) FROM marketplace_orders WHERE status = 'completed' ${dateFilter}) as total_revenue_cents,
         (SELECT COUNT(*) FROM marketplace_purchases ${dateFilter}) as total_purchases`,
      dateParams
    );

    const stats = rows[0];
    const totalOrders = parseInt(stats.total_orders);
    const completedOrders = parseInt(stats.completed_orders);
    const totalRevenueCents = parseInt(stats.total_revenue_cents);

    return {
      totalSellers: parseInt(stats.total_sellers),
      activeSellers: parseInt(stats.active_sellers),
      totalListings: parseInt(stats.total_listings),
      publishedListings: parseInt(stats.published_listings),
      totalOrders,
      completedOrders,
      totalRevenueCents,
      totalPurchases: parseInt(stats.total_purchases),
      avgOrderValueCents: completedOrders > 0 ? Math.round(totalRevenueCents / completedOrders) : 0,
      conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    };
  },

  async getModerationQueueStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    escalated: number;
    avgProcessingTimeHours: number;
  }> {
    const { rows } = await db.query<{
      pending: string;
      approved: string;
      rejected: string;
      escalated: string;
      avg_processing_hours: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
         COUNT(*) FILTER (WHERE status = 'escalated') as escalated,
         AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600) FILTER (WHERE reviewed_at IS NOT NULL) as avg_processing_hours
       FROM marketplace_moderation_tickets`
    );

    const stats = rows[0];
    return {
      pending: parseInt(stats.pending),
      approved: parseInt(stats.approved),
      rejected: parseInt(stats.rejected),
      escalated: parseInt(stats.escalated),
      avgProcessingTimeHours: parseFloat(stats.avg_processing_hours) || 0,
    };
  },

  async getTopSellers(limit: number, startDate?: Date, endDate?: Date): Promise<Array<{
    seller: MarketplaceSellerRecord;
    totalSalesCents: number;
    totalOrders: number;
    avgRating: number;
  }>> {
    const dateFilter = startDate && endDate
      ? `AND o.created_at >= $2 AND o.created_at <= $3`
      : '';
    const params = [limit];
    if (startDate && endDate) {
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    const { rows } = await db.query<{
      seller_data: string;
      total_sales_cents: string;
      total_orders: string;
      avg_rating: string;
    }>(
      `SELECT
         row_to_json(s.*) as seller_data,
         COALESCE(SUM(o.total_amount_cents), 0) as total_sales_cents,
         COUNT(o.id) as total_orders,
         COALESCE(AVG(l.avg_rating), 0) as avg_rating
       FROM marketplace_sellers s
       LEFT JOIN marketplace_listings l ON l.seller_id = s.id
       LEFT JOIN marketplace_orders o ON o.listing_id = l.id AND o.status = 'completed' ${dateFilter}
       WHERE s.status = 'active'
       GROUP BY s.id
       ORDER BY total_sales_cents DESC
       LIMIT $1`,
      params
    );

    return rows.map(row => ({
      seller: JSON.parse(row.seller_data),
      totalSalesCents: parseInt(row.total_sales_cents),
      totalOrders: parseInt(row.total_orders),
      avgRating: parseFloat(row.avg_rating),
    }));
  },

  async getTopListings(limit: number, startDate?: Date, endDate?: Date): Promise<Array<{
    listing: MarketplaceListingRecord;
    totalSalesCents: number;
    totalOrders: number;
    avgRating: number;
  }>> {
    const dateFilter = startDate && endDate
      ? `AND o.created_at >= $2 AND o.created_at <= $3`
      : '';
    const params = [limit];
    if (startDate && endDate) {
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    const { rows } = await db.query<{
      listing_data: string;
      total_sales_cents: string;
      total_orders: string;
      avg_rating: string;
    }>(
      `SELECT
         row_to_json(l.*) as listing_data,
         COALESCE(SUM(o.total_amount_cents), 0) as total_sales_cents,
         COUNT(o.id) as total_orders,
         COALESCE(l.avg_rating, 0) as avg_rating
       FROM marketplace_listings l
       LEFT JOIN marketplace_orders o ON o.listing_id = l.id AND o.status = 'completed' ${dateFilter}
       WHERE l.status = 'published'
       GROUP BY l.id
       ORDER BY total_sales_cents DESC
       LIMIT $1`,
      params
    );

    return rows.map(row => ({
      listing: JSON.parse(row.listing_data),
      totalSalesCents: parseInt(row.total_sales_cents),
      totalOrders: parseInt(row.total_orders),
      avgRating: parseFloat(row.avg_rating),
    }));
  },

  async getCategoryStats(startDate?: Date, endDate?: Date): Promise<Array<{
    category: MarketplaceCategoryRecord;
    totalListings: number;
    totalSalesCents: number;
    totalOrders: number;
  }>> {
    const dateFilter = startDate && endDate
      ? `AND o.created_at >= $2 AND o.created_at <= $3`
      : '';
    const dateParams = startDate && endDate ? [startDate.toISOString(), endDate.toISOString()] : [];

    const { rows } = await db.query<{
      category_data: string;
      total_listings: string;
      total_sales_cents: string;
      total_orders: string;
    }>(
      `SELECT
         row_to_json(c.*) as category_data,
         COUNT(DISTINCT l.id) as total_listings,
         COALESCE(SUM(o.total_amount_cents), 0) as total_sales_cents,
         COUNT(o.id) as total_orders
       FROM marketplace_categories c
       LEFT JOIN marketplace_listings l ON l.category_id = c.id
       LEFT JOIN marketplace_orders o ON o.listing_id = l.id AND o.status = 'completed' ${dateFilter}
       GROUP BY c.id
       ORDER BY total_sales_cents DESC`,
      dateParams
    );

    return rows.map(row => ({
      category: JSON.parse(row.category_data),
      totalListings: parseInt(row.total_listings),
      totalSalesCents: parseInt(row.total_sales_cents),
      totalOrders: parseInt(row.total_orders),
    }));
  },

  async getPurchasesByLicensePlanId(licensePlanId: string): Promise<MarketplacePurchaseRecord[]> {
    const { rows } = await db.query<MarketplacePurchaseRecord>(
      `SELECT * FROM marketplace_purchases WHERE license_plan_id = $1`,
      [licensePlanId]
    );
    return rows;
  },

  // Notifications ---------------------------------------------------------------
  async getNotifications(params: {
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    read: boolean;
    created_at: string;
  }>> {
    const unreadFilter = params.unreadOnly ? `AND read = false` : '';
    const { rows } = await db.query(
      `SELECT * FROM marketplace_notifications
       WHERE user_id = $1 ${unreadFilter}
       ORDER BY created_at DESC
       LIMIT $2`,
      [params.userId, params.limit || 50]
    );
    return rows;
  },

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM marketplace_notifications
       WHERE user_id = $1 AND read = false`,
      [userId]
    );
    return parseInt(rows[0]?.count || '0');
  },

  async markNotificationsRead(params: {
    userId: string;
    notificationIds: string[];
  }): Promise<void> {
    await db.query(
      `UPDATE marketplace_notifications
       SET read = true, read_at = NOW()
       WHERE user_id = $1 AND id = ANY($2)`,
      [params.userId, params.notificationIds]
    );
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.query(
      `UPDATE marketplace_notifications
       SET read = true, read_at = NOW()
       WHERE user_id = $1 AND read = false`,
      [userId]
    );
  },

  // Payouts ---------------------------------------------------------------------
  async getPayoutsBySellerId(sellerId: string): Promise<Array<{
    id: string;
    seller_id: string;
    amount_cents: number;
    status: string;
    payout_method: string;
    payout_details: any;
    processed_at: string | null;
    created_at: string;
  }>> {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_payouts
       WHERE seller_id = $1
       ORDER BY created_at DESC`,
      [sellerId]
    );
    return rows;
  },

  async getSellerBalance(sellerId: string): Promise<{
    availableCents: number;
    pendingCents: number;
    totalEarnedCents: number;
    totalPaidOutCents: number;
  }> {
    const { rows } = await db.query<{
      total_earned: string;
      total_paid_out: string;
      pending: string;
    }>(
      `SELECT
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'sale'), 0) as total_earned,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'completed'), 0) as total_paid_out,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.type = 'sale' AND t.created_at > NOW() - INTERVAL '7 days'), 0) as pending
       FROM marketplace_sellers s
       LEFT JOIN marketplace_listings l ON l.seller_id = s.id
       LEFT JOIN marketplace_transactions t ON t.listing_id = l.id
       LEFT JOIN marketplace_payouts p ON p.seller_id = s.id
       WHERE s.id = $1`,
      [sellerId]
    );

    const data = rows[0];
    const totalEarnedCents = parseInt(data?.total_earned || '0');
    const totalPaidOutCents = parseInt(data?.total_paid_out || '0');
    const pendingCents = parseInt(data?.pending || '0');
    const availableCents = Math.max(0, totalEarnedCents - totalPaidOutCents - pendingCents);

    return {
      availableCents,
      pendingCents,
      totalEarnedCents,
      totalPaidOutCents,
    };
  },

  async getPendingPayoutTransactions(sellerId: string): Promise<Array<{
    id: string;
    order_id: string;
    amount_cents: number;
    created_at: string;
  }>> {
    const { rows } = await db.query(
      `SELECT t.id, t.order_id, t.amount_cents, t.created_at
       FROM marketplace_transactions t
       JOIN marketplace_listings l ON t.listing_id = l.id
       WHERE l.seller_id = $1
         AND t.type = 'sale'
         AND t.created_at > NOW() - INTERVAL '7 days'
       ORDER BY t.created_at DESC`,
      [sellerId]
    );
    return rows;
  },

  async createPayout(params: {
    sellerId: string;
    amountCents: number;
    payoutMethod: string;
    payoutDetails: any;
  }): Promise<{
    id: string;
    seller_id: string;
    amount_cents: number;
    status: string;
    payout_method: string;
    created_at: string;
  }> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_payouts (id, seller_id, amount_cents, status, payout_method, payout_details)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING id, seller_id, amount_cents, status, payout_method, created_at`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.amountCents,
        params.payoutMethod,
        JSON.stringify(params.payoutDetails),
      ]
    );
    return rows[0];
  },

  // Listing Statistics ----------------------------------------------------------
  async getListingStats(params: {
    listingId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{
    viewsCount: number;
    uniqueViewsCount: number;
    salesCount: number;
    revenueCents: number;
    conversionRate: number;
    avgRating: number;
    reviewsCount: number;
    wishlistCount: number;
  }> {
    const { rows } = await db.query<{
      views_count: string;
      unique_views_count: string;
      sales_count: string;
      revenue_cents: string;
      avg_rating: string;
      reviews_count: string;
      wishlist_count: string;
    }>(
      `SELECT
         COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'view') as views_count,
         COUNT(DISTINCT a.user_id) FILTER (WHERE a.type = 'view') as unique_views_count,
         COUNT(DISTINCT p.id) as sales_count,
         COALESCE(SUM(o.total_cents), 0) as revenue_cents,
         COALESCE(AVG(r.rating), 0) as avg_rating,
         COUNT(DISTINCT r.id) as reviews_count,
         COUNT(DISTINCT w.id) as wishlist_count
       FROM marketplace_listings l
       LEFT JOIN marketplace_activity a ON a.listing_id = l.id
         AND a.created_at >= $2 AND a.created_at <= $3
       LEFT JOIN marketplace_purchases p ON p.listing_id = l.id
         AND p.created_at >= $2 AND p.created_at <= $3
       LEFT JOIN marketplace_orders o ON o.listing_id = l.id AND o.status = 'paid'
         AND o.created_at >= $2 AND o.created_at <= $3
       LEFT JOIN marketplace_reviews r ON r.listing_id = l.id
       LEFT JOIN marketplace_wishlist w ON w.listing_id = l.id
       WHERE l.id = $1`,
      [params.listingId, params.startDate.toISOString(), params.endDate.toISOString()]
    );

    const data = rows[0];
    const viewsCount = parseInt(data?.views_count || '0');
    const salesCount = parseInt(data?.sales_count || '0');

    return {
      viewsCount,
      uniqueViewsCount: parseInt(data?.unique_views_count || '0'),
      salesCount,
      revenueCents: parseInt(data?.revenue_cents || '0'),
      conversionRate: viewsCount > 0 ? (salesCount / viewsCount) * 100 : 0,
      avgRating: parseFloat(data?.avg_rating || '0'),
      reviewsCount: parseInt(data?.reviews_count || '0'),
      wishlistCount: parseInt(data?.wishlist_count || '0'),
    };
  },

  async getListingViewsTimeseries(params: {
    listingId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{ date: string; count: number }>> {
    const { rows } = await db.query<{ date: string; count: string }>(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as count
       FROM marketplace_activity
       WHERE listing_id = $1
         AND type = 'view'
         AND created_at >= $2
         AND created_at <= $3
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [params.listingId, params.startDate.toISOString(), params.endDate.toISOString()]
    );
    return rows.map(row => ({ date: row.date, count: parseInt(row.count) }));
  },

  async getListingSalesTimeseries(params: {
    listingId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{ date: string; count: number; revenueCents: number }>> {
    const { rows } = await db.query<{ date: string; count: string; revenue_cents: string }>(
      `SELECT
         DATE(p.created_at) as date,
         COUNT(*) as count,
         COALESCE(SUM(o.total_cents), 0) as revenue_cents
       FROM marketplace_purchases p
       JOIN marketplace_orders o ON o.id = p.order_id
       WHERE p.listing_id = $1
         AND p.created_at >= $2
         AND p.created_at <= $3
       GROUP BY DATE(p.created_at)
       ORDER BY date ASC`,
      [params.listingId, params.startDate.toISOString(), params.endDate.toISOString()]
    );
    return rows.map(row => ({
      date: row.date,
      count: parseInt(row.count),
      revenueCents: parseInt(row.revenue_cents),
    }));
  },

  async getListingTopReferrers(params: {
    listingId: string;
    startDate: Date;
    endDate: Date;
    limit: number;
  }): Promise<Array<{ referrer: string; count: number }>> {
    const { rows } = await db.query<{ referrer: string; count: string }>(
      `SELECT
         metadata->>'referer' as referrer,
         COUNT(*) as count
       FROM marketplace_activity
       WHERE listing_id = $1
         AND type = 'view'
         AND created_at >= $2
         AND created_at <= $3
         AND metadata->>'referer' IS NOT NULL
       GROUP BY metadata->>'referer'
       ORDER BY count DESC
       LIMIT $4`,
      [params.listingId, params.startDate.toISOString(), params.endDate.toISOString(), params.limit]
    );
    return rows.map(row => ({ referrer: row.referrer, count: parseInt(row.count) }));
  },

  async getListingConversionFunnel(params: {
    listingId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{
    views: number;
    clicks: number;
    addToCart: number;
    purchases: number;
  }> {
    const { rows } = await db.query<{
      views: string;
      clicks: string;
      add_to_cart: string;
      purchases: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE type = 'view') as views,
         COUNT(*) FILTER (WHERE type = 'click') as clicks,
         COUNT(*) FILTER (WHERE type = 'add_to_cart') as add_to_cart,
         COUNT(DISTINCT p.id) as purchases
       FROM marketplace_activity a
       LEFT JOIN marketplace_purchases p ON p.listing_id = a.listing_id
         AND p.created_at >= $2 AND p.created_at <= $3
       WHERE a.listing_id = $1
         AND a.created_at >= $2
         AND a.created_at <= $3`,
      [params.listingId, params.startDate.toISOString(), params.endDate.toISOString()]
    );

    const data = rows[0];
    return {
      views: parseInt(data?.views || '0'),
      clicks: parseInt(data?.clicks || '0'),
      addToCart: parseInt(data?.add_to_cart || '0'),
      purchases: parseInt(data?.purchases || '0'),
    };
  },

  // Featured & Trending ---------------------------------------------------------
  async getFeaturedListings(limit: number): Promise<MarketplaceListingRecord[]> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `SELECT l.* FROM marketplace_listings l
       WHERE l.status = 'published'
         AND l.metadata->>'featured' = 'true'
         AND (l.metadata->>'featuredUntil' IS NULL OR (l.metadata->>'featuredUntil')::timestamp > NOW())
       ORDER BY COALESCE((l.metadata->>'featuredPosition')::int, 999), l.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async getTrendingListings(params: {
    limit: number;
    days: number;
  }): Promise<MarketplaceListingRecord[]> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `SELECT l.*, COUNT(p.id) as sales_count
       FROM marketplace_listings l
       JOIN marketplace_purchases p ON p.listing_id = l.id
       WHERE l.status = 'published'
         AND p.created_at >= NOW() - INTERVAL '${params.days} days'
       GROUP BY l.id
       ORDER BY sales_count DESC, l.created_at DESC
       LIMIT $1`,
      [params.limit]
    );
    return rows;
  },

  async getNewListings(limit: number): Promise<MarketplaceListingRecord[]> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `SELECT * FROM marketplace_listings
       WHERE status = 'published'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async getTopRatedListings(params: {
    limit: number;
    minReviews: number;
  }): Promise<MarketplaceListingRecord[]> {
    const { rows } = await db.query<MarketplaceListingRecord>(
      `SELECT l.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
       FROM marketplace_listings l
       JOIN marketplace_reviews r ON r.listing_id = l.id
       WHERE l.status = 'published'
       GROUP BY l.id
       HAVING COUNT(r.id) >= $2
       ORDER BY avg_rating DESC, review_count DESC
       LIMIT $1`,
      [params.limit, params.minReviews]
    );
    return rows;
  },

  async featureListing(params: {
    listingId: string;
    featured: boolean;
    featuredUntil?: string;
    featuredPosition?: number;
  }): Promise<void> {
    const metadata = {
      featured: params.featured.toString(),
      featuredUntil: params.featuredUntil || null,
      featuredPosition: params.featuredPosition || null,
    };

    await db.query(
      `UPDATE marketplace_listings
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [params.listingId, JSON.stringify(metadata)]
    );
  },

  // Activity Tracking -----------------------------------------------------------
  async getUserActivity(params: {
    userId: string;
    type?: string;
    limit: number;
    offset: number;
  }): Promise<Array<{
    id: string;
    type: string;
    listing_id: string;
    listing_title: string;
    metadata: any;
    created_at: string;
  }>> {
    const typeFilter = params.type ? `AND a.type = $2` : '';
    const queryParams = params.type
      ? [params.userId, params.type, params.limit, params.offset]
      : [params.userId, params.limit, params.offset];

    const { rows } = await db.query(
      `SELECT a.id, a.type, a.listing_id, l.title as listing_title, a.metadata, a.created_at
       FROM marketplace_activity a
       JOIN marketplace_listings l ON l.id = a.listing_id
       WHERE a.user_id = $1 ${typeFilter}
       ORDER BY a.created_at DESC
       LIMIT $${params.type ? 3 : 2} OFFSET $${params.type ? 4 : 3}`,
      queryParams
    );
    return rows;
  },

  async getUserActivityCount(params: {
    userId: string;
    type?: string;
  }): Promise<number> {
    const typeFilter = params.type ? `AND type = $2` : '';
    const queryParams = params.type ? [params.userId, params.type] : [params.userId];

    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM marketplace_activity
       WHERE user_id = $1 ${typeFilter}`,
      queryParams
    );
    return parseInt(rows[0]?.count || '0');
  },

  async trackActivity(params: {
    userId: string | null;
    listingId: string;
    type: string;
    metadata?: any;
  }): Promise<void> {
    await db.query(
      `INSERT INTO marketplace_activity (id, user_id, listing_id, type, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        crypto.randomUUID(),
        params.userId,
        params.listingId,
        params.type,
        JSON.stringify(params.metadata || {}),
      ]
    );
  },

  // Seller Reports --------------------------------------------------------------
  async getSellerTransactions(params: {
    sellerId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Array<MarketplaceTransactionRecord>> {
    const { rows } = await db.query<MarketplaceTransactionRecord>(
      `SELECT t.*
       FROM marketplace_transactions t
       JOIN marketplace_listings l ON t.listing_id = l.id
       WHERE l.seller_id = $1
         AND t.created_at >= $2
         AND t.created_at <= $3
       ORDER BY t.created_at DESC`,
      [params.sellerId, params.startDate.toISOString(), params.endDate.toISOString()]
    );
    return rows;
  },

  async getSellerCustomers(params: {
    sellerId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{
    id: string;
    email: string;
    purchaseCount: number;
    totalSpentCents: number;
    firstPurchaseDate: string;
    lastPurchaseDate: string;
    isNewCustomer: boolean;
  }>> {
    const { rows } = await db.query<{
      id: string;
      email: string;
      purchase_count: string;
      total_spent_cents: string;
      first_purchase_date: string;
      last_purchase_date: string;
      is_new_customer: boolean;
    }>(
      `SELECT
         u.id,
         u.email,
         COUNT(p.id) as purchase_count,
         SUM(o.total_cents) as total_spent_cents,
         MIN(p.created_at) as first_purchase_date,
         MAX(p.created_at) as last_purchase_date,
         MIN(p.created_at) >= $2 as is_new_customer
       FROM users u
       JOIN marketplace_purchases p ON p.buyer_id = u.id
       JOIN marketplace_orders o ON o.id = p.order_id
       JOIN marketplace_listings l ON l.id = p.listing_id
       WHERE l.seller_id = $1
         AND p.created_at >= $2
         AND p.created_at <= $3
       GROUP BY u.id, u.email
       ORDER BY total_spent_cents DESC`,
      [params.sellerId, params.startDate.toISOString(), params.endDate.toISOString()]
    );

    return rows.map(row => ({
      id: row.id,
      email: row.email,
      purchaseCount: parseInt(row.purchase_count),
      totalSpentCents: parseInt(row.total_spent_cents),
      firstPurchaseDate: row.first_purchase_date,
      lastPurchaseDate: row.last_purchase_date,
      isNewCustomer: row.is_new_customer,
    }));
  },

  // Coupons --------------------------------------------------------------------
  async getCouponByCode(code: string): Promise<any | null> {
    const { rows } = await db.query(
      `SELECT c.*, s.display_name as seller_name
       FROM marketplace_coupons c
       LEFT JOIN marketplace_sellers s ON c.seller_id = s.id
       WHERE c.code = $1 AND c.is_active = true`,
      [code.toUpperCase()]
    );
    return rows[0] ?? null;
  },

  async validateCoupon(params: {
    code: string;
    userId: string;
    listingId: string;
    amountCents: number;
  }): Promise<{ valid: boolean; reason?: string; discountCents?: number }> {
    const coupon = await this.getCouponByCode(params.code);
    
    if (!coupon) {
      return { valid: false, reason: 'Coupon not found or inactive' };
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    // Check start date
    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
      return { valid: false, reason: 'Coupon is not yet active' };
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }

    // Check per-user limit
    const { rows: usageRows } = await db.query(
      `SELECT COUNT(*) as count FROM marketplace_coupon_usage WHERE coupon_id = $1 AND user_id = $2`,
      [coupon.id, params.userId]
    );
    if (coupon.per_user_limit && parseInt(usageRows[0].count) >= coupon.per_user_limit) {
      return { valid: false, reason: 'You have already used this coupon' };
    }

    // Check minimum purchase
    if (coupon.min_purchase_cents && params.amountCents < coupon.min_purchase_cents) {
      return { valid: false, reason: `Minimum purchase of ₹${coupon.min_purchase_cents / 100} required` };
    }

    // Check applicable listings/categories
    if (coupon.applicable_to === 'specific_listings') {
      if (!coupon.applicable_ids || !coupon.applicable_ids.includes(params.listingId)) {
        return { valid: false, reason: 'Coupon not applicable to this listing' };
      }
    } else if (coupon.applicable_to === 'categories') {
      const { rows: listingRows } = await db.query(
        `SELECT category_id FROM marketplace_listings WHERE id = $1`,
        [params.listingId]
      );
      if (!listingRows[0] || !coupon.applicable_ids || !coupon.applicable_ids.includes(listingRows[0].category_id)) {
        return { valid: false, reason: 'Coupon not applicable to this category' };
      }
    }

    // Calculate discount
    let discountCents = 0;
    if (coupon.discount_type === 'percentage') {
      discountCents = Math.floor((params.amountCents * coupon.discount_value) / 100);
      if (coupon.max_discount_cents) {
        discountCents = Math.min(discountCents, coupon.max_discount_cents);
      }
    } else {
      discountCents = coupon.discount_value;
    }

    // Ensure discount doesn't exceed amount
    discountCents = Math.min(discountCents, params.amountCents);

    return { valid: true, discountCents };
  },

  async createCoupon(params: {
    sellerId: string | null;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchaseCents?: number;
    maxDiscountCents?: number;
    usageLimit?: number;
    perUserLimit?: number;
    applicableTo?: 'all' | 'specific_listings' | 'categories';
    applicableIds?: string[];
    startsAt?: Date;
    expiresAt?: Date;
  }): Promise<any> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_coupons (
        id, seller_id, code, description, discount_type, discount_value,
        min_purchase_cents, max_discount_cents, usage_limit, per_user_limit,
        applicable_to, applicable_ids, starts_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.code.toUpperCase(),
        params.description || null,
        params.discountType,
        params.discountValue,
        params.minPurchaseCents || 0,
        params.maxDiscountCents || null,
        params.usageLimit || null,
        params.perUserLimit || 1,
        params.applicableTo || 'all',
        params.applicableIds || null,
        params.startsAt?.toISOString() || new Date().toISOString(),
        params.expiresAt?.toISOString() || null,
      ]
    );
    return rows[0];
  },

  async recordCouponUsage(params: {
    couponId: string;
    userId: string;
    orderId: string;
    discountAmountCents: number;
  }): Promise<void> {
    await db.query(
      `INSERT INTO marketplace_coupon_usage (id, coupon_id, user_id, order_id, discount_amount_cents)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), params.couponId, params.userId, params.orderId, params.discountAmountCents]
    );
  },

  async getSellerCoupons(sellerId: string): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM marketplace_coupon_usage WHERE coupon_id = c.id) as total_usage,
        (SELECT COALESCE(SUM(discount_amount_cents), 0) FROM marketplace_coupon_usage WHERE coupon_id = c.id) as total_discount_given
       FROM marketplace_coupons c
       WHERE c.seller_id = $1
       ORDER BY c.created_at DESC`,
      [sellerId]
    );
    return rows;
  },

  async updateCoupon(params: {
    couponId: string;
    isActive?: boolean;
    expiresAt?: Date;
    usageLimit?: number;
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(params.isActive);
    }
    if (params.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(params.expiresAt.toISOString());
    }
    if (params.usageLimit !== undefined) {
      updates.push(`usage_limit = $${paramIndex++}`);
      values.push(params.usageLimit);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(params.couponId);
      await db.query(
        `UPDATE marketplace_coupons SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }
  },

  // Messaging ------------------------------------------------------------------
  async getOrCreateConversation(params: {
    buyerId: string;
    sellerId: string;
    listingId?: string;
    subject?: string;
  }): Promise<any> {
    // Try to find existing conversation
    const { rows: existing } = await db.query(
      `SELECT * FROM marketplace_conversations 
       WHERE buyer_id = $1 AND seller_id = $2 AND ($3::uuid IS NULL OR listing_id = $3)`,
      [params.buyerId, params.sellerId, params.listingId || null]
    );

    if (existing[0]) {
      return existing[0];
    }

    // Create new conversation
    const { rows } = await db.query(
      `INSERT INTO marketplace_conversations (id, buyer_id, seller_id, listing_id, subject)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [crypto.randomUUID(), params.buyerId, params.sellerId, params.listingId || null, params.subject || null]
    );
    return rows[0];
  },

  async getConversations(params: {
    userId: string;
    userType: 'buyer' | 'seller';
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.userType === 'buyer') {
      conditions.push(`c.buyer_id = $${paramIndex++}`);
      values.push(params.userId);
    } else {
      conditions.push(`s.user_id = $${paramIndex++}`);
      values.push(params.userId);
    }

    if (params.status) {
      conditions.push(`c.status = $${paramIndex++}`);
      values.push(params.status);
    }

    const { rows } = await db.query(
      `SELECT c.*, 
        u.email as buyer_email,
        s.display_name as seller_name,
        l.title as listing_title,
        (SELECT COUNT(*) FROM marketplace_messages WHERE conversation_id = c.id AND is_read = false AND sender_id != $1) as unread_count,
        (SELECT message FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM marketplace_conversations c
       JOIN users u ON c.buyer_id = u.id
       JOIN marketplace_sellers s ON c.seller_id = s.id
       LEFT JOIN marketplace_listings l ON c.listing_id = l.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.last_message_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, params.limit || 20, params.offset || 0]
    );
    return rows;
  },

  async getMessages(params: {
    conversationId: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT m.*, u.email as sender_email
       FROM marketplace_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [params.conversationId, params.limit || 50, params.offset || 0]
    );
    return rows.reverse(); // Return in chronological order
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderType: 'buyer' | 'seller';
    message: string;
    attachments?: any[];
  }): Promise<any> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_messages (id, conversation_id, sender_id, sender_type, message, attachments)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        crypto.randomUUID(),
        params.conversationId,
        params.senderId,
        params.senderType,
        params.message,
        JSON.stringify(params.attachments || []),
      ]
    );
    return rows[0];
  },

  async markMessagesAsRead(params: {
    conversationId: string;
    userId: string;
  }): Promise<void> {
    await db.query(
      `UPDATE marketplace_messages 
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [params.conversationId, params.userId]
    );
  },

  async getUnreadMessageCount(userId: string, userType: 'buyer' | 'seller'): Promise<number> {
    const query = userType === 'buyer'
      ? `SELECT COUNT(*) as count FROM marketplace_messages m
         JOIN marketplace_conversations c ON m.conversation_id = c.id
         WHERE c.buyer_id = $1 AND m.sender_id != $1 AND m.is_read = false`
      : `SELECT COUNT(*) as count FROM marketplace_messages m
         JOIN marketplace_conversations c ON m.conversation_id = c.id
         JOIN marketplace_sellers s ON c.seller_id = s.id
         WHERE s.user_id = $1 AND m.sender_id != $1 AND m.is_read = false`;
    
    const { rows } = await db.query(query, [userId]);
    return parseInt(rows[0].count);
  },

  // Subscriptions --------------------------------------------------------------
  async createSubscriptionPlan(params: {
    sellerId: string;
    name: string;
    description?: string;
    priceCents: number;
    billingInterval: 'monthly' | 'quarterly' | 'yearly';
    features?: any[];
    maxDownloads?: number;
  }): Promise<any> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_subscription_plans (
        id, seller_id, name, description, price_cents, billing_interval, features, max_downloads
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.name,
        params.description || null,
        params.priceCents,
        params.billingInterval,
        JSON.stringify(params.features || []),
        params.maxDownloads || null,
      ]
    );
    return rows[0];
  },

  async getSubscriptionPlans(sellerId: string): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT sp.*,
        (SELECT COUNT(*) FROM marketplace_subscriptions WHERE plan_id = sp.id AND status = 'active') as active_subscribers
       FROM marketplace_subscription_plans sp
       WHERE sp.seller_id = $1 AND sp.is_active = true
       ORDER BY sp.price_cents ASC`,
      [sellerId]
    );
    return rows;
  },

  async createSubscription(params: {
    planId: string;
    userId: string;
    sellerId: string;
    paymentGatewaySubscriptionId?: string;
  }): Promise<any> {
    const now = new Date();
    const periodEnd = new Date(now);
    
    // Get billing interval from plan
    const { rows: planRows } = await db.query(
      `SELECT billing_interval FROM marketplace_subscription_plans WHERE id = $1`,
      [params.planId]
    );
    
    const interval = planRows[0]?.billing_interval;
    if (interval === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (interval === 'quarterly') {
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    } else if (interval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const { rows } = await db.query(
      `INSERT INTO marketplace_subscriptions (
        id, plan_id, user_id, seller_id, current_period_start, current_period_end, payment_gateway_subscription_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        crypto.randomUUID(),
        params.planId,
        params.userId,
        params.sellerId,
        now.toISOString(),
        periodEnd.toISOString(),
        params.paymentGatewaySubscriptionId || null,
      ]
    );
    return rows[0];
  },

  async getUserSubscriptions(userId: string): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT s.*, sp.name as plan_name, sp.price_cents, sp.billing_interval, sp.max_downloads,
        sel.display_name as seller_name
       FROM marketplace_subscriptions s
       JOIN marketplace_subscription_plans sp ON s.plan_id = sp.id
       JOIN marketplace_sellers sel ON s.seller_id = sel.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async getSellerSubscribers(sellerId: string): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT s.*, sp.name as plan_name, u.email as user_email
       FROM marketplace_subscriptions s
       JOIN marketplace_subscription_plans sp ON s.plan_id = sp.id
       JOIN users u ON s.user_id = u.id
       WHERE s.seller_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC`,
      [sellerId]
    );
    return rows;
  },

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    if (cancelAtPeriodEnd) {
      await db.query(
        `UPDATE marketplace_subscriptions 
         SET cancel_at_period_end = true, cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [subscriptionId]
      );
    } else {
      await db.query(
        `UPDATE marketplace_subscriptions 
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [subscriptionId]
      );
    }
  },

  async checkSubscriptionAccess(params: {
    userId: string;
    sellerId: string;
  }): Promise<{ hasAccess: boolean; subscription?: any; downloadsRemaining?: number }> {
    const { rows } = await db.query(
      `SELECT s.*, sp.max_downloads
       FROM marketplace_subscriptions s
       JOIN marketplace_subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = $1 AND s.seller_id = $2 AND s.status = 'active'
         AND s.current_period_end > NOW()
       LIMIT 1`,
      [params.userId, params.sellerId]
    );

    if (rows.length === 0) {
      return { hasAccess: false };
    }

    const subscription = rows[0];
    const downloadsRemaining = subscription.max_downloads 
      ? subscription.max_downloads - subscription.downloads_used
      : null;

    return {
      hasAccess: true,
      subscription,
      downloadsRemaining: downloadsRemaining,
    };
  },

  // Platform Fees --------------------------------------------------------------
  async calculatePlatformFees(params: {
    amountCents: number;
    sellerId: string;
    categoryId: string;
  }): Promise<{ totalFeeCents: number; feeBreakdown: any[] }> {
    // Get applicable fees
    const { rows: fees } = await db.query(
      `SELECT * FROM marketplace_platform_fees
       WHERE is_active = true
         AND (
           applies_to = 'all'
           OR (applies_to = 'seller' AND target_id = $1)
           OR (applies_to = 'category' AND target_id = $2)
         )
         AND ($3 >= COALESCE(min_amount_cents, 0))
         AND ($3 <= COALESCE(max_amount_cents, 999999999))
       ORDER BY priority DESC`,
      [params.sellerId, params.categoryId, params.amountCents]
    );

    let totalFeeCents = 0;
    const feeBreakdown: any[] = [];

    for (const fee of fees) {
      let feeAmount = 0;
      
      if (fee.fee_type === 'percentage') {
        feeAmount = Math.floor((params.amountCents * fee.fee_value) / 100);
      } else if (fee.fee_type === 'fixed') {
        feeAmount = Math.floor(fee.fee_value * 100); // Convert to cents
      }

      totalFeeCents += feeAmount;
      feeBreakdown.push({
        feeId: fee.id,
        name: fee.name,
        type: fee.fee_type,
        value: fee.fee_value,
        amountCents: feeAmount,
      });
    }

    return { totalFeeCents, feeBreakdown };
  },

  async recordFeeCalculation(params: {
    transactionId: string;
    feeBreakdown: any[];
  }): Promise<void> {
    for (const fee of params.feeBreakdown) {
      await db.query(
        `INSERT INTO marketplace_fee_records (
          id, transaction_id, fee_id, fee_name, fee_type, fee_amount_cents, calculation_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          params.transactionId,
          fee.feeId,
          fee.name,
          fee.type,
          fee.amountCents,
          JSON.stringify({ value: fee.value }),
        ]
      );
    }
  },

  async getPlatformFees(): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_platform_fees WHERE is_active = true ORDER BY priority DESC`
    );
    return rows;
  },

  async createPlatformFee(params: {
    name: string;
    description?: string;
    feeType: 'percentage' | 'fixed' | 'tiered';
    feeValue: number;
    appliesTo?: 'all' | 'category' | 'seller';
    targetId?: string;
    minAmountCents?: number;
    maxAmountCents?: number;
    priority?: number;
  }): Promise<any> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_platform_fees (
        id, name, description, fee_type, fee_value, applies_to, target_id,
        min_amount_cents, max_amount_cents, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        crypto.randomUUID(),
        params.name,
        params.description || null,
        params.feeType,
        params.feeValue,
        params.appliesTo || 'all',
        params.targetId || null,
        params.minAmountCents || null,
        params.maxAmountCents || null,
        params.priority || 0,
      ]
    );
    return rows[0];
  },

  // Seller Badges --------------------------------------------------------------
  async awardBadge(params: {
    sellerId: string;
    badgeType: 'verified' | 'top_seller' | 'fast_responder' | 'quality_assured' | 'new_seller' | 'exclusive';
    expiresAt?: Date;
    metadata?: any;
  }): Promise<any> {
    const { rows } = await db.query(
      `INSERT INTO marketplace_seller_badges (id, seller_id, badge_type, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (seller_id, badge_type) DO UPDATE
       SET expires_at = $4, metadata = $5, awarded_at = NOW()
       RETURNING *`,
      [
        crypto.randomUUID(),
        params.sellerId,
        params.badgeType,
        params.expiresAt?.toISOString() || null,
        JSON.stringify(params.metadata || {}),
      ]
    );
    return rows[0];
  },

  async getSellerBadges(sellerId: string): Promise<any[]> {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_seller_badges
       WHERE seller_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY awarded_at DESC`,
      [sellerId]
    );
    return rows;
  },

  async revokeBadge(sellerId: string, badgeType: string): Promise<void> {
    await db.query(
      `DELETE FROM marketplace_seller_badges WHERE seller_id = $1 AND badge_type = $2`,
      [sellerId, badgeType]
    );
  },
};