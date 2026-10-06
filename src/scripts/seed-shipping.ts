import { db, closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Seeding structured shipping methods, zones, locations, and rates...");

  // Clear existing shipping data to ensure clean structured state
  await db.orm.public.ShippingZoneLocation.all().then(async (locs: any[]) => {
    for (const l of locs) await db.orm.public.ShippingZoneLocation.where({ id: l.id }).delete();
  });
  await db.orm.public.ShippingZoneMethod.all().then(async (zm: any[]) => {
    for (const m of zm) await db.orm.public.ShippingZoneMethod.where({ id: m.id }).delete();
  });
  await db.orm.public.ShippingZone.all().then(async (zones: any[]) => {
    for (const z of zones) await db.orm.public.ShippingZone.where({ id: z.id }).delete();
  });
  await db.orm.public.ShippingMethod.all().then(async (methods: any[]) => {
    for (const m of methods) await db.orm.public.ShippingMethod.where({ id: m.id }).delete();
  });

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
  // Zone 1: Inside Dhaka District (District ID '47', Division ID '6')
  const z1 = await db.orm.public.ShippingZone.create({
    name: "Inside Dhaka",
    description: "Deliveries within Dhaka district",
    isActive: true,
    sortOrder: 1,
  });

  // Zone 2: Outside Dhaka (All Bangladesh fallback)
  const z2 = await db.orm.public.ShippingZone.create({
    name: "Outside Dhaka (All Bangladesh)",
    description: "Deliveries across all other districts in Bangladesh",
    isActive: true,
    sortOrder: 2,
  });

  // Zone 3: Nabinagar Special Zone (Upazila ID '30', District ID '3', Division ID '1')
  // Demonstrating the user prompt's exact hierarchical override example!
  const z3 = await db.orm.public.ShippingZone.create({
    name: "Nabinagar Special Zone",
    description: "Deliveries within Nabinagar Upazila (Brahmanbaria)",
    isActive: true,
    sortOrder: 3,
  });

  // 3. Create ShippingZoneLocation Mappings (Deterministic IDs from Bangladesh Dataset)
  // Zone 1: Dhaka District
  await db.orm.public.ShippingZoneLocation.create({
    zoneId: z1.id,
    divisionId: "6",
    districtId: "47",
    upazilaId: null,
    unionId: null,
  });

  // Zone 2: Nationwide Fallback (All null)
  await db.orm.public.ShippingZoneLocation.create({
    zoneId: z2.id,
    divisionId: null,
    districtId: null,
    upazilaId: null,
    unionId: null,
  });

  // Zone 3: Nabinagar Upazila
  await db.orm.public.ShippingZoneLocation.create({
    zoneId: z3.id,
    divisionId: "1",
    districtId: "3",
    upazilaId: "30",
    unionId: null,
  });

  // 4. Link Zone Methods & Rates
  // Zone 1 (Inside Dhaka)
  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z1.id,
    methodId: m1.id,
    charge: "60.00" as any,
    freeShippingThreshold: "2000.00" as any,
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    isActive: true,
    sortOrder: 1,
  });

  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z1.id,
    methodId: m2.id,
    charge: "120.00" as any,
    freeShippingThreshold: null,
    estimatedMinDays: 0,
    estimatedMaxDays: 1,
    isActive: true,
    sortOrder: 2,
  });

  // Zone 2 (Outside Dhaka)
  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z2.id,
    methodId: m1.id,
    charge: "120.00" as any,
    freeShippingThreshold: "3000.00" as any,
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    isActive: true,
    sortOrder: 1,
  });

  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z2.id,
    methodId: m2.id,
    charge: "200.00" as any,
    freeShippingThreshold: null,
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    isActive: true,
    sortOrder: 2,
  });

  // Zone 3 (Nabinagar Zone - as per prompt: ৳80 Standard, ৳120 Express)
  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z3.id,
    methodId: m1.id,
    charge: "80.00" as any,
    freeShippingThreshold: "1500.00" as any,
    estimatedMinDays: 1,
    estimatedMaxDays: 2,
    isActive: true,
    sortOrder: 1,
  });

  await db.orm.public.ShippingZoneMethod.create({
    zoneId: z3.id,
    methodId: m2.id,
    charge: "120.00" as any,
    freeShippingThreshold: null,
    estimatedMinDays: 0,
    estimatedMaxDays: 1,
    isActive: true,
    sortOrder: 2,
  });

  console.log("Seeded structured shipping successfully!");
  await closeDatabase();
}

main().catch((err) => {
  console.error("Error seeding shipping:", err);
  process.exit(1);
});
