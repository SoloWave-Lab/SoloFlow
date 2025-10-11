import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flyingdarkdev.in';

if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not configured - emails will not be sent');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    console.error('❌ Cannot send email - Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    console.log(`📧 Sending email to ${params.to}: ${params.subject}`);
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent successfully: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Email Templates

export function generateOrderConfirmationEmail(params: {
  buyerName: string;
  orderId: string;
  items: Array<{
    title: string;
    price: number;
  }>;
  total: number;
  currency: string;
  orderDate: string;
}): { subject: string; html: string; text: string } {
  const { buyerName, orderId, items, total, currency, orderDate } = params;
  
  const subject = `Order Confirmation - ${orderId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #4CAF50;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 28px;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .order-details {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .order-details h2 {
      margin-top: 0;
      color: #333;
      font-size: 18px;
    }
    .order-info {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .order-info:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #666;
    }
    .value {
      color: #333;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th {
      background-color: #f0f0f0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .total-row {
      font-weight: 600;
      font-size: 18px;
      background-color: #f9f9f9;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4CAF50;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #45a049;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer a {
      color: #4CAF50;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">🎉</div>
      <h1>Order Confirmed!</h1>
      <p>Thank you for your purchase, ${buyerName}!</p>
    </div>

    <p>Your order has been successfully processed and your items are now available for download.</p>

    <div class="order-details">
      <h2>Order Details</h2>
      <div class="order-info">
        <span class="label">Order ID:</span>
        <span class="value">${orderId}</span>
      </div>
      <div class="order-info">
        <span class="label">Order Date:</span>
        <span class="value">${orderDate}</span>
      </div>
      <div class="order-info">
        <span class="label">Payment Status:</span>
        <span class="value" style="color: #4CAF50;">✓ Paid</span>
      </div>
    </div>

    <h2>Items Purchased</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.title}</td>
            <td style="text-align: right;">${currency} ${(item.price / 100).toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td>Total</td>
          <td style="text-align: right;">${currency} ${(total / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center;">
      <a href="https://kylo.flyingdarkdev.in/marketplace/purchases" class="button">View Your Purchases</a>
    </div>

    <div class="footer">
      <p>Need help? <a href="https://kylo.flyingdarkdev.in/support">Contact Support</a></p>
      <p>© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Order Confirmation - ${orderId}

Thank you for your purchase, ${buyerName}!

Your order has been successfully processed and your items are now available for download.

Order Details:
- Order ID: ${orderId}
- Order Date: ${orderDate}
- Payment Status: Paid

Items Purchased:
${items.map(item => `- ${item.title}: ${currency} ${(item.price / 100).toFixed(2)}`).join('\n')}

Total: ${currency} ${(total / 100).toFixed(2)}

View your purchases: https://kylo.flyingdarkdev.in/marketplace/purchases

Need help? Contact us at https://kylo.flyingdarkdev.in/support

© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.
  `;

  return { subject, html, text };
}

export function generateSellerNotificationEmail(params: {
  sellerName: string;
  buyerName: string;
  listingTitle: string;
  amount: number;
  currency: string;
  orderId: string;
  orderDate: string;
}): { subject: string; html: string; text: string } {
  const { sellerName, buyerName, listingTitle, amount, currency, orderId, orderDate } = params;
  
  const subject = `New Sale: ${listingTitle}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Sale Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #2196F3;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2196F3;
      margin: 0;
      font-size: 28px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .sale-details {
      background-color: #f0f8ff;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #2196F3;
    }
    .sale-info {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
    }
    .label {
      font-weight: 600;
      color: #666;
    }
    .value {
      color: #333;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #4CAF50;
      text-align: center;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #2196F3;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">💰</div>
      <h1>New Sale!</h1>
      <p>Congratulations, ${sellerName}!</p>
    </div>

    <p>You've made a sale on the FlyingDarkDev Marketplace!</p>

    <div class="amount">${currency} ${(amount / 100).toFixed(2)}</div>

    <div class="sale-details">
      <div class="sale-info">
        <span class="label">Item Sold:</span>
        <span class="value">${listingTitle}</span>
      </div>
      <div class="sale-info">
        <span class="label">Buyer:</span>
        <span class="value">${buyerName}</span>
      </div>
      <div class="sale-info">
        <span class="label">Order ID:</span>
        <span class="value">${orderId}</span>
      </div>
      <div class="sale-info">
        <span class="label">Sale Date:</span>
        <span class="value">${orderDate}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="https://kylo.flyingdarkdev.in/marketplace/seller/sales" class="button">View Sales Dashboard</a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
New Sale Notification

Congratulations, ${sellerName}!

You've made a sale on the FlyingDarkDev Marketplace!

Amount: ${currency} ${(amount / 100).toFixed(2)}

Sale Details:
- Item Sold: ${listingTitle}
- Buyer: ${buyerName}
- Order ID: ${orderId}
- Sale Date: ${orderDate}

View your sales dashboard: https://kylo.flyingdarkdev.in/marketplace/seller/sales

© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.
  `;

  return { subject, html, text };
}

export function generatePaymentFailedEmail(params: {
  buyerName: string;
  orderId: string;
  reason?: string;
}): { subject: string; html: string; text: string } {
  const { buyerName, orderId, reason } = params;
  
  const subject = `Payment Failed - Order ${orderId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #f44336;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #f44336;
      margin: 0;
      font-size: 28px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4CAF50;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer a {
      color: #4CAF50;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">⚠️</div>
      <h1>Payment Failed</h1>
    </div>

    <p>Hi ${buyerName},</p>

    <p>We were unable to process your payment for order <strong>${orderId}</strong>.</p>

    ${reason ? `
    <div class="alert-box">
      <strong>Reason:</strong> ${reason}
    </div>
    ` : ''}

    <p>Don't worry! You can try again with a different payment method or card.</p>

    <div style="text-align: center;">
      <a href="https://kylo.flyingdarkdev.in/marketplace/cart" class="button">Retry Payment</a>
    </div>

    <p>If you continue to experience issues, please <a href="https://kylo.flyingdarkdev.in/support">contact our support team</a>.</p>

    <div class="footer">
      <p>Need help? <a href="https://kylo.flyingdarkdev.in/support">Contact Support</a></p>
      <p>© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Payment Failed - Order ${orderId}

Hi ${buyerName},

We were unable to process your payment for order ${orderId}.

${reason ? `Reason: ${reason}` : ''}

Don't worry! You can try again with a different payment method or card.

Retry payment: https://kylo.flyingdarkdev.in/marketplace/cart

If you continue to experience issues, please contact our support team at https://kylo.flyingdarkdev.in/support

© ${new Date().getFullYear()} FlyingDarkDev. All rights reserved.
  `;

  return { subject, html, text };
}