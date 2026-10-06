import { db, closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Seeding initial payment method configurations...");

  const existing = await db.orm.public.PaymentMethodConfig.all();
  if (existing.length > 0) {
    console.log(`Payment methods already seeded (${existing.length} methods found). Skipping.`);
    return;
  }

  const methods = [
    {
      code: "cod",
      name: "Cash on Delivery (COD)",
      type: "COD" as const,
      accountType: "PERSONAL" as const,
      instructions: "পণ্য হাতে পেয়ে ডেলিভারি ম্যানের কাছে নগদ মূল্য পরিশোধ করুন। অগ্রিম কোনো টাকা দিতে হবে না।",
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: true,
      sortOrder: 1,
    },
    {
      code: "bkash_manual",
      name: "bKash (Send Money)",
      type: "MANUAL_MFS" as const,
      accountType: "PERSONAL" as const,
      accountNumber: "01700000000",
      instructions: `১. আপনার bKash অ্যাপে লগইন করুন অথবা *247# ডায়াল করুন।
২. "Send Money" অপশনে যান।
৩. প্রাপক নম্বর হিসেবে উপরের নম্বরটি প্রদান করুন।
৪. মোট টাকার পরিমাণ দিন এবং রেফারেন্সে আপনার ফোন নম্বর বা অর্ডার কোড লিখুন।
৫. পেমেন্ট সফল হওয়ার পর প্রাপ্ত TrxID (Transaction ID) এবং যে নম্বর থেকে পাঠিয়েছেন তা নিচের বক্সে লিখুন।`,
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: true,
      sortOrder: 2,
    },
    {
      code: "nagad_manual",
      name: "Nagad (Send Money)",
      type: "MANUAL_MFS" as const,
      accountType: "PERSONAL" as const,
      accountNumber: "01800000000",
      instructions: `১. আপনার নগদ (Nagad) অ্যাপ ওপেন করুন অথবা *167# ডায়াল করুন।
২. "Send Money" নির্বাচন করুন।
৩. উপরের নগদ নম্বরটি লিখুন।
৪. অর্ডারের মোট বিলের পরিমাণ দিয়ে সেন্ড মানি নিশ্চিত করুন।
৫. ট্রানজেকশন সফল হলে স্ক্রিনে পাওয়া TrxID নিচে ইনপুট করুন।`,
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: true,
      sortOrder: 3,
    },
    {
      code: "rocket_manual",
      name: "Rocket (Send Money)",
      type: "MANUAL_MFS" as const,
      accountType: "PERSONAL" as const,
      accountNumber: "019000000009",
      instructions: `১. আপনার রকেট অ্যাপে প্রবেশ করুন অথবা *322# ডায়াল করুন।
২. Send Money নির্বাচন করে উপরের ১২ ডিজিটের একাউন্ট নম্বর দিন।
৩. পেমেন্ট সম্পন্ন করে প্রাপ্ত Transaction ID নিচে প্রদান করুন।`,
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: false,
      sortOrder: 4,
    },
    {
      code: "bank_manual",
      name: "Bank Direct Transfer",
      type: "MANUAL_BANK" as const,
      accountType: "MERCHANT" as const,
      bankName: "City Bank Limited",
      branchName: "Gulshan Branch, Dhaka",
      accountNumber: "1234567890123",
      routingNumber: "225271829",
      instructions: `ব্যাংক একাউন্টে টাকা পাঠানোর পর ডিপোজিট স্লিপ নম্বর বা রেফারেন্স আইডি নিচে উল্লেখ করুন।`,
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: false,
      sortOrder: 5,
    },
    {
      code: "sslcommerz",
      name: "SSLCommerz (Card / MFS / Internet Banking)",
      type: "AUTOMATED_GATEWAY" as const,
      accountType: "MERCHANT" as const,
      instructions: "Visa, Mastercard, Amex, bKash, Nagad এবং ইন্টারনেট ব্যাংকিং এর মাধ্যমে তাৎক্ষণিক সুরক্ষিত পেমেন্ট করুন।",
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: false,
      isLive: false,
      credentials: {
        storeId: "",
        storePassword: "",
      },
      sortOrder: 6,
    },
    {
      code: "bkash_gateway",
      name: "bKash Merchant Payment (Tokenized Gateway)",
      type: "AUTOMATED_GATEWAY" as const,
      accountType: "MERCHANT" as const,
      instructions: "bKash পেমেন্ট গেটওয়ের মাধ্যমে সরাসরি বিকাশ অ্যাকাউন্ট বা পিন দিয়ে তাৎক্ষণিক পেমেন্ট সম্পন্ন করুন।",
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: false,
      isLive: false,
      credentials: {
        appKey: "",
        appSecret: "",
        username: "",
        password: "",
      },
      sortOrder: 7,
    },
    {
      code: "stripe_gateway",
      name: "Stripe (International Cards / Apple Pay)",
      type: "AUTOMATED_GATEWAY" as const,
      accountType: "MERCHANT" as const,
      instructions: "Pay securely using any International Credit/Debit Card or Apple Pay via Stripe.",
      chargePercentage: 0,
      chargeFlat: 0,
      isActive: false,
      isLive: false,
      credentials: {
        publishableKey: "",
        secretKey: "",
      },
      sortOrder: 8,
    },
  ];

  for (const m of methods) {
    await db.orm.public.PaymentMethodConfig.create(m as any);
    console.log(`Created payment method: ${m.name} (${m.code})`);
  }

  console.log("Seeding payment methods completed successfully!");
}

main()
  .catch((err) => {
    console.error("Payment method seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
