import { db } from "../prisma/db.js";

async function main() {
  const rows = await db.orm.public.LandingPage.select("id", "title", "slug", "isPublished", "productId").all();
  console.log("LANDING_PAGES_COUNT:", rows.length);
  console.log("LANDING_PAGES:", JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
