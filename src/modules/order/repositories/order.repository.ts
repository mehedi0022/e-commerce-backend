import { db } from "../../../prisma/db.js";
import { or } from "@prisma/orm-postgres/orm-client";
const fields = [
  "id",
  "orderNumber",
  "userId",
  "customerName",
  "customerEmail",
  "customerPhone",
  "status",
  "paymentMethod",
  "paymentStatus",
  "couponId",
  "couponCode",
  "subtotal",
  "shippingCharge",
  "discountAmount",
  "taxAmount",
  "grandTotal",
  "shippingZoneId",
  "shippingMethodId",
  "shippingZoneName",
  "shippingMethodName",
  "customerNote",
  "adminNote",
  "placedAt",
  "confirmedAt",
  "shippedAt",
  "deliveredAt",
  "cancelledAt",
  "guestAccessTokenHash",
  "guestAccessTokenExpiresAt",
  "createdAt",
  "updatedAt",
] as const;
const publicFields = fields.filter((x) => x !== "guestAccessTokenHash") as any;
const detail = (q: any) =>
  q
    .select(...publicFields)
    .include("items", (i: any) =>
      i
        .select(
          "id",
          "productId",
          "variantId",
          "productName",
          "productSlug",
          "sku",
          "quantity",
          "unitPrice",
          "lineTotal",
          "createdAt",
        )
        .include("product", (p: any) =>
          p
            .select("id", "name", "slug")
            .include("images", (img: any) =>
              img
                .select("id", "imageUrl", "isPrimary", "sortOrder")
                .orderBy((x: any) => x.sortOrder.asc()),
            ),
        )
        .include("attributes", (a: any) =>
          a.select("id", "attributeName", "attributeValue"),
        ),
    )
    .include("addresses", (a: any) =>
      a.select(
        "id",
        "type",
        "fullName",
        "phone",
        "addressLine1",
        "addressLine2",
        "division",
        "district",
        "upazila",
        "thana",
        "area",
        "postalCode",
        "countryCode",
      ),
    )
    .include("statusHistory", (h: any) =>
      h
        .select(
          "id",
          "fromStatus",
          "toStatus",
          "note",
          "changedById",
          "createdAt",
        )
        .orderBy((x: any) => x.createdAt.asc()),
    )
    .include("shipment", (s: any) =>
      s.select(
        "id",
        "status",
        "courierName",
        "trackingNumber",
        "trackingUrl",
        "shippedAt",
        "deliveredAt",
      ),
    );
export const findByNumber = (number: string) =>
  detail(db.orm.public.Order).first({ orderNumber: number });
export const findGuest = (number: string, hash: string) =>
  detail(db.orm.public.Order).first({
    orderNumber: number,
    guestAccessTokenHash: hash,
  });
export const create = (tx: any, data: any) =>
  tx.orm.public.Order.select(...fields).create(data);
export const item = (tx: any, data: any) =>
  tx.orm.public.OrderItem.create(data);
export const itemAttribute = (tx: any, data: any) =>
  tx.orm.public.OrderItemAttribute.create(data);
export const address = (tx: any, data: any) =>
  tx.orm.public.OrderAddress.create(data);
export const history = (tx: any, data: any) =>
  tx.orm.public.OrderStatusHistory.create(data);
export const couponUsage = (tx: any, data: any) =>
  tx.orm.public.CouponUsage.create(data);
export const update = (tx: any, id: number, data: any) =>
  tx.orm.public.Order.where({ id })
    .select(...fields)
    .update(data);
export const list = async (query: any) => {
  let filter: any = db.orm.public.Order;
  if (query.userId) filter = filter.where({ userId: query.userId });
  if (query.status) filter = filter.where({ status: query.status });
  if (query.paymentStatus) filter = filter.where({ paymentStatus: query.paymentStatus });

  if (query.search) {
    const term = String(query.search).trim();
    filter = filter.where((o: any) =>
      or(
        o.orderNumber.ilike(`%${term}%`),
        o.customerName.ilike(`%${term}%`),
        o.customerPhone.ilike(`%${term}%`),
        o.customerEmail.ilike(`%${term}%`),
      ),
    );
  } else if (query.orderNumber) {
    filter = filter.where((o: any) => o.orderNumber.ilike(`%${query.orderNumber}%`));
  }

  if (query.customerPhone) filter = filter.where({ customerPhone: query.customerPhone });
  if (query.customerEmail) filter = filter.where({ customerEmail: query.customerEmail });

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;

  const countPromise = filter.aggregate((a: any) => ({ total: a.count() }));

  const dataPromise = filter
    .select(...publicFields)
    .include("shipment", (s: any) =>
      s.select(
        "id",
        "status",
        "courierName",
        "trackingNumber",
        "trackingUrl",
        "shippedAt",
        "deliveredAt",
      ),
    )
    .include("items", (i: any) =>
      i
        .select(
          "id",
          "productId",
          "variantId",
          "productName",
          "productSlug",
          "sku",
          "quantity",
          "unitPrice",
          "lineTotal",
          "createdAt",
        )
        .include("product", (p: any) =>
          p
            .select("id", "name", "slug")
            .include("images", (img: any) =>
              img
                .select("id", "imageUrl", "isPrimary", "sortOrder")
                .orderBy((x: any) => x.sortOrder.asc()),
            ),
        ),
    )
    .orderBy((x: any) => x.createdAt.desc())
    .offset((page - 1) * limit)
    .limit(limit)
    .all();

  const [countRes, rows] = await Promise.all([countPromise, dataPromise]);

  return { rows, total: countRes?.total ?? rows.length };
};
