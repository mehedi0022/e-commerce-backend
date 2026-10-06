import type { PaymentMethodConfig } from "../payment.types.js";
import type {
  PaymentGatewayAdapter,
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyGatewayPaymentParams,
  VerifyGatewayPaymentResult,
} from "./gateway.adapter.js";
import { ValidationError } from "../../../errors/AppError.js";

export class SSLCommerzAdapter implements PaymentGatewayAdapter {
  private getApiUrl(isLive: boolean, path: string): string {
    const baseUrl = isLive
      ? "https://securepay.sslcommerz.com"
      : "https://sandbox.sslcommerz.com";
    return `${baseUrl}${path}`;
  }

  async initiatePayment(
    config: PaymentMethodConfig,
    params: InitiatePaymentParams
  ): Promise<InitiatePaymentResult> {
    const creds = config.credentials || {};
    const storeId = creds.storeId;
    const storePassword = creds.storePassword;

    if (!storeId || !storePassword) {
      throw new ValidationError("SSLCommerz store credentials are not configured");
    }

    const { order, callbackUrls, shippingAddress } = params;

    const postData = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: String(order.payableAmount || order.grandTotal),
      currency: "BDT",
      tran_id: `${order.orderNumber}_${Date.now()}`,
      success_url: callbackUrls.successUrl,
      fail_url: callbackUrls.failUrl,
      cancel_url: callbackUrls.cancelUrl,
      ipn_url: callbackUrls.ipnUrl,
      cus_name: order.customerName || "Customer",
      cus_email: order.customerEmail || "customer@example.com",
      cus_add1: shippingAddress?.addressLine1 || "Dhaka, Bangladesh",
      cus_city: shippingAddress?.district || "Dhaka",
      cus_postcode: shippingAddress?.postalCode || "1000",
      cus_country: "Bangladesh",
      cus_phone: order.customerPhone || "01700000000",
      shipping_method: "NO",
      product_name: `Order ${order.orderNumber}`,
      product_category: "General",
      product_profile: "general",
    });

    try {
      const initUrl = this.getApiUrl(config.isLive, "/gwprocess/v4/api.php");
      const res = await fetch(initUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: postData.toString(),
      });

      const data = await res.json();

      if (data.status === "SUCCESS" && data.GatewayPageURL) {
        return {
          gatewayUrl: data.GatewayPageURL,
          sessionKey: data.sessionkey,
          transactionId: postData.get("tran_id") || undefined,
          gatewayResponse: data,
        };
      }

      // If credentials invalid in sandbox or SSLCommerz returns failed
      throw new ValidationError(
        data.failedreason || "Failed to initialize SSLCommerz payment session"
      );
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`SSLCommerz connection error: ${err.message}`);
    }
  }

  async verifyPayment(
    config: PaymentMethodConfig,
    params: VerifyGatewayPaymentParams
  ): Promise<VerifyGatewayPaymentResult> {
    const creds = config.credentials || {};
    const storeId = creds.storeId;
    const storePassword = creds.storePassword;

    if (!storeId || !storePassword) {
      throw new ValidationError("SSLCommerz store credentials are not configured");
    }

    const valId = params.payload?.val_id;
    if (!valId) {
      return {
        isValid: false,
        status: "REJECTED",
        amount: 0,
        transactionId: params.payload?.tran_id || "",
        rawResponse: params.payload,
        message: "Missing validation ID (val_id) from SSLCommerz callback",
      };
    }

    try {
      const validateUrl = `${this.getApiUrl(
        config.isLive,
        "/validator/api/validationserverAPI.php"
      )}?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;

      const res = await fetch(validateUrl);
      const data = await res.json();

      const isValid =
        data.status === "VALID" || data.status === "VALIDATED";

      return {
        isValid,
        status: isValid ? "VERIFIED" : "REJECTED",
        amount: Number(data.amount || 0),
        transactionId: data.tran_id || params.payload?.tran_id || "",
        rawResponse: data,
        message: data.status,
      };
    } catch (err: any) {
      return {
        isValid: false,
        status: "REJECTED",
        amount: 0,
        transactionId: params.payload?.tran_id || "",
        rawResponse: { error: err.message },
        message: err.message,
      };
    }
  }
}
