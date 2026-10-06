import type { PaymentMethodConfig } from "../payment.types.js";
import type {
  PaymentGatewayAdapter,
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyGatewayPaymentParams,
  VerifyGatewayPaymentResult,
} from "./gateway.adapter.js";
import { ValidationError } from "../../../errors/AppError.js";

export class BkashMerchantAdapter implements PaymentGatewayAdapter {
  private getApiUrl(isLive: boolean, path: string): string {
    const baseUrl = isLive
      ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
      : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    return `${baseUrl}${path}`;
  }

  private async grantToken(config: PaymentMethodConfig): Promise<string> {
    const creds = config.credentials || {};
    const { appKey, appSecret, username, password } = creds;

    if (!appKey || !appSecret || !username || !password) {
      throw new ValidationError("bKash Merchant credentials are incomplete");
    }

    const url = this.getApiUrl(config.isLive, "/tokenized/checkout/token/grant");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username,
        password,
      },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
      }),
    });

    const data = await res.json();
    if (!data.id_token) {
      throw new ValidationError(
        data.statusMessage || "Failed to grant bKash authorization token"
      );
    }
    return data.id_token;
  }

  async initiatePayment(
    config: PaymentMethodConfig,
    params: InitiatePaymentParams
  ): Promise<InitiatePaymentResult> {
    const creds = config.credentials || {};
    const appKey = creds.appKey;
    const token = await this.grantToken(config);

    const { order, callbackUrls } = params;
    const invoiceNumber = `${order.orderNumber}_${Date.now()}`;

    const url = this.getApiUrl(config.isLive, "/tokenized/checkout/create");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "X-APP-Key": appKey,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: order.customerPhone || "01700000000",
        callbackURL: callbackUrls.ipnUrl,
        amount: String(order.grandTotal),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoiceNumber,
      }),
    });

    const data = await res.json();

    if (data.statusCode === "0000" && data.bkashURL) {
      return {
        gatewayUrl: data.bkashURL,
        sessionKey: data.paymentID,
        transactionId: invoiceNumber,
        gatewayResponse: data,
      };
    }

    throw new ValidationError(
      data.statusMessage || "Failed to create bKash checkout session"
    );
  }

  async verifyPayment(
    config: PaymentMethodConfig,
    params: VerifyGatewayPaymentParams
  ): Promise<VerifyGatewayPaymentResult> {
    const creds = config.credentials || {};
    const appKey = creds.appKey;
    const paymentID = params.payload?.paymentID;

    if (!paymentID) {
      return {
        isValid: false,
        status: "REJECTED",
        amount: 0,
        transactionId: "",
        rawResponse: params.payload,
        message: "Missing paymentID from bKash callback",
      };
    }

    try {
      const token = await this.grantToken(config);
      const url = this.getApiUrl(config.isLive, "/tokenized/checkout/execute");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data = await res.json();
      const isValid = data.statusCode === "0000" && data.transactionStatus === "Completed";

      return {
        isValid,
        status: isValid ? "VERIFIED" : "REJECTED",
        amount: Number(data.amount || 0),
        transactionId: data.trxID || paymentID,
        rawResponse: data,
        message: data.statusMessage,
      };
    } catch (err: any) {
      return {
        isValid: false,
        status: "REJECTED",
        amount: 0,
        transactionId: paymentID,
        rawResponse: { error: err.message },
        message: err.message,
      };
    }
  }
}
