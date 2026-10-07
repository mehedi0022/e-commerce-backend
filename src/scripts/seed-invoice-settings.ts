import { settingRepository } from "../modules/setting/repositories/setting.repository.js";
import { DEFAULT_INVOICE_SETTINGS } from "../modules/setting/setting.types.js";
import { closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Seeding Store & Invoice Settings into PostgreSQL database...");

  try {
    // 1. Ensure table exists
    await settingRepository.ensureTable();

    // 2. Check if invoice_settings already exist
    const existing = await settingRepository.getByKey("invoice_settings");
    if (existing) {
      console.log("Store invoice settings already exist in DB. Current config:", {
        storeName: existing.value.storeName,
        supportPhone: existing.value.supportPhone,
        supportEmail: existing.value.supportEmail,
        binNumber: existing.value.binNumber,
      });
      console.log("Seeding skipped to preserve existing customizations.");
    } else {
      // 3. Insert default settings
      const created = await settingRepository.upsert(
        "invoice_settings",
        DEFAULT_INVOICE_SETTINGS,
        "Official invoice, VAT/BIN, and courier shipping label preferences"
      );

      console.log("Successfully seeded default invoice settings to PostgreSQL DB!");
      console.log("Record ID:", created.id);
      console.log("Store Name:", created.value.storeName);
      console.log("Helpline:", created.value.supportPhone);
      console.log("Address:", created.value.storeAddress);
    }
  } catch (err) {
    console.error("Error seeding invoice settings:", err);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
