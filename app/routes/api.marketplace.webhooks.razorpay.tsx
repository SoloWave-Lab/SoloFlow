import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import crypto from "crypto";
import { db } from "../lib/db.server";
import { sendEmail, generateOrderConfirmationEmail, generatePaymentFailedEmail } from "../lib/email.server";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_WEBHOOK_SECRET) {
  console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET not configured - webhook signature verification will fail');
}

/**
 * Razorpay Webhook Handler
 * 
 * Handles webhook events from Razorpay:
 * - payment.captured: Payment successful
 * - payment.failed: Payment failed
 * - order.paid: Order fully paid
 * 
 * Documentation: https://razorpay.com/docs/webhooks/
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-razorpay-signature');
    const body = await request.text();
    
    if (!signature) {
      console.error('❌ Webhook: Missing signature');
      return json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    if (RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Webhook: Invalid signature');
        return json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    console.log(`📨 Webhook received: ${event}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(orderEntity);
        break;
      
      default:
        console.log(`ℹ️ Webhook: Unhandled event type: ${event}`);
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle payment.captured event
 * This is called when a payment is successfully captured
 */
async function handlePaymentCaptured(payment: any) {
  try {
    console.log(`✅ Payment captured: ${payment.id}`);
    
    const orderId = payment.notes?.order_id;
    if (!orderId) {
      console.warn('⚠️ Payment captured but no order_id in notes');
      return;
    }

    // Check if order exists and update status
    const { rows: orderRows } = await db.query<{
      id: string;
      buyer_id: string;
      status: string;
      total_cents: number;
    }>(
      `SELECT id, buyer_id, status, total_cents 
       FROM marketplace_orders 
       WHERE id = $1`,
      [orderId]
    );

    if (orderRows.length === 0) {
      console.warn(`⚠️ Order ${orderId} not found`);
      return;
    }

    const order = orderRows[0];

    // Only process if order is not already paid
    if (order.status === 'paid') {
      console.log(`ℹ️ Order ${orderId} already marked as paid`);
      return;
    }

    // Update order status
    await db.query(
      `UPDATE marketplace_orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      ['paid', orderId]
    );

    // Record transaction if not already recorded
    const { rows: txRows } = await db.query(
      `SELECT id FROM marketplace_transactions 
       WHERE razorpay_payment_id = $1`,
      [payment.id]
    );

    if (txRows.length === 0) {
      await db.query(
        `INSERT INTO marketplace_transactions 
         (order_id, razorpay_payment_id, status, amount_cents, payment_method, payment_metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          orderId,
          payment.id,
          'captured',
          payment.amount,
          payment.method,
          JSON.stringify(payment)
        ]
      );
    }

    console.log(`✅ Order ${orderId} marked as paid via webhook`);

    // Send confirmation email (async, don't block)
    sendWebhookConfirmationEmail(orderId).catch(error => {
      console.error('❌ Failed to send webhook confirmation email:', error);
    });
  } catch (error) {
    console.error('❌ Error handling payment.captured:', error);
    throw error;
  }
}

/**
 * Handle payment.failed event
 * This is called when a payment fails
 */
async function handlePaymentFailed(payment: any) {
  try {
    console.log(`❌ Payment failed: ${payment.id}`);
    
    const orderId = payment.notes?.order_id;
    if (!orderId) {
      console.warn('⚠️ Payment failed but no order_id in notes');
      return;
    }

    // Update order status to failed
    await db.query(
      `UPDATE marketplace_orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      ['failed', orderId]
    );

    // Record failed transaction
    await db.query(
      `INSERT INTO marketplace_transactions 
       (order_id, razorpay_payment_id, status, amount_cents, payment_method, payment_metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        orderId,
        payment.id,
        'failed',
        payment.amount,
        payment.method,
        JSON.stringify(payment)
      ]
    );

    console.log(`✅ Order ${orderId} marked as failed via webhook`);

    // Send failure email (async, don't block)
    sendPaymentFailureEmail(orderId, payment.error_description).catch(error => {
      console.error('❌ Failed to send payment failure email:', error);
    });
  } catch (error) {
    console.error('❌ Error handling payment.failed:', error);
    throw error;
  }
}

/**
 * Handle order.paid event
 * This is called when an order is fully paid
 */
async function handleOrderPaid(order: any) {
  try {
    console.log(`✅ Order paid: ${order.id}`);
    
    const receipt = order.receipt; // This is our order ID
    if (!receipt) {
      console.warn('⚠️ Order paid but no receipt (order_id)');
      return;
    }

    // Update order status
    await db.query(
      `UPDATE marketplace_orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND status != 'paid'`,
      ['paid', receipt]
    );

    console.log(`✅ Order ${receipt} marked as paid via order.paid webhook`);
  } catch (error) {
    console.error('❌ Error handling order.paid:', error);
    throw error;
  }
}

/**
 * Send confirmation email after webhook processing
 */
async function sendWebhookConfirmationEmail(orderId: string) {
  try {
    // Get order details
    const { rows } = await db.query<{
      buyer_email: string;
      buyer_name: string;
      listing_title: string;
      total_cents: number;
      currency: string;
      created_at: Date;
      metadata: any;
    }>(
      `SELECT 
        buyer.email as buyer_email,
        buyer.name as buyer_name,
        l.title as listing_title,
        o.total_cents,
        o.currency,
        o.created_at,
        o.metadata
      FROM marketplace_orders o
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN marketplace_listings l ON o.listing_id = l.id
      WHERE o.id = $1`,
      [orderId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ Order ${orderId} not found for webhook email`);
      return;
    }

    const order = rows[0];
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const items = order.metadata?.items || [{ title: order.listing_title, price: order.total_cents }];

    const email = generateOrderConfirmationEmail({
      buyerName: order.buyer_name || 'Customer',
      orderId: orderId,
      items: items.map((item: any) => ({
        title: item.title,
        price: item.priceCents
      })),
      total: order.total_cents,
      currency: order.currency || 'INR',
      orderDate
    });

    await sendEmail({
      to: order.buyer_email,
      subject: email.subject,
      html: email.html,
      text: email.text
    });

    console.log(`✅ Sent webhook confirmation email to: ${order.buyer_email}`);
  } catch (error) {
    console.error('❌ Error sending webhook confirmation email:', error);
    throw error;
  }
}

/**
 * Send payment failure email
 */
async function sendPaymentFailureEmail(orderId: string, reason?: string) {
  try {
    // Get buyer details
    const { rows } = await db.query<{
      buyer_email: string;
      buyer_name: string;
    }>(
      `SELECT 
        buyer.email as buyer_email,
        buyer.name as buyer_name
      FROM marketplace_orders o
      JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.id = $1`,
      [orderId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ Order ${orderId} not found for failure email`);
      return;
    }

    const buyer = rows[0];

    const email = generatePaymentFailedEmail({
      buyerName: buyer.buyer_name || 'Customer',
      orderId: orderId,
      reason: reason
    });

    await sendEmail({
      to: buyer.buyer_email,
      subject: email.subject,
      html: email.html,
      text: email.text
    });

    console.log(`✅ Sent payment failure email to: ${buyer.buyer_email}`);
  } catch (error) {
    console.error('❌ Error sending payment failure email:', error);
    throw error;
  }
}

// Only allow POST requests
export async function loader() {
  return json({ error: 'Method not allowed' }, { status: 405 });
}