import { db, closeDatabase } from "../prisma/db.js";

async function main() {
  const existingZones = await db.orm.public.ShippingZone.all();
  if (existingZones.length > 0) {
    console.log("Shipping zones already exist:", existingZones.length);
    await closeDatabase();
    return;
  }

  console.log("Seeding shipping methods, zones, areas, and rates...");

  // 1. Create Shipping Methods
  const m1 = await db.orm.public.ShippingMethod.create({
    name: "Standard Delivery",
    code: "STANDARD",
    description: "Regular home delivery service (2-3 business days)",
    isActive: true,
    sortOrder: 1,
  });

  const m2 = await db.orm.public.ShippingMethod.create({
    name: "Express Delivery",
    code: "EXPRESS",
    description: "Priority express delivery (Next day)",
    isActive: true,
    sortOrder: 2,
  });

  // 2. Create Shipping Zones
  const z1 = await db.orm.public.ShippingZone.create({
    name: "Inside Dhaka",
    description: "Deliveries within Dhaka district",
    isActive: true,
    sortOrder: 1,
  });

  const z2 = await db.orm.public.ShippingZone.create({
    name: "Outside Dhaka (All Bangladesh)",
    description: "Deliveries across all other districts in Bangladesh",
    isActive: true,
    sortOrder: 2,
  });

  // 3. Create Areas
  await db.orm.public.ShippingZoneArea.create({
    zoneId: z1.id,
    countryCode: "BD",
    district: "Dhaka",
  });

  await db.orm.public.ShippingZoneArea.create({
    zoneId: z2.id,
    countryCode: "BD",
  });

  // 4. Link Zone Methods
  // Zone 1 (Inside Dhaka)
  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z1.id,
    methodId: m1.id,
    charge: "60.00",
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    isActive: true,
    sortOrder: 1,
  });

  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z1.id,
    methodId: m2.id,
    charge: "120.00",
    estimatedMinDays: 0,
    estimatedMaxDays: 1,
    isActive: true,
    sortOrder: 2,
  });

  // Zone 2 (Outside Dhaka)
  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z2.id,
    methodId: m1.id,
    charge: "120.00",
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    isActive: true,
    sortOrder: 1,
  });

  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z2.id,
    methodId: m2.id,
    charge: "200.00",
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    isActive: true,
    sortOrder: 2,
  });

  console.log("Seeded shipping successfully!");
  await closeDatabase();
}

main().catch((err) => {
  console.error("Error seeding shipping:", err);
  process.exit(1);
});

