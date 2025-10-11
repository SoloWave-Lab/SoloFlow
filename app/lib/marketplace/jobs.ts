/**
 * Background jobs for marketplace maintenance and automation
 * These should be scheduled via cron or a job queue system
 */

import { marketplaceRepository } from "./repository";
import { db } from "../db.server";

/**
 * Clean up expired download links
 * Schedule: Every hour
 */
export async function cleanupExpiredDownloads(): Promise<{
  deleted: number;
}> {
  const deleted = await marketplaceRepository.cleanupExpiredDownloads();
  console.log(`[Marketplace Jobs] Cleaned up ${deleted} expired download links`);
  return { deleted };
}

/**
 * Cancel stale pending orders
 * Schedule: Every 6 hours
 */
export async function cancelStaleOrders(): Promise<{
  cancelled: number;
}> {
  const staleThresholdHours = 24;
  const { rowCount } = await db.query(
    `update marketplace_orders
     set status = 'cancelled'
     where status = 'pending'
       and created_at < NOW() - INTERVAL '${staleThresholdHours} hours'`
  );

  const cancelled = rowCount ?? 0;
  console.log(`[Marketplace Jobs] Cancelled ${cancelled} stale orders`);
  return { cancelled };
}

/**
 * Compute seller analytics for the previous day
 * Schedule: Daily at 1 AM
 */
export async function computeDailySellerAnalytics(): Promise<{
  updated: number;
}> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active sellers
  const { rows: sellers } = await db.query<{ id: string }>(
    `select id from marketplace_sellers where status = 'active'`
  );

  let updated = 0;

  for (const seller of sellers) {
    const { rows: stats } = await db.query<{
      total_sales_cents: string;
      total_orders: string;
    }>(
      `select
         COALESCE(SUM(o.total_cents), 0) as total_sales_cents,
         COUNT(*) as total_orders
       from marketplace_orders o
       join marketplace_listings l on l.id = o.listing_id
       where l.seller_id = $1
         and o.status = 'paid'
         and o.created_at >= $2
         and o.created_at < $3`,
      [seller.id, yesterday.toISOString(), today.toISOString()]
    );

    const stat = stats[0];
    if (stat && parseInt(stat.total_orders, 10) > 0) {
      await marketplaceRepository.upsertSellerAnalytics({
        sellerId: seller.id,
        periodStart: yesterday,
        periodEnd: today,
        totalSalesCents: parseInt(stat.total_sales_cents, 10),
        totalOrders: parseInt(stat.total_orders, 10),
      });
      updated++;
    }
  }

  console.log(`[Marketplace Jobs] Updated analytics for ${updated} sellers`);
  return { updated };
}

/**
 * Update seller aggregate metrics (avg_rating, total_sales_cents)
 * Schedule: Daily at 2 AM
 */
export async function updateSellerAggregates(): Promise<{
  updated: number;
}> {
  const { rowCount } = await db.query(`
    update marketplace_sellers s
    set
      avg_rating = (
        select AVG(r.rating)::numeric(2,1)
        from marketplace_reviews r
        join marketplace_listings l on l.id = r.listing_id
        where l.seller_id = s.id and r.status = 'published'
      ),
      total_sales_cents = (
        select COALESCE(SUM(o.total_cents), 0)
        from marketplace_orders o
        join marketplace_listings l on l.id = o.listing_id
        where l.seller_id = s.id and o.status = 'paid'
      )
    where s.status = 'active'
  `);

  const updated = rowCount ?? 0;
  console.log(`[Marketplace Jobs] Updated aggregates for ${updated} sellers`);
  return { updated };
}

/**
 * Auto-escalate old pending moderation tickets
 * Schedule: Daily at 9 AM
 */
export async function escalateOldModerationTickets(): Promise<{
  escalated: number;
}> {
  const thresholdDays = 3;

  const tickets = await marketplaceRepository.listPendingModerationTickets();
  let escalated = 0;

  for (const ticket of tickets) {
    const createdAt = new Date(ticket.created_at);
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > thresholdDays) {
      await marketplaceRepository.updateModerationTicket({
        ticketId: ticket.id,
        status: "escalated",
        notes: `Auto-escalated after ${thresholdDays} days pending`,
      });
      escalated++;
    }
  }

  console.log(`[Marketplace Jobs] Escalated ${escalated} old moderation tickets`);
  return { escalated };
}

/**
 * Send reminder emails for incomplete seller profiles
 * Schedule: Weekly on Monday at 10 AM
 */
export async function remindIncompleteSellers(): Promise<{
  reminded: number;
}> {
  const { rows: incompleteSellers } = await db.query<{
    id: string;
    user_id: string;
    display_name: string;
  }>(
    `select s.id, s.user_id, s.display_name
     from marketplace_sellers s
     left join marketplace_listings l on l.seller_id = s.id
     where s.status = 'pending'
       and l.id is null
       and s.created_at < NOW() - INTERVAL '7 days'`
  );

  // TODO: Integrate with email service
  console.log(
    `[Marketplace Jobs] Would send reminders to ${incompleteSellers.length} incomplete sellers`
  );

  return { reminded: incompleteSellers.length };
}

/**
 * Run all scheduled jobs
 * This can be called by a cron endpoint or job scheduler
 */
export async function runScheduledJobs(jobName?: string): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};

  try {
    if (!jobName || jobName === "cleanup-downloads") {
      results.cleanupDownloads = await cleanupExpiredDownloads();
    }

    if (!jobName || jobName === "cancel-stale-orders") {
      results.cancelStaleOrders = await cancelStaleOrders();
    }

    if (!jobName || jobName === "compute-analytics") {
      results.computeAnalytics = await computeDailySellerAnalytics();
    }

    if (!jobName || jobName === "update-aggregates") {
      results.updateAggregates = await updateSellerAggregates();
    }

    if (!jobName || jobName === "escalate-tickets") {
      results.escalateTickets = await escalateOldModerationTickets();
    }

    if (!jobName || jobName === "remind-sellers") {
      results.remindSellers = await remindIncompleteSellers();
    }

    return results;
  } catch (error) {
    console.error("[Marketplace Jobs] Error running scheduled jobs:", error);
    throw error;
  }
}