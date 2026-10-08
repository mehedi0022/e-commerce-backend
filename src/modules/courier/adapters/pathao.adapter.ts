import type { CourierAdapter } from "./courier.adapter.js";
import type {
  CourierProviderConfig,
  CourierBookingParams,
  CourierBookingResult,
  CourierTrackingResult,
} from "../courier.types.js";
import { ValidationError } from "../../../errors/AppError.js";

export class PathaoCourierAdapter implements CourierAdapter {
  readonly code = "pathao";
  readonly name = "Pathao Courier";

  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  private getBaseUrl(config: CourierProviderConfig): string {
    const raw = config.apiUrl?.trim();
    if (raw) {
      // Remove trailing slash
      return raw.replace(/\/+$/, "");
    }
    // If isLive is false, use Pathao Sandbox API endpoint
    if (!config.isLive) {
      return "https://courier-api-sandbox.pathao.com";
    }
    return "https://api-hermes.pathao.com";
  }

  private extractErrorMessage(data: any, res?: Response): string {
    if (!data && res) {
      return `HTTP ${res.status}: ${res.statusText || "Unknown error"}`;
    }
    if (typeof data === "string") return data;

    if (data.title && data.detail) {
      return `${data.title} - ${data.detail}`;
    }
    if (data.detail) return String(data.detail);
    if (data.message) {
      if (data.errors && typeof data.errors === "object") {
        const details = Object.entries(data.errors)
          .map(
            ([k, v]: [string, any]) =>
              `${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
          )
          .join("; ");
        return `${data.message} (${details})`;
      }
      return String(data.message);
    }
    if (data.error_description) return String(data.error_description);
    if (data.error)
      return typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error);
    if (data.errors) {
      if (typeof data.errors === "object") {
        return Object.entries(data.errors)
          .map(
            ([k, v]: [string, any]) =>
              `${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
          )
          .join("; ");
      }
      return JSON.stringify(data.errors);
    }

    if (res && !res.ok) {
      return `HTTP ${res.status} ${res.statusText || "Request failed"}`;
    }
    return "Unknown response from Pathao";
  }

  private async getAccessToken(config: CourierProviderConfig): Promise<string> {
    const settings = config.settings || {};
    const clientId = config.apiKey?.trim() || settings.clientId?.trim();
    const clientSecret =
      config.apiSecret?.trim() || settings.clientSecret?.trim();
    const username = settings.username?.trim();
    const password = settings.password?.trim();

    if (!clientId || !clientSecret || !username || !password) {
      throw new ValidationError(
        "Pathao Courier credentials (Client ID, Client Secret, Username, Password) are incomplete. Please check Courier Settings.",
      );
    }

    const baseUrl = this.getBaseUrl(config);

    const cacheKey = `${baseUrl}|${clientId}|${username}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
          grant_type: "password",
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (networkErr: any) {
      const isTimeout =
        networkErr.name === "TimeoutError" ||
        networkErr.message?.includes("aborted");
      throw new ValidationError(
        `Failed to reach Pathao endpoint (${baseUrl}). ${
          isTimeout
            ? "Connection timed out after 15 seconds. The Pathao server may be unreachable."
            : `Network error: ${networkErr.message}`
        }`,
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(
        `Pathao API returned an unparseable response (HTTP ${res.status} ${res.statusText}).`,
      );
    }

    if (res.ok && data.access_token) {
      const ttlSec = Number(data.expires_in) || 3600;
      this.tokenCache.set(cacheKey, {
        token: data.access_token,
        expiresAt: Date.now() + Math.max(ttlSec - 120, 60) * 1000,
      });
      return data.access_token;
    }

    const rawError = this.extractErrorMessage(data, res);

    if (
      res.status === 522 ||
      rawError.includes("522") ||
      rawError.toLowerCase().includes("timeout")
    ) {
      throw new ValidationError(
        `Pathao ${config.isLive ? "Live" : "Sandbox"} Server Unreachable (${baseUrl}): Origin connection timed out (Cloudflare 522). The sandbox server may be offline. If you registered on merchant.pathao.com, please switch "Live Production Mode" ON in Courier Settings.`,
      );
    }

    throw new ValidationError(
      `Pathao Authentication Failed (${config.isLive ? "Live" : "Sandbox"} - HTTP ${res.status}): ${rawError}`,
    );
  }

  async createOrder(
    config: CourierProviderConfig,
    params: CourierBookingParams,
  ): Promise<CourierBookingResult> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);
    const settings = config.settings || {};

    const { order, shippingAddress, customNote } = params;
    const codAmount = Math.max(0, Number(order.dueAmount ?? 0));

    const addressParts = [
      shippingAddress.addressLine1,
      shippingAddress.addressLine2,
      shippingAddress.area,
      shippingAddress.upazila || shippingAddress.thana,
      shippingAddress.district,
    ].filter(Boolean);

    const fullAddress = addressParts.join(", ");

    const note = [customNote, order.customerNote, order.itemsSummary]
      .filter(Boolean)
      .join(" | ");

    const storeId = Number(settings.storeId || 1);

    const payload = {
      store_id: storeId,
      merchant_order_id: order.orderNumber,
      recipient_name: shippingAddress.fullName || order.customerName,
      recipient_phone: shippingAddress.phone || order.customerPhone,
      recipient_address: fullAddress,
      recipient_city: Number(params.recipientCityId || settings.cityId || 1),
      recipient_zone: Number(params.recipientZoneId || settings.zoneId || 1),
      amount_to_collect: codAmount,
      item_type: 2, // 2 for parcel (1 is document)
      delivery_type: 48, // 48 for normal delivery
      item_quantity: order.itemCount || 1,
      item_weight: params.itemWeightKg || order.weightKg || 0.5,
      special_instruction: note.slice(0, 200),
    };

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
    } catch (networkErr: any) {
      const isTimeout =
        networkErr.name === "TimeoutError" ||
        networkErr.message?.includes("aborted");
      throw new ValidationError(
        `Failed to reach Pathao endpoint (${baseUrl}) to book parcel: ${
          isTimeout ? "Request timed out after 15 seconds." : networkErr.message
        }`,
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(
        `Pathao API returned invalid response (Status ${res.status}).`,
      );
    }

    if (data.type === "success" || data.data?.consignment_id) {
      const consignmentId = String(data.data.consignment_id);
      return {
        consignmentId,
        trackingCode: consignmentId,
        trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${consignmentId}`,
        courierName: this.name,
        status: data.data.order_status || "Pending",
        codAmount,
        rawResponse: data,
      };
    }

    const errorMsg = this.extractErrorMessage(data, res);
    throw new ValidationError(`Failed to book parcel on Pathao: ${errorMsg}`);
  }

  async checkStatus(
    config: CourierProviderConfig,
    trackingCodeOrId: string,
  ): Promise<CourierTrackingResult> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);

    let res: Response;
    try {
      res = await fetch(
        `${baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(trackingCodeOrId)}/info`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch (networkErr: any) {
      throw new ValidationError(
        `Failed to query Pathao tracking status: ${networkErr.message}`,
      );
    }

    const data = await res.json().catch(() => null);
    const orderData = data?.data || {};
    if (!res.ok || !orderData.order_status) {
      throw new ValidationError(
        `Pathao status lookup failed: ${this.extractErrorMessage(data, res)}`,
      );
    }
    const rawStatus = String(orderData.order_status);

    return {
      status: rawStatus.toUpperCase().replace(/\s+/g, "_"),
      rawStatus,
      courierName: this.name,
      trackingCode: trackingCodeOrId,
      consignmentId: orderData.consignment_id || trackingCodeOrId,
      rawResponse: data,
    };
  }

  async getStores(config: CourierProviderConfig): Promise<any[]> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/aladdin/api/v1/stores`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err: any) {
      throw new ValidationError(
        `Failed to fetch stores from Pathao: ${err.message}`,
      );
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ValidationError(
        `Failed to fetch stores: ${this.extractErrorMessage(data, res)}`,
      );
    }
    return data?.data?.data || [];
  }

  async getCities(config: CourierProviderConfig): Promise<any[]> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/aladdin/api/v1/countries/1/city-list`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err: any) {
      throw new ValidationError(
        `Failed to fetch cities from Pathao: ${err.message}`,
      );
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ValidationError(
        `Failed to fetch cities: ${this.extractErrorMessage(data, res)}`,
      );
    }
    return data?.data?.data || [];
  }

  async getZones(
    config: CourierProviderConfig,
    cityId: number,
  ): Promise<any[]> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);

    let res: Response;
    try {
      res = await fetch(
        `${baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch (err: any) {
      throw new ValidationError(
        `Failed to fetch zones from Pathao: ${err.message}`,
      );
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ValidationError(
        `Failed to fetch zones: ${this.extractErrorMessage(data, res)}`,
      );
    }
    return data?.data?.data || [];
  }
}
