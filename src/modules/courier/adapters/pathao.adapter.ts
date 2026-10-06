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

  private getBaseUrl(config: CourierProviderConfig): string {
    const raw = config.apiUrl?.trim();
    if (raw && !raw.includes("dpathao.com") && !raw.includes("courier-api-bi.pathao.com")) {
      return raw;
    }
    return "https://api-hermes.pathao.com";
  }

  private async getAccessToken(config: CourierProviderConfig): Promise<string> {
    const settings = config.settings || {};
    const clientId = config.apiKey?.trim() || settings.clientId?.trim();
    const clientSecret = config.apiSecret?.trim() || settings.clientSecret?.trim();
    const username = settings.username?.trim();
    const password = settings.password?.trim();

    if (!clientId || !clientSecret || !username || !password) {
      throw new ValidationError(
        "Pathao Courier credentials (Client ID, Client Secret, Username, Password) are incomplete."
      );
    }

    const baseUrl = this.getBaseUrl(config);

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
      });
    } catch (networkErr: any) {
      throw new ValidationError(
        `Failed to reach Pathao Courier endpoint (${baseUrl}). Network error: ${networkErr.message}`
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(`Pathao API returned invalid response (Status ${res.status}).`);
    }

    if (data.access_token) {
      return data.access_token;
    }

    throw new ValidationError(
      `Pathao Authentication Failed: ${data.message || data.error_description || "Invalid credentials."}`
    );
  }

  async createOrder(
    config: CourierProviderConfig,
    params: CourierBookingParams
  ): Promise<CourierBookingResult> {
    const token = await this.getAccessToken(config);
    const baseUrl = this.getBaseUrl(config);
    const settings = config.settings || {};

    const { order, shippingAddress, customNote } = params;
    const codAmount = Math.max(0, Number(order.dueAmount ?? order.grandTotal ?? 0));

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
      recipient_city: Number(settings.cityId || 1),
      recipient_zone: Number(settings.zoneId || 1),
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
      });
    } catch (networkErr: any) {
      throw new ValidationError(
        `Failed to reach Pathao endpoint (${baseUrl}) to book parcel: ${networkErr.message}`
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(`Pathao API returned invalid response (Status ${res.status}).`);
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

    let errorMsg = data.message || "Failed to create order on Pathao Courier";
    if (data.errors && typeof data.errors === "object") {
      const details = Object.entries(data.errors)
        .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
        .join("; ");
      errorMsg = `${errorMsg}: ${details}`;
    }

    throw new ValidationError(errorMsg);
  }

  async checkStatus(
    config: CourierProviderConfig,
    trackingCodeOrId: string
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
        }
      );
    } catch (networkErr: any) {
      throw new ValidationError(`Failed to query Pathao tracking status: ${networkErr.message}`);
    }

    const data = await res.json().catch(() => null);
    const orderData = data?.data || {};
    const rawStatus = String(orderData.order_status || "unknown");

    let standardStatus = "IN_TRANSIT";
    const s = rawStatus.toLowerCase();
    if (s.includes("delivered")) standardStatus = "DELIVERED";
    else if (s.includes("cancel") || s.includes("return")) standardStatus = "RETURNED";
    else if (s.includes("pending")) standardStatus = "PENDING";
    else if (s.includes("hold") || s.includes("fail")) standardStatus = "FAILED";

    return {
      status: standardStatus,
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
      });
    } catch (err: any) {
      throw new ValidationError(`Failed to fetch stores from Pathao: ${err.message}`);
    }

    const data = await res.json().catch(() => null);
    return data?.data?.data || [];
  }
}
