import { db } from "../../../prisma/db.js";

const addressFields = [
  "id",
  "label",
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "divisionId",
  "districtId",
  "upazilaId",
  "unionId",
  "division",
  "district",
  "upazila",
  "thana",
  "area",
  "postalCode",
  "countryCode",
  "isDefaultShipping",
  "isDefaultBilling",
  "createdAt",
  "updatedAt",
] as const;

export const addresses = (userId: number) =>
  db.orm.public.Address.select(...addressFields).where({ userId }).all();

export const address = (userId: number, id: number) =>
  db.orm.public.Address.select(...addressFields).first({ userId, id });

export const createAddress = (tx: any, userId: number, data: any) =>
  tx.orm.public.Address.select(...addressFields).create({ userId, ...data });

export const updateAddress = (tx: any, id: number, data: any) =>
  tx.orm.public.Address.where({ id }).select(...addressFields).update(data);

export const clearDefaults = (
  tx: any,
  userId: number,
  field: "isDefaultShipping" | "isDefaultBilling"
) => tx.orm.public.Address.where({ userId }).select("id").update({ [field]: false });

export const removeAddress = (tx: any, id: number) =>
  tx.orm.public.Address.where({ id }).delete();

export const zones = () =>
  db.orm.public.ShippingZone.select(
    "id",
    "name",
    "description",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
  )
    .orderBy([(z: any) => z.sortOrder.asc(), (z: any) => z.id.asc()])
    .all();

export const zone = (id: number) =>
  db.orm.public.ShippingZone.select(
    "id",
    "name",
    "description",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
  )
    .include("locations", (l: any) =>
      l.select("id", "zoneId", "divisionId", "districtId", "upazilaId", "unionId")
    )
    .first({ id });

export const createZone = (data: any) =>
  db.orm.public.ShippingZone.select(
    "id",
    "name",
    "description",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
  ).create(data);

export const updateZone = (id: number, data: any) =>
  db.orm.public.ShippingZone.where({ id })
    .select("id", "name", "description", "isActive", "sortOrder", "createdAt", "updatedAt")
    .update(data);

export const deleteZone = (id: number) =>
  db.orm.public.ShippingZone.where({ id }).delete();

// ── ShippingZoneLocation Mappings ──────────────────────────────────────────
export const locations = (zoneId: number) =>
  db.orm.public.ShippingZoneLocation.select(
    "id",
    "zoneId",
    "divisionId",
    "districtId",
    "upazilaId",
    "unionId",
    "createdAt",
    "updatedAt"
  )
    .where({ zoneId })
    .all();

export const location = (id: number) =>
  db.orm.public.ShippingZoneLocation.select(
    "id",
    "zoneId",
    "divisionId",
    "districtId",
    "upazilaId",
    "unionId"
  ).first({ id });

export const createLocation = (data: any) =>
  db.orm.public.ShippingZoneLocation.create(data);

export const updateLocation = (id: number, data: any) =>
  db.orm.public.ShippingZoneLocation.where({ id }).update(data);

export const deleteLocation = (id: number) =>
  db.orm.public.ShippingZoneLocation.where({ id }).delete();

export const allActiveLocations = () =>
  db.orm.public.ShippingZoneLocation.select(
    "id",
    "zoneId",
    "divisionId",
    "districtId",
    "upazilaId",
    "unionId"
  )
    .include("zone", (z: any) =>
      z.select("id", "name", "isActive", "sortOrder")
    )
    .all();

// ── Shipping Methods & Zone Methods ─────────────────────────────────────────
export const methods = () =>
  db.orm.public.ShippingMethod.select(
    "id",
    "name",
    "code",
    "description",
    "isActive",
    "sortOrder"
  )
    .orderBy([(m: any) => m.sortOrder.asc(), (m: any) => m.id.asc()])
    .all();

export const method = (id: number) =>
  db.orm.public.ShippingMethod.select(
    "id",
    "name",
    "code",
    "description",
    "isActive",
    "sortOrder"
  ).first({ id });

export const createMethod = (data: any) =>
  db.orm.public.ShippingMethod.create(data);

export const updateMethod = (id: number, data: any) =>
  db.orm.public.ShippingMethod.where({ id }).update(data);

export const deleteMethod = (id: number) =>
  db.orm.public.ShippingMethod.where({ id }).delete();

export const zoneOptions = (zoneId: number) =>
  db.orm.public.ShippingZoneMethod.select(
    "id",
    "zoneId",
    "methodId",
    "charge",
    "freeShippingThreshold",
    "estimatedMinDays",
    "estimatedMaxDays",
    "isActive",
    "sortOrder"
  )
    .where({ zoneId, isActive: true })
    .include("method", (m: any) =>
      m.select("id", "name", "code", "description", "isActive")
    )
    .orderBy([(x: any) => x.sortOrder.asc(), (x: any) => x.id.asc()])
    .all();

export const createZoneMethod = (data: any) =>
  db.orm.public.ShippingZoneMethod.create(data);

export const zoneMethods = (zoneId: number) =>
  db.orm.public.ShippingZoneMethod.select(
    "id",
    "zoneId",
    "methodId",
    "charge",
    "freeShippingThreshold",
    "estimatedMinDays",
    "estimatedMaxDays",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
  )
    .where({ zoneId })
    .include("method", (m: any) =>
      m.select("id", "name", "code", "description", "isActive")
    )
    .orderBy([(x: any) => x.sortOrder.asc(), (x: any) => x.id.asc()])
    .all();

export const zoneMethod = (id: number) =>
  db.orm.public.ShippingZoneMethod.select(
    "id",
    "zoneId",
    "methodId",
    "charge",
    "freeShippingThreshold",
    "estimatedMinDays",
    "estimatedMaxDays",
    "isActive",
    "sortOrder"
  ).first({ id });

export const updateZoneMethod = (id: number, data: any) =>
  db.orm.public.ShippingZoneMethod.where({ id }).update(data);

export const deleteZoneMethod = (id: number) =>
  db.orm.public.ShippingZoneMethod.where({ id }).delete();

