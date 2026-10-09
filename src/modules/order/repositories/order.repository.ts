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
  "advanceAmount",
  "dueAmount",
  "isAdvanceRequired",
  "isFreeShipping",
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
        )
        .include("returnItems", (ri: any) =>
          ri
            .select("id", "quantity", "reason", "restockStatus")
            .include("return", (r: any) =>
              r.select("id", "returnNumber", "status", "requestedAt"),
            ),
        ),
    )
    .include("returns", (ret: any) =>
      ret
        .select("id", "returnNumber", "status", "requestedAt", "createdAt")
        .orderBy((x: any) => x.createdAt.desc()),
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
        "courierCode",
        "consignmentId",
        "codAmount",
        "courierStatus",
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
  if (query.status && query.status !== "ALL") {
    if (query.status === "RETURNED") {
      const allShipments = await db.orm.public.Shipment.all();
      const allReturns = await db.orm.public.Return.all();
      const orderIds = Array.from(
        new Set([
          ...allShipments
            .filter((s: any) => s.status === "RETURNED")
            .map((s: any) => s.orderId),
          ...allReturns.map((r: any) => r.orderId),
        ].filter(Boolean)),
      );
      if (orderIds.length === 0) {
        filter = filter.where({ id: -1 });
      } else {
        filter = filter.where((o: any) => o.id.in(orderIds));
      }
    } else if (query.status === "READY_TO_SHIP") {
      const allShipments = await db.orm.public.Shipment.all();
      const orderIds = allShipments
        .filter((s: any) => s.status === "READY_TO_SHIP")
        .map((s: any) => s.orderId)
        .filter(Boolean);
      if (orderIds.length === 0) {
        filter = filter.where({ id: -1 });
      } else {
        filter = filter.where((o: any) => o.id.in(orderIds));
      }
    } else if (query.status === "CANCELLED") {
      const allShipments = await db.orm.public.Shipment.all();
      const allReturns = await db.orm.public.Return.all();
      const returnedOrderIds = new Set([
        ...allShipments
          .filter((s: any) => s.status === "RETURNED")
          .map((s: any) => s.orderId),
        ...allReturns.map((r: any) => r.orderId),
      ].filter(Boolean));
      const allCancelled = await db.orm.public.Order.where({ status: "CANCELLED" }).all();
      const pureCancelledIds = allCancelled
        .filter((o: any) => !returnedOrderIds.has(o.id))
        .map((o: any) => o.id);
      if (pureCancelledIds.length === 0) {
        filter = filter.where({ id: -1 });
      } else {
        filter = filter.where((o: any) => o.id.in(pureCancelledIds));
      }
    } else {
      filter = filter.where({ status: query.status });
    }
  }
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
        "courierCode",
        "consignmentId",
        "codAmount",
        "courierStatus",
        "trackingNumber",
        "trackingUrl",
        "shippedAt",
        "deliveredAt",
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
        )
        .include("returnItems", (ri: any) =>
          ri
            .select("id", "quantity", "reason", "restockStatus")
            .include("return", (r: any) =>
              r.select("id", "returnNumber", "status", "requestedAt"),
            ),
        ),
    )
    .include("returns", (ret: any) =>
      ret
        .select("id", "returnNumber", "status", "requestedAt", "createdAt")
        .orderBy((x: any) => x.createdAt.desc()),
    )
    .orderBy((x: any) => x.createdAt.desc())
    .offset((page - 1) * limit)
    .limit(limit)
    .all();

  const [countRes, rows] = await Promise.all([countPromise, dataPromise]);

  return { rows, total: countRes?.total ?? rows.length };
};

export const countByStatuses = async () => {
  const [
    all,
    pending,
    confirmed,
    processing,
    shipped,
    delivered,
    cancelledOrders,
    allShipments,
    allReturns,
  ] = await Promise.all([
    db.orm.public.Order.aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "PENDING" }).aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "CONFIRMED" }).aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "PROCESSING" }).aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "SHIPPED" }).aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "DELIVERED" }).aggregate((a: any) => ({ total: a.count() })),
    db.orm.public.Order.where({ status: "CANCELLED" }).all(),
    db.orm.public.Shipment.all(),
    db.orm.public.Return.all(),
  ]);

  const returnedOrderIds = new Set([
    ...allShipments
      .filter((s: any) => s.status === "RETURNED")
      .map((s: any) => s.orderId),
    ...allReturns.map((r: any) => r.orderId),
  ].filter(Boolean));

  const readyToShipOrderIds = new Set(
    allShipments
      .filter((s: any) => s.status === "READY_TO_SHIP")
      .map((s: any) => s.orderId)
      .filter(Boolean)
  );

  // Pure cancelled count = cancelled orders that are NOT in returned shipments / returns
  const pureCancelledCount = cancelledOrders.filter(
    (o: any) => !returnedOrderIds.has(o.id)
  ).length;

  return {
    ALL: all?.total ?? 0,
    PENDING: pending?.total ?? 0,
    CONFIRMED: confirmed?.total ?? 0,
    PROCESSING: processing?.total ?? 0,
    READY_TO_SHIP: readyToShipOrderIds.size,
    SHIPPED: shipped?.total ?? 0,
    DELIVERED: delivered?.total ?? 0,
    CANCELLED: pureCancelledCount,
    RETURNED: returnedOrderIds.size,
  };
};

