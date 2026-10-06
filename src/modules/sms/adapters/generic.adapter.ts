import type {
  SmsProviderConfig,
  SendSmsParams,
  SendSmsResult,
  CheckBalanceResult,
  SmsProviderAdapter,
} from "../sms.types.js";

/**
 * Generic / Custom HTTP SMS Gateway Adapter
 * Supports customizable JSON or Query string API for any SMS gateway in the world.
 */
export class GenericSmsAdapter implements SmsProviderAdapter {
  async sendSms(
    config: SmsProviderConfig,
    params: SendSmsParams
  ): Promise<SendSmsResult> {
    if (!config.apiUrl) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: "API URL is missing for generic SMS provider",
      };
    }

    try {
      // Replaces placeholders in URL or body: {to}, {message}, {apikey}, {senderid}
      let url = config.apiUrl
        .replace(/\{to\}/gi, encodeURIComponent(params.to))
        .replace(/\{message\}/gi, encodeURIComponent(params.message))
        .replace(/\{apiKey\}/gi, encodeURIComponent(config.apiKey || ""))
        .replace(/\{senderId\}/gi, encodeURIComponent(config.senderId || ""));

      const res = await fetch(url, {
        method: "GET",
      });

      const text = await res.text();
      const isSuccess = res.ok;

      return {
        success: isSuccess,
        status: isSuccess ? "SENT" : "FAILED",
        responsePayload: { status: res.status, body: text },
        errorMessage: isSuccess ? undefined : text,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  async checkBalance(): Promise<CheckBalanceResult> {
    return { balance: "N/A" };
  }
}
