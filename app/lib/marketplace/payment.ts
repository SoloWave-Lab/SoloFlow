import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_BASE_URL = process.env.RAZORPAY_BASE_URL ?? "https://api.razorpay.com/v1";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ Razorpay credentials are not configured. Marketplace payments will fail until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set."
  );
  console.error("Current RAZORPAY_KEY_ID:", RAZORPAY_KEY_ID ? "Set" : "Missing");
  console.error("Current RAZORPAY_KEY_SECRET:", RAZORPAY_KEY_SECRET ? "Set" : "Missing");
} else {
  console.log("✅ Razorpay credentials loaded successfully");
  console.log("🔑 Key ID:", RAZORPAY_KEY_ID?.substring(0, 15) + "...");
}

export type CreateRazorpayOrderInput = {
  amountCents: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
};

export type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
  created_at: number;
};

export type VerifyRazorpaySignatureInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

function getAuthHeader(): string {
  const credentials = `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput
): Promise<RazorpayOrderResponse> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials missing");
  }

  const body = {
    amount: input.amountCents,
    currency: input.currency ?? "INR",
    receipt: input.receipt,
    notes: input.notes,
    payment_capture: 1,
  };

  const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay order creation failed: ${response.status} ${errText}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

export function verifyRazorpaySignature(input: VerifyRazorpaySignatureInput): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay secret missing");
  }

  const payload = `${input.orderId}|${input.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");

  return expectedSignature === input.signature;
}