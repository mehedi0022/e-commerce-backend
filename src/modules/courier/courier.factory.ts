import type { CourierAdapter } from "./adapters/courier.adapter.js";
import { SteadfastCourierAdapter } from "./adapters/steadfast.adapter.js";
import { PathaoCourierAdapter } from "./adapters/pathao.adapter.js";
import { ValidationError } from "../../errors/AppError.js";

const steadfastAdapter = new SteadfastCourierAdapter();
const pathaoAdapter = new PathaoCourierAdapter();

const adapterMap: Record<string, CourierAdapter> = {
  steadfast: steadfastAdapter,
  pathao: pathaoAdapter,
};

export const getCourierAdapter = (code: string): CourierAdapter => {
  const normalized = code.toLowerCase().trim();
  const adapter = adapterMap[normalized];

  if (!adapter) {
    throw new ValidationError(
      `No courier adapter implemented for provider code "${code}". Available providers: ${Object.keys(
        adapterMap
      ).join(", ")}`
    );
  }

  return adapter;
};

export const registerCourierAdapter = (adapter: CourierAdapter) => {
  adapterMap[adapter.code.toLowerCase()] = adapter;
};
