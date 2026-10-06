import { db, closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Seeding default SMS providers and notification templates...");

  // 1. Seed SMS Providers (Greenweb, BulksmsBD, Generic)
  const existingProviders = await db.orm.public.SmsProviderConfig.all();
  if (existingProviders.length === 0) {
    const providers = [
      {
        code: "greenweb",
        name: "Greenweb BD (Leading BD Gateway)",
        senderId: "",
        apiKey: "",
        apiUrl: "http://api.greenweb.com.bd/api.php",
        isActive: false,
        isDefault: false,
      },
      {
        code: "bulksmsbd",
        name: "BulksmsBD (Fast Masking & Non-Masking)",
        senderId: "",
        apiKey: "",
        apiUrl: "http://bulksmsbd.net/api/smsapi",
        isActive: false,
        isDefault: false,
      },
      {
        code: "custom_http",
        name: "Custom / Generic HTTP SMS Gateway",
        senderId: "",
        apiKey: "",
        apiUrl: "https://api.sms-provider.com/send?to={to}&message={message}&api_key={apiKey}",
        isActive: false,
        isDefault: false,
      },
    ];

    for (const p of providers) {
      await db.orm.public.SmsProviderConfig.create(p as any);
      console.log(`Created SMS Provider: ${p.name}`);
    }
  } else {
    console.log(`Found ${existingProviders.length} SMS providers. Skipping.`);
  }

  // 2. Seed Notification Templates
  const existingTemplates = await db.orm.public.NotificationTemplate.all();
  if (existingTemplates.length === 0) {
    const templates = [
      {
        event: "ORDER_PLACED",
        name: "Order Placed / Confirmation",
        smsEnabled: true,
        smsTemplate:
          "প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} সফলভাবে গৃহীত হয়েছে! মোট বিল: ৳{grandTotal}। অর্ডার ট্র্যাক করুন: {trackingUrl}",
        emailEnabled: true,
        emailSubject: "আপনার অর্ডার #{orderNumber} সফলভাবে নিশ্চিত হয়েছে",
        availableVars: "{customerName}, {orderNumber}, {grandTotal}, {paymentMethod}, {trackingUrl}",
      },
      {
        event: "PAYMENT_VERIFIED",
        name: "Payment Verified / Paid",
        smsEnabled: true,
        smsTemplate:
          "প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} এর পেমেন্ট (TrxID: {trxId}) সফলভাবে অনুমোদিত হয়েছে! ধন্যবাদ।",
        emailEnabled: true,
        emailSubject: "পেমেন্ট নিশ্চিতকরণ - অর্ডার #{orderNumber}",
        availableVars: "{customerName}, {orderNumber}, {trxId}, {amount}",
      },
      {
        event: "ORDER_SHIPPED",
        name: "Order Shipped / Courier Booked",
        smsEnabled: true,
        smsTemplate:
          "প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} পার্সেলটি {courierName} এ পাঠানো হয়েছে। ট্র্যাকিং আইডি: {courierTrackingNumber}।",
        emailEnabled: true,
        emailSubject: "আপনার অর্ডার #{orderNumber} শিপিং করা হয়েছে",
        availableVars: "{customerName}, {orderNumber}, {courierName}, {courierTrackingNumber}, {courierTrackingUrl}",
      },
      {
        event: "ORDER_DELIVERED",
        name: "Order Delivered Successfully",
        smsEnabled: true,
        smsTemplate:
          "প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} সফলভাবে ডেলিভারি করা হয়েছে। আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!",
        emailEnabled: true,
        emailSubject: "অর্ডার ডেলিভারি নিশ্চিতকরণ - #{orderNumber}",
        availableVars: "{customerName}, {orderNumber}",
      },
    ];

    for (const t of templates) {
      await db.orm.public.NotificationTemplate.create(t as any);
      console.log(`Created Notification Template: ${t.name}`);
    }
  } else {
    console.log(`Found ${existingTemplates.length} notification templates. Skipping.`);
  }

  console.log("Seeding notification system completed!");
}

main()
  .catch((err) => {
    console.error("Failed to seed notification system:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
