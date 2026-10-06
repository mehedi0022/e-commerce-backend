import type { SmsProviderConfig, SmsProviderAdapter } from "./sms.types.js";
import { GreenwebSmsAdapter } from "./adapters/greenweb.adapter.js";
import { BulksmsBdAdapter } from "./adapters/bulksmsbd.adapter.js";
import { GenericSmsAdapter } from "./adapters/generic.adapter.js";

const greenwebAdapter = new GreenwebSmsAdapter();
const bulksmsBdAdapter = new BulksmsBdAdapter();
const genericAdapter = new GenericSmsAdapter();

export const getSmsAdapter = (config: SmsProviderConfig): SmsProviderAdapter => {
  const code = config.code.toLowerCase();

  if (code.includes("greenweb")) {
    return greenwebAdapter;
  }

  if (code.includes("bulksmsbd")) {
    return bulksmsBdAdapter;
  }

  return genericAdapter;
};
