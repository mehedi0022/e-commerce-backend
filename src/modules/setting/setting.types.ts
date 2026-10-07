export type ShippingLabelSize = "A4" | "4x6" | "80mm";

export interface InvoiceSettings {
  storeName: string;
  storeTagline: string;
  logoUrl?: string;
  binNumber: string;

  storeAddress: string;
  supportPhone: string;
  supportEmail: string;
  websiteUrl: string;

  termsAndConditions: string;
  footerNote: string;
  showCustomerSignature: boolean;
  showAuthorizedSignature: boolean;

  defaultLabelSize: ShippingLabelSize;
  defaultDispatchNote: string;
  showMerchantReturn: boolean;
  showItemsSummary: boolean;
  showBarcodes: boolean;
}

export interface StoreSettingRecord {
  id: number;
  key: string;
  value: any;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  storeName: "NEXTGEN STORE",
  storeTagline: "Official Order Invoice & Delivery Packing Slip",
  logoUrl: "",
  binNumber: "002948192-0102",

  storeAddress: "House #12, Road #4, Dhanmondi, Dhaka - 1205, Bangladesh",
  supportPhone: "+880 1876-346433",
  supportEmail: "support@nextgen-shop.com",
  websiteUrl: "www.nextgen-shop.com",

  termsAndConditions: `1. Please inspect the parcel and verify all items in front of the delivery agent.
2. If any discrepancy or damaged product is found, please notify customer support within 24 hours.
3. Retain this invoice copy for warranty claims and hassle-free exchange.`,
  footerNote: "This is a computer-generated tax invoice and packing slip. No physical stamp required.",
  showCustomerSignature: true,
  showAuthorizedSignature: true,

  defaultLabelSize: "A4",
  defaultDispatchNote: "FRAGILE - HANDLE WITH CARE",
  showMerchantReturn: true,
  showItemsSummary: true,
  showBarcodes: true,
};
