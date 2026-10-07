import { settingRepository } from "../repositories/setting.repository.js";
import {
  type InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
} from "../setting.types.js";

const INVOICE_SETTINGS_KEY = "invoice_settings";

export class SettingService {
  /**
   * Retrieves current store invoice and shipping label settings from the database.
   * If not yet customized in DB, returns defaults.
   */
  async getInvoiceSettings(): Promise<InvoiceSettings> {
    const record = await settingRepository.getByKey(INVOICE_SETTINGS_KEY);
    if (!record || !record.value) {
      return DEFAULT_INVOICE_SETTINGS;
    }

    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...record.value,
    };
  }

  /**
   * Updates store invoice and shipping label settings in the database.
   */
  async updateInvoiceSettings(
    data: Partial<InvoiceSettings>
  ): Promise<InvoiceSettings> {
    const current = await this.getInvoiceSettings();
    const merged: InvoiceSettings = {
      ...current,
      ...data,
    };

    await settingRepository.upsert(
      INVOICE_SETTINGS_KEY,
      merged,
      "Official invoice, VAT/BIN, and courier shipping label preferences"
    );

    return merged;
  }

  /**
   * Resets invoice settings in the database back to factory defaults.
   */
  async resetInvoiceSettings(): Promise<InvoiceSettings> {
    await settingRepository.upsert(
      INVOICE_SETTINGS_KEY,
      DEFAULT_INVOICE_SETTINGS,
      "Official invoice, VAT/BIN, and courier shipping label preferences"
    );

    return DEFAULT_INVOICE_SETTINGS;
  }
}

export const settingService = new SettingService();
