import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { z } from "zod";
import { requireAuth } from "../lib/auth.server";
import { finalizePurchase } from "../lib/marketplace/service";
import { db } from "../lib/db.server";
import { sendEmail, generateOrderConfirmationEmail, generateSellerNotificationEmail } from "../lib/email.server";

const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  // Get authenticated user
  const { userId } = await requireAuth(request);
  
  const body = await request.json();
  const parsed = verifyPaymentSchema.safeParse(body);

  if (!parsed.success) {
    console.error("❌ Payment verification - Invalid request:", parsed.error.flatten());
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    console.log("🔍 Verifying payment for order:", parsed.data.orderId);
    
    const purchase = await finalizePurchase({
      orderId: parsed.data.orderId,
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    });

    console.log("✅ Payment verified successfully:", purchase.id);
    
    // Send email notifications asynchronously (don't block response)
    sendOrderConfirmationEmails(parsed.data.orderId, userId).catch(error => {
      console.error("❌ Failed to send email notifications:", error);
      // Don't fail the request if email fails
    });
    
    return json({ success: true, purchase }, { status: 200 });
  } catch (error) {
    console.error("❌ Payment verification failed:", error);
    return json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Payment verification failed" 
      },
      { status: 400 }
    );
  }
}

// Helper function to send order confirmation emails
async function sendOrderConfirmationEmails(orderId: string, buyerId: string) {
  try {
    // Get order details with buyer and seller info
    const { rows } = await db.query<{
      order_id: string;
      buyer_id: string;
      buyer_name: string;
      buyer_email: string;
      seller_id: string;
      seller_name: string;
      seller_email: string;
      listing_title: string;
      total_cents: number;
      currency: string;
      created_at: Date;
      metadata: any;
    }>(
      `SELECT 
        o.id as order_id,
        o.buyer_id,
        buyer.name as buyer_name,
        buyer.email as buyer_email,
        l.seller_id,
        seller.name as seller_name,
        seller.email as seller_email,
        l.title as listing_title,
        o.total_cents,
        o.currency,
        o.created_at,
        o.metadata
      FROM marketplace_orders o
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN marketplace_listings l ON o.listing_id = l.id
      JOIN users seller ON l.seller_id = seller.id
      WHERE o.id = $1`,
      [orderId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ Order ${orderId} not found for email notification`);
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

    // Parse items from metadata
    const items = order.metadata?.items || [{ title: order.listing_title, price: order.total_cents }];

    // Send buyer confirmation email
    const buyerEmail = generateOrderConfirmationEmail({
      buyerName: order.buyer_name || 'Customer',
      orderId: order.order_id,
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
      subject: buyerEmail.subject,
      html: buyerEmail.html,
      text: buyerEmail.text
    });

    console.log(`✅ Sent order confirmation email to buyer: ${order.buyer_email}`);

    // Send seller notification email
    const sellerEmail = generateSellerNotificationEmail({
      sellerName: order.seller_name || 'Seller',
      buyerName: order.buyer_name || 'Customer',
      listingTitle: order.listing_title,
      amount: order.total_cents,
      currency: order.currency || 'INR',
      orderId: order.order_id,
      orderDate
    });

    await sendEmail({
      to: order.seller_email,
      subject: sellerEmail.subject,
      html: sellerEmail.html,
      text: sellerEmail.text
    });

    console.log(`✅ Sent sale notification email to seller: ${order.seller_email}`);
  } catch (error) {
    console.error("❌ Error sending order confirmation emails:", error);
    throw error;
  }
}