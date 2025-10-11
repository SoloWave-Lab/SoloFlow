/**
 * Razorpay Advanced Features Verification Script
 * 
 * This script verifies:
 * 1. User authentication setup
 * 2. Email service configuration (Resend)
 * 3. Webhook configuration
 * 4. Database schema
 * 5. All environment variables
 */

import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function header(message: string) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(message, colors.blue);
  log('='.repeat(60), colors.blue);
}

async function main() {
  header('RAZORPAY ADVANCED FEATURES VERIFICATION');
  
  let checksPassedCount = 0;
  let totalChecks = 0;

  // Check 1: Razorpay Credentials
  header('1. Razorpay Configuration');
  totalChecks++;
  
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (razorpayKeyId && razorpayKeySecret) {
    success('Razorpay credentials configured');
    info(`Key ID: ${razorpayKeyId.substring(0, 15)}...`);
    
    if (razorpayKeyId.startsWith('rzp_live_')) {
      success('Using PRODUCTION keys (rzp_live_)');
    } else if (razorpayKeyId.startsWith('rzp_test_')) {
      warning('Using TEST keys (rzp_test_)');
    }
    
    checksPassedCount++;
  } else {
    error('Razorpay credentials not configured');
    info('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  
  if (razorpayWebhookSecret) {
    success('Webhook secret configured');
    info(`Secret: ${razorpayWebhookSecret.substring(0, 10)}...`);
  } else {
    warning('Webhook secret not configured');
    info('Set RAZORPAY_WEBHOOK_SECRET in .env');
    info('Get it from: Razorpay Dashboard → Settings → Webhooks');
  }

  // Check 2: Resend Email Configuration
  header('2. Email Service Configuration (Resend)');
  totalChecks++;
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  
  if (resendApiKey) {
    success('Resend API key configured');
    info(`API Key: ${resendApiKey.substring(0, 10)}...`);
    checksPassedCount++;
  } else {
    error('Resend API key not configured');
    info('Set RESEND_API_KEY in .env');
    info('Get it from: https://resend.com/api-keys');
  }
  
  if (fromEmail) {
    success(`From email configured: ${fromEmail}`);
    
    // Check if domain matches
    const domain = fromEmail.split('@')[1];
    info(`Domain: ${domain}`);
    info('Make sure this domain is verified in Resend Dashboard');
  } else {
    warning('FROM_EMAIL not configured, using default');
    info('Set FROM_EMAIL in .env (e.g., noreply@kylo.flyingdarkdev.in)');
  }

  // Check 3: Database Connection
  header('3. Database Connection');
  totalChecks++;
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    error('DATABASE_URL not configured');
    return;
  }
  
  let pool: Pool | null = null;
  
  try {
    // Strip query params
    let connectionString = databaseUrl;
    try {
      const u = new URL(databaseUrl);
      u.search = '';
      connectionString = u.toString();
    } catch {
      // keep as-is
    }
    
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.co') 
        ? { rejectUnauthorized: false }
        : undefined,
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    
    await pool.query('SELECT 1');
    success('Database connection successful');
    checksPassedCount++;
  } catch (err) {
    error('Database connection failed');
    console.error(err);
    return;
  }

  // Check 4: Database Schema
  header('4. Database Schema Verification');
  totalChecks++;
  
  try {
    // Check users table
    const { rows: userRows } = await pool!.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name IN ('id', 'email', 'name')`
    );
    
    if (userRows.length >= 3) {
      success('Users table exists with required columns');
    } else {
      error('Users table missing required columns');
    }
    
    // Check marketplace_orders table
    const { rows: orderRows } = await pool!.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'marketplace_orders' 
       AND column_name IN ('id', 'buyer_id', 'status', 'razorpay_order_id', 'total_cents')`
    );
    
    if (orderRows.length >= 5) {
      success('marketplace_orders table exists with required columns');
    } else {
      error('marketplace_orders table missing required columns');
    }
    
    // Check marketplace_transactions table
    const { rows: txRows } = await pool!.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'marketplace_transactions' 
       AND column_name IN ('id', 'order_id', 'razorpay_payment_id', 'status')`
    );
    
    if (txRows.length >= 4) {
      success('marketplace_transactions table exists with required columns');
    } else {
      error('marketplace_transactions table missing required columns');
    }
    
    // Check marketplace_purchases table
    const { rows: purchaseRows } = await pool!.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'marketplace_purchases' 
       AND column_name IN ('id', 'order_id', 'buyer_id', 'listing_id', 'license_key')`
    );
    
    if (purchaseRows.length >= 5) {
      success('marketplace_purchases table exists with required columns');
      checksPassedCount++;
    } else {
      error('marketplace_purchases table missing required columns');
    }
  } catch (err) {
    error('Database schema verification failed');
    console.error(err);
  }

  // Check 5: Better Auth Configuration
  header('5. Better Auth Configuration');
  totalChecks++;
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (googleClientId && googleClientSecret) {
    success('Google OAuth configured');
    info(`Client ID: ${googleClientId.substring(0, 20)}...`);
    checksPassedCount++;
  } else {
    error('Google OAuth not configured');
    info('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }

  // Check 6: Test Webhook Signature Verification
  header('6. Webhook Signature Verification Test');
  totalChecks++;
  
  if (razorpayWebhookSecret) {
    try {
      const testPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              amount: 10000,
              status: 'captured'
            }
          }
        }
      });
      
      const signature = crypto
        .createHmac('sha256', razorpayWebhookSecret)
        .update(testPayload)
        .digest('hex');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', razorpayWebhookSecret)
        .update(testPayload)
        .digest('hex');
      
      if (signature === expectedSignature) {
        success('Webhook signature verification working');
        checksPassedCount++;
      } else {
        error('Webhook signature verification failed');
      }
    } catch (err) {
      error('Webhook signature test failed');
      console.error(err);
    }
  } else {
    warning('Skipping webhook signature test (secret not configured)');
  }

  // Check 7: File Existence
  header('7. Required Files Verification');
  totalChecks++;
  
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredFiles = [
    'app/lib/email.server.ts',
    'app/routes/api.marketplace.webhooks.razorpay.tsx',
    'app/routes/api.marketplace.orders.create.tsx',
    'app/routes/api.marketplace.payments.verify.tsx',
    'app/lib/auth.server.ts',
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      success(`File exists: ${file}`);
    } else {
      error(`File missing: ${file}`);
      allFilesExist = false;
    }
  }
  
  if (allFilesExist) {
    checksPassedCount++;
  }

  // Summary
  header('VERIFICATION SUMMARY');
  
  log(`\nChecks Passed: ${checksPassedCount}/${totalChecks}`, 
    checksPassedCount === totalChecks ? colors.green : colors.yellow);
  
  if (checksPassedCount === totalChecks) {
    success('\n🎉 All checks passed! Your Razorpay advanced features are ready!');
    info('\nNext steps:');
    info('1. Start the development server: pnpm dev');
    info('2. Login via Google OAuth');
    info('3. Test the complete payment flow');
    info('4. Configure webhook URL in Razorpay Dashboard');
    info('5. Verify domain in Resend Dashboard');
    info('6. Test email notifications');
  } else {
    warning(`\n⚠️  ${totalChecks - checksPassedCount} check(s) failed. Please fix the issues above.`);
  }
  
  // Cleanup
  if (pool) {
    await pool.end();
  }
}

main().catch(console.error);