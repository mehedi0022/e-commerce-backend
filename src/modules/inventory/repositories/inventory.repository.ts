import { db } from "../../../prisma/db.js";
import type { MovementQuery } from "../inventory.types.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
const inventoryFields = ["id", "variantId", "quantity", "reservedQuantity", "lowStockThreshold", "createdAt", "updatedAt"] as const;
// Prisma 8 aggregate inference is widened through the dynamic query filters.
// The runtime returns a numeric count.
export const findVariant = (variantId: number) => db.orm.public.ProductVariant.select("id", "sku").first({ id: variantId });
export const find = (variantId: number) => db.orm.public.Inventory.select(...inventoryFields).first({ variantId });
export const create = (tx: any, variantId: number, quantity: number, lowStockThreshold: number) => tx.orm.public.Inventory.select(...inventoryFields).create({ variantId, quantity, reservedQuantity: 0, lowStockThreshold });
export const update = (tx: any, id: number, data: Record<string, unknown>) => tx.orm.public.Inventory.where({ id }).select(...inventoryFields).update(data);
export const reserveIfAvailable = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current || (current.quantity - current.reservedQuantity) < quantity) return null;
  return tx.orm.public.Inventory.where({ id }).where({ reservedQuantity: current.reservedQuantity }).select(...inventoryFields).update({ reservedQuantity: current.reservedQuantity + quantity });
};
export const releaseIfReserved = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current || current.reservedQuantity < quantity) return null;
  return tx.orm.public.Inventory.where({ id }).where({ reservedQuantity: current.reservedQuantity }).select(...inventoryFields).update({ reservedQuantity: current.reservedQuantity - quantity });
};
export const commitIfReserved = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current || current.quantity < quantity || current.reservedQuantity < quantity) return null;
  return tx.orm.public.Inventory.where({ id }).where({ reservedQuantity: current.reservedQuantity }).select(...inventoryFields).update({ quantity: current.quantity - quantity, reservedQuantity: current.reservedQuantity - quantity });
};
export const restockAtomic = async (tx: any, id: number, quantity: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current) return null;
  return tx.orm.public.Inventory.where({ id }).select(...inventoryFields).update({ quantity: current.quantity + quantity });
};
export const adjustQuantity = async (tx: any, id: number, delta: number, reserved: number) => {
  const current: any = await tx.orm.public.Inventory.select(...inventoryFields).first({ id });
  if (!current) return null;
  const newQty = current.quantity + delta;
  if (newQty < current.reservedQuantity || newQty < 0) return null;
  return tx.orm.public.Inventory.where({ id }).where({ quantity: current.quantity }).select(...inventoryFields).update({ quantity: newQty });
};
export const movement = (tx: any, inventoryId: number, data: Record<string, unknown>) => tx.orm.public.InventoryMovement.create({ inventoryId, ...data });

export const movements = async (variantId: number, query: MovementQuery) => {
  const inventory = await find(variantId);
  if (!inventory) return null;
  let q = db.orm.public.InventoryMovement.select("id", "inventoryId", "type", "quantity", "referenceType", "referenceId", "note", "createdAt").where({ inventoryId: inventory.id });
  if (query.type) q = q.where({ type: query.type });
  if (query.referenceType) q = q.where({ referenceType: query.referenceType });
  if (query.referenceId) q = q.where({ referenceId: query.referenceId });
  const [{ total }, rows] = await Promise.all([
    q.aggregate((a: any) => ({ total: a.count() })),
    q.orderBy((m: any) => query.sortOrder === "asc" ? m.createdAt.asc() : m.createdAt.desc()).offset(pageOffset(Number(query.page), Number(query.limit))).limit(Number(query.limit)).all()
  ]);
  return { rows, meta: paginationMeta(Number(query.page), Number(query.limit), Number(total)) };
};

export const updateThreshold = async (variantId: number, lowStockThreshold: number) => {
  const inv = await find(variantId);
  if (!inv) {
    return db.orm.public.Inventory.create({
      variantId,
      quantity: 0,
      reservedQuantity: 0,
      lowStockThreshold,
    });
  }
  return db.orm.public.Inventory.where({ id: inv.id }).update({ lowStockThreshold });
};

export const listInventory = async (query: { page?: number; limit?: number; search?: string; status?: string }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 20));

  const allVariants = await db.orm.public.ProductVariant
    .select("id", "productId", "sku", "price", "isActive", "createdAt", "updatedAt")
    .include("inventory", (i: any) =>
      i.select("id", "quantity", "reservedQuantity", "lowStockThreshold", "updatedAt")
    )
    .include("product", (p: any) =>
      p.select("id", "name", "slug", "status")
        .include("images", (img: any) => img.select("id", "imageUrl", "isPrimary", "sortOrder"))
    )
    .include("attributeValues", (v: any) =>
      v.include("attributeValue", (av: any) =>
        av.include("attribute", (a: any) => a.select("id", "name")).select("id", "value")
      )
    )
    .orderBy((v: any) => v.createdAt.desc())
    .all();

  let mapped = allVariants.map((v: any) => {
    const qty = Number(v.inventory?.quantity ?? 0);
    const reserved = Number(v.inventory?.reservedQuantity ?? 0);
    const lowThreshold = Number(v.inventory?.lowStockThreshold ?? 5);
    const available = qty - reserved;

    let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (available <= 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (available <= lowThreshold) {
      stockStatus = "LOW_STOCK";
    }

    const primaryImage =
      v.product?.images?.find((img: any) => img.isPrimary)?.imageUrl ||
      v.product?.images?.[0]?.imageUrl ||
      null;

    const attributes = (v.attributeValues || []).map((av: any) => ({
      name: av.attributeValue?.attribute?.name || "",
      value: av.attributeValue?.value || "",
    }));

    return {
      id: v.inventory?.id || null,
      variantId: v.id,
      productId: v.productId,
      productName: v.product?.name || "Product",
      productSlug: v.product?.slug || "",
      productImage: primaryImage,
      sku: v.sku,
      price: String(v.price),
      isActive: Boolean(v.isActive),
      attributes,
      quantity: qty,
      reservedQuantity: reserved,
      availableQuantity: available,
      lowStockThreshold: lowThreshold,
      status: stockStatus,
      updatedAt: v.inventory?.updatedAt || v.updatedAt,
    };
  });

  const summary = {
    totalVariants: mapped.length,
    inStockCount: mapped.filter((x: any) => x.status === "IN_STOCK").length,
    lowStockCount: mapped.filter((x: any) => x.status === "LOW_STOCK").length,
    outOfStockCount: mapped.filter((x: any) => x.status === "OUT_OF_STOCK").length,
    totalOnHand: mapped.reduce((acc: number, x: any) => acc + x.quantity, 0),
    totalReserved: mapped.reduce((acc: number, x: any) => acc + x.reservedQuantity, 0),
    totalAvailable: mapped.reduce((acc: number, x: any) => acc + x.availableQuantity, 0),
  };

  if (query.search) {
    const term = query.search.trim().toLowerCase();
    mapped = mapped.filter((x: any) =>
      x.productName.toLowerCase().includes(term) ||
      x.sku.toLowerCase().includes(term) ||
      x.attributes.some((a: any) => a.value.toLowerCase().includes(term))
    );
  }

  if (query.status && query.status !== "ALL") {
    mapped = mapped.filter((x: any) => x.status === query.status);
  }

  const total = mapped.length;
  const start = (page - 1) * limit;
  const paginatedItems = mapped.slice(start, start + limit);

  return {
    summary,
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const listGlobalMovements = async (query: {
  page?: number;
  limit?: number;
  type?: string;
  variantId?: number;
  search?: string;
}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 20));

  let mQuery: any = db.orm.public.InventoryMovement
    .select("id", "inventoryId", "type", "quantity", "referenceType", "referenceId", "note", "createdAt")
    .include("inventory", (inv: any) =>
      inv.select("id", "variantId")
        .include("variant", (v: any) =>
          v.select("id", "sku", "productId")
            .include("product", (p: any) => p.select("id", "name", "slug"))
            .include("attributeValues", (avs: any) =>
              avs.include("attributeValue", (av: any) =>
                av.include("attribute", (a: any) => a.select("id", "name")).select("id", "value")
              )
            )
        )
    );

  if (query.type) {
    mQuery = mQuery.where({ type: query.type });
  }

  const allMovements = await mQuery
    .orderBy((m: any) => m.createdAt.desc())
    .all();

  let mapped = allMovements.map((m: any) => {
    const v = m.inventory?.variant;
    const p = v?.product;
    const attrs = (v?.attributeValues || []).map((av: any) => `${av.attributeValue?.attribute?.name || ""}: ${av.attributeValue?.value || ""}`).join(", ");

    return {
      id: m.id,
      inventoryId: m.inventoryId,
      variantId: v?.id ?? null,
      productId: p?.id ?? null,
      productName: p?.name ?? "Product",
      productSlug: p?.slug ?? "",
      sku: v?.sku ?? "",
      variantName: attrs || v?.sku || "",
      type: m.type,
      quantity: m.quantity,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      note: m.note,
      createdAt: m.createdAt,
    };
  });

  if (query.variantId) {
    mapped = mapped.filter((m: any) => m.variantId === Number(query.variantId));
  }

  if (query.search) {
    const term = query.search.trim().toLowerCase();
    mapped = mapped.filter((m: any) =>
      m.productName.toLowerCase().includes(term) ||
      m.sku.toLowerCase().includes(term) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(term)) ||
      (m.note && m.note.toLowerCase().includes(term))
    );
  }

  const total = mapped.length;
  const start = (page - 1) * limit;
  const rows = mapped.slice(start, start + limit);

  return {
    rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};
