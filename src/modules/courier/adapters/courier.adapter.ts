import type {
  CourierProviderConfig,
  CourierBookingParams,
  CourierBookingResult,
  CourierTrackingResult,
  CourierBalanceResult,
} from "../courier.types.js";

export interface CourierAdapter {
  readonly code: string;
  readonly name: string;

  createOrder(
    config: CourierProviderConfig,
    params: CourierBookingParams,
  ): Promise<CourierBookingResult>;

  checkStatus(
    config: CourierProviderConfig,
    trackingCodeOrId: string,
  ): Promise<CourierTrackingResult>;

  checkBalance?(
    config: CourierProviderConfig,
  ): Promise<CourierBalanceResult>;

  getStores?(
    config: CourierProviderConfig,
  ): Promise<any[]>;

  getCities?(
    config: CourierProviderConfig,
  ): Promise<any[]>;

  getZones?(
    config: CourierProviderConfig,
    cityId: number,
  ): Promise<any[]>;
}
