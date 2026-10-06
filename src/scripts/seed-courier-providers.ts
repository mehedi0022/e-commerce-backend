import { db, closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Ensuring default Courier providers exist (Steadfast & Pathao)...");

  const providers = [
    {
      code: "steadfast",
      name: "Steadfast Courier (Leading BD E-commerce Logistics)",
      apiKey: "",
      apiSecret: "",
      apiUrl: "https://portal.steadfast.com.bd/api/v1",
      isActive: true,
      isDefault: true,
      isLive: false,
      settings: {
        note: "Auto-syncs order tracking and COD collection.",
      },
    },
    {
      code: "pathao",
      name: "Pathao Courier (On-demand Nationwide Delivery)",
      apiKey: "",
      apiSecret: "",
      apiUrl: "https://courier-api-bi.dpathao.com",
      isActive: false,
      isDefault: false,
      isLive: false,
      settings: {
        storeId: 1,
        cityId: 1,
        zoneId: 1,
        username: "",
        password: "",
      },
    },
  ];

  for (const p of providers) {
    const existing = await db.orm.public.CourierProviderConfig.first({ code: p.code });
    if (!existing) {
      await db.orm.public.CourierProviderConfig.create(p as any);
      console.log(`Created Courier Provider: ${p.name} (${p.code})`);
    } else {
      console.log(`Courier Provider already exists: ${p.code}`);
    }
  }

  console.log("Seeding courier providers completed successfully!");
}

main()
  .catch((err) => {
    console.error("Courier provider seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
