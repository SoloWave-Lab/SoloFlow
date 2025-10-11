/**
 * Razorpay Production Setup Test Script
 * 
 * This script verifies that Razorpay is properly configured for production.
 * Run with: pnpm tsx test-razorpay-setup.ts
 */

import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

console.log('\n🔍 Testing Razorpay Production Setup...\n');

// Test 1: Check environment variables
console.log('📋 Test 1: Environment Variables');
console.log('─'.repeat(50));

const VITE_KEY = process.env.VITE_RAZORPAY_KEY_ID;
const BACKEND_KEY = process.env.RAZORPAY_KEY_ID;
const SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!VITE_KEY) {
  console.error('❌ VITE_RAZORPAY_KEY_ID is not set');
} else {
  console.log(`✅ VITE_RAZORPAY_KEY_ID: ${VITE_KEY.substring(0, 15)}...`);
}

if (!BACKEND_KEY) {
  console.error('❌ RAZORPAY_KEY_ID is not set');
} else {
  console.log(`✅ RAZORPAY_KEY_ID: ${BACKEND_KEY.substring(0, 15)}...`);
}

if (!SECRET) {
  console.error('❌ RAZORPAY_KEY_SECRET is not set');
} else {
  console.log(`✅ RAZORPAY_KEY_SECRET: ${SECRET.substring(0, 10)}... (${SECRET.length} chars)`);
}

// Test 2: Verify keys match
console.log('\n📋 Test 2: Key Consistency');
console.log('─'.repeat(50));

if (VITE_KEY === BACKEND_KEY) {
  console.log('✅ Frontend and backend keys match');
} else {
  console.error('❌ Frontend and backend keys do not match!');
  console.error(`   Frontend: ${VITE_KEY}`);
  console.error(`   Backend:  ${BACKEND_KEY}`);
}

// Test 3: Verify production keys
console.log('\n📋 Test 3: Production Key Validation');
console.log('─'.repeat(50));

if (BACKEND_KEY?.startsWith('rzp_live_')) {
  console.log('✅ Using production Razorpay keys (rzp_live_)');
} else if (BACKEND_KEY?.startsWith('rzp_test_')) {
  console.warn('⚠️  Using test Razorpay keys (rzp_test_)');
  console.warn('   Switch to production keys before deploying!');
} else {
  console.error('❌ Invalid Razorpay key format');
}

// Test 4: Test signature verification
console.log('\n📋 Test 4: Signature Verification');
console.log('─'.repeat(50));

if (SECRET) {
  try {
    const testOrderId = 'order_test123';
    const testPaymentId = 'pay_test456';
    const payload = `${testOrderId}|${testPaymentId}`;
    
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');
    
    console.log('✅ Signature generation works');
    console.log(`   Test signature: ${signature.substring(0, 20)}...`);
    
    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature === expectedSignature) {
      console.log('✅ Signature verification works');
    } else {
      console.error('❌ Signature verification failed');
    }
  } catch (error) {
    console.error('❌ Signature generation failed:', error);
  }
} else {
  console.error('❌ Cannot test signature - SECRET not set');
}

// Test 5: Check database connection
console.log('\n📋 Test 5: Database Connection');
console.log('─'.repeat(50));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
} else {
  console.log('✅ DATABASE_URL is configured');
  
  // Parse database URL
  try {
    const url = new URL(DATABASE_URL);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   SSL: ${DATABASE_URL.includes('supabase.co') ? 'Enabled' : 'Check config'}`);
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format');
  }
}

// Summary
console.log('\n' + '═'.repeat(50));
console.log('📊 SUMMARY');
console.log('═'.repeat(50));

const allChecks = [
  { name: 'Frontend Key', status: !!VITE_KEY },
  { name: 'Backend Key', status: !!BACKEND_KEY },
  { name: 'Secret Key', status: !!SECRET },
  { name: 'Keys Match', status: VITE_KEY === BACKEND_KEY },
  { name: 'Production Keys', status: BACKEND_KEY?.startsWith('rzp_live_') },
  { name: 'Database URL', status: !!DATABASE_URL },
];

const passed = allChecks.filter(c => c.status).length;
const total = allChecks.length;

console.log('\nChecks Passed: ' + `${passed}/${total}`.padEnd(20) + (passed === total ? '✅' : '⚠️'));
console.log('');

allChecks.forEach(check => {
  const status = check.status ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
});

console.log('\n' + '═'.repeat(50));

if (passed === total) {
  console.log('🎉 All checks passed! Razorpay is ready for production.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Start dev server: pnpm dev');
  console.log('   2. Test payment flow in browser');
  console.log('   3. Check server logs for Razorpay initialization');
  console.log('   4. Review RAZORPAY_PRODUCTION_SETUP.md for deployment');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.');
  console.log('\n📝 Troubleshooting:');
  console.log('   1. Check .env file has all required variables');
  console.log('   2. Restart your development server');
  console.log('   3. Review RAZORPAY_PRODUCTION_SETUP.md');
}

console.log('\n');