import type {
  SmsProviderConfig,
  SendSmsParams,
  SendSmsResult,
  CheckBalanceResult,
  SmsProviderAdapter,
} from "../sms.types.js";

/**
 * Greenweb BD SMS Gateway Adapter
 * API Docs: https://greenweb.com.bd/
 */
export class GreenwebSmsAdapter implements SmsProviderAdapter {
  private apiUrl = "http://api.greenweb.com.bd/api.php";

  async sendSms(
    config: SmsProviderConfig,
    params: SendSmsParams
  ): Promise<SendSmsResult> {
    if (!config.apiKey) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: "Greenweb SMS token (API Key) is not configured",
      };
    }

    try {
      const url = config.apiUrl || this.apiUrl;
      const postData = new URLSearchParams({
        token: config.apiKey,
        to: params.to.replace(/[^0-9]/g, ""),
        message: params.message,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: postData.toString(),
      });

      const responseText = await res.text();
      const isOk =
        responseText.toLowerCase().includes("ok") ||
        responseText.toLowerCase().includes("100") ||
        responseText.toLowerCase().includes("success");

      return {
        success: isOk,
        status: isOk ? "SENT" : "FAILED",
        responsePayload: { raw: responseText },
        errorMessage: isOk ? undefined : responseText,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  async checkBalance(config: SmsProviderConfig): Promise<CheckBalanceResult> {
    if (!config.apiKey) {
      return { balance: 0, rawResponse: "No token configured" };
    }

    try {
      const url = `http://api.greenweb.com.bd/g_api.php?token=${encodeURIComponent(
        config.apiKey
      )}&balance`;
      const res = await fetch(url);
      const text = await res.text();
      return { balance: text.trim(), rawResponse: text };
    } catch (err: any) {
      return { balance: 0, rawResponse: err.message };
    }
  }
}
