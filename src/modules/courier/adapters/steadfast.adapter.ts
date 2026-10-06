import type { CourierAdapter } from "./courier.adapter.js";
import type {
  CourierProviderConfig,
  CourierBookingParams,
  CourierBookingResult,
  CourierTrackingResult,
  CourierBalanceResult,
} from "../courier.types.js";
import { ValidationError } from "../../../errors/AppError.js";

export class SteadfastCourierAdapter implements CourierAdapter {
  readonly code = "steadfast";
  readonly name = "Steadfast Courier";

  private getBaseUrl(apiUrl?: string | null): string {
    const raw = apiUrl?.trim();
    if (raw && !raw.includes("portal.steadfast.com.bd")) {
      return raw;
    }
    return "https://portal.packzy.com/api/v1";
  }

  private getHeaders(config: CourierProviderConfig): Record<string, string> {
    const apiKey = config.apiKey?.trim();
    const secretKey = config.apiSecret?.trim();

    if (!apiKey || !secretKey) {
      throw new ValidationError(
        "Steadfast Courier credentials (Api-Key and Secret-Key) are not configured."
      );
    }

    return {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
    };
  }

  async createOrder(
    config: CourierProviderConfig,
    params: CourierBookingParams
  ): Promise<CourierBookingResult> {
    const baseUrl = this.getBaseUrl(config.apiUrl);
    const headers = this.getHeaders(config);

    const { order, shippingAddress, customNote } = params;

    // COD collection amount: if paid in full or COD not applicable, cod_amount is 0; otherwise dueAmount
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

    const rawPhone = shippingAddress.phone || order.customerPhone || "";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("880") && cleanPhone.length === 13) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(-11);
    }

    const payload = {
      invoice: order.orderNumber,
      recipient_name: (shippingAddress.fullName || order.customerName).slice(0, 100),
      recipient_phone: cleanPhone,
      recipient_address: fullAddress.slice(0, 250),
      cod_amount: codAmount,
      note: note.slice(0, 250),
    };

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/create_order`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      throw new ValidationError(
        `Failed to reach Steadfast Courier endpoint (${baseUrl}). Network error: ${err.message}`
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(
        `Steadfast API returned invalid response (Status ${res.status}).`
      );
    }

    if (res.status === 401 || data.status === 401) {
      throw new ValidationError(
        `Steadfast Authentication Failed: ${data.message || "Invalid Api-Key or Secret-Key"}`
      );
    }

    if (data.status === 200 && data.consignment) {
      const c = data.consignment;
      const trackingCode = String(c.tracking_code || c.consignment_id);
      return {
        consignmentId: String(c.consignment_id),
        trackingCode,
        trackingUrl: `https://steadfast.com.bd/t/${trackingCode}`,
        courierName: this.name,
        status: c.status || "in_review",
        codAmount,
        rawResponse: data,
      };
    }

    let errorMsg = data.message || "Failed to create order on Steadfast Courier";
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
    const baseUrl = this.getBaseUrl(config.apiUrl);
    const headers = this.getHeaders(config);

    // Try status by tracking code or consignment id
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/status_by_trackingcode/${encodeURIComponent(trackingCodeOrId)}`, {
        headers,
      });
    } catch (err: any) {
      throw new ValidationError(
        `Failed to query Steadfast tracking status (${baseUrl}): ${err.message}`
      );
    }

    let data = await res.json().catch(() => null);

    if (data?.status === 200 && data?.delivery_status) {
      return {
        status: String(data.delivery_status).toUpperCase(),
        rawStatus: data.delivery_status,
        courierName: this.name,
        trackingCode: trackingCodeOrId,
        rawResponse: data,
      };
    }

    // Fallback: check by consignment id
    try {
      res = await fetch(`${baseUrl}/status_by_cid/${encodeURIComponent(trackingCodeOrId)}`, {
        headers,
      });
      data = await res.json().catch(() => null);
    } catch {
      // ignore
    }

    if (data?.status === 200 && data?.delivery_status) {
      return {
        status: String(data.delivery_status).toUpperCase(),
        rawStatus: data.delivery_status,
        courierName: this.name,
        trackingCode: trackingCodeOrId,
        rawResponse: data,
      };
    }

    throw new ValidationError(
      data?.message || `No tracking information found for code "${trackingCodeOrId}" on Steadfast`
    );
  }

  async checkBalance(config: CourierProviderConfig): Promise<CourierBalanceResult> {
    const baseUrl = this.getBaseUrl(config.apiUrl);
    const headers = this.getHeaders(config);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/get_balance`, { headers });
    } catch (err: any) {
      throw new ValidationError(
        `Failed to connect to Steadfast Courier (${baseUrl}). Network error: ${err.message}`
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ValidationError(`Invalid response from Steadfast API (Status ${res.status}).`);
    }

    if (res.status === 401 || data.status === 401) {
      throw new ValidationError(
        `Steadfast Authentication Failed: ${data.message || "Invalid Api-Key or Secret-Key"}`
      );
    }

    if (data.status === 200 && data.current_balance !== undefined) {
      return {
        balance: Number(data.current_balance),
        currency: "BDT",
        rawResponse: data,
      };
    }

    throw new ValidationError(data.message || "Failed to fetch Steadfast balance");
  }
}
