import { db } from "../../../prisma/db.js";
const itemFields = ["id", "cartId", "variantId", "quantity", "createdAt", "updatedAt"] as const;
const cartFields = ["id", "userId", "guestToken", "status", "expiresAt", "createdAt", "updatedAt"] as const;
const withItems = (q: any) => q.include("items", (i: any) => i
  .select(...itemFields)
  .include("variant", (v: any) => v
    .select("id", "productId", "sku", "price", "isActive")
    .include("product", (p: any) => p.select("id", "name", "slug", "status"))
    .include("inventory", (inv: any) => inv.select("id", "quantity", "reservedQuantity"))
    .include("attributeValues", (av: any) => av
      .include("attributeValue", (value: any) => value
        .select("id", "value")
        .include("attribute", (a: any) => a.select("id", "name"))))));
export const findUserCart = (userId: number) => withItems(db.orm.public.Cart.select(...cartFields)).first({ userId, status: "ACTIVE" });
export const findGuestCart = (guestToken: string) => withItems(db.orm.public.Cart.select(...cartFields)).first({ guestToken, status: "ACTIVE" });
export const create = (tx: any, data: Record<string, unknown>) => tx.orm.public.Cart.select(...cartFields).create(data);
export const createItem = (tx: any, cartId: number, variantId: number, quantity: number) => tx.orm.public.CartItem.select(...itemFields).create({ cartId, variantId, quantity });
export const findItem = (cartId: number, itemId: number) => db.orm.public.CartItem.select(...itemFields).first({ cartId, id: itemId });
export const findItemByVariant = (cartId: number, variantId: number) => db.orm.public.CartItem.select(...itemFields).first({ cartId, variantId });
export const updateItem = (tx: any, id: number, quantity: number) => tx.orm.public.CartItem.where({ id }).select(...itemFields).update({ quantity });
export const deleteItem = (tx: any, id: number) => tx.orm.public.CartItem.where({ id }).delete();
export const clearItems = async (tx: any, cartId: number) => { while (await tx.orm.public.CartItem.where({ cartId }).select("id").delete()) {} };
export const updateCart = (tx: any, id: number, data: Record<string, unknown>) => tx.orm.public.Cart.where({ id }).select(...cartFields).update(data);
export const findVariant = (variantId: number) => db.orm.public.ProductVariant.select("id", "isActive", "price").include("product", (p: any) => p.select("id", "status")).include("inventory", (i: any) => i.select("quantity", "reservedQuantity")).first({ id: variantId });
