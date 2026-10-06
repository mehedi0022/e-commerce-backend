import type {
  SmsProviderConfig,
  SendSmsParams,
  SendSmsResult,
  CheckBalanceResult,
  SmsProviderAdapter,
} from "../sms.types.js";

/**
 * BulksmsBD Gateway Adapter
 * API Docs: http://bulksmsbd.net/
 */
export class BulksmsBdAdapter implements SmsProviderAdapter {
  private apiUrl = "http://bulksmsbd.net/api/smsapi";

  async sendSms(
    config: SmsProviderConfig,
    params: SendSmsParams
  ): Promise<SendSmsResult> {
    if (!config.apiKey || !config.senderId) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: "BulksmsBD API Key or Sender ID is missing",
      };
    }

    try {
      const url = config.apiUrl || this.apiUrl;
      const postData = new URLSearchParams({
        api_key: config.apiKey,
        senderid: config.senderId,
        number: params.to.replace(/[^0-9]/g, ""),
        message: params.message,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: postData.toString(),
      });

      const data = await res.json().catch(async () => ({ raw: await res.text() }));
      const isSuccess = data?.response_code === 202 || data?.success === true;

      return {
        success: isSuccess,
        status: isSuccess ? "SENT" : "FAILED",
        responsePayload: data,
        errorMessage: isSuccess ? undefined : data?.error_message || "Failed to send SMS",
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
    if (!config.apiKey) return { balance: 0 };
    try {
      const url = `http://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(
        config.apiKey
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      return { balance: data?.balance || 0, rawResponse: data };
    } catch (err: any) {
      return { balance: 0, rawResponse: err.message };
    }
  }
}
