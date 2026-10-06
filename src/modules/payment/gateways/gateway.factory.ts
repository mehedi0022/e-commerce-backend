import type { PaymentMethodConfig } from "../payment.types.js";
import type { PaymentGatewayAdapter } from "./gateway.adapter.js";
import { SSLCommerzAdapter } from "./sslcommerz.adapter.js";
import { BkashMerchantAdapter } from "./bkash.adapter.js";
import { ValidationError } from "../../../errors/AppError.js";

const sslcommerzAdapter = new SSLCommerzAdapter();
const bkashAdapter = new BkashMerchantAdapter();

export const getPaymentAdapter = (config: PaymentMethodConfig): PaymentGatewayAdapter => {
  const code = config.code.toLowerCase();

  if (code === "sslcommerz") {
    return sslcommerzAdapter;
  }

  if (code.includes("bkash")) {
    return bkashAdapter;
  }

  throw new ValidationError(`No automated gateway adapter found for "${config.code}"`);
};
