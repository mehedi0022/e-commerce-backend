import { db } from "../../../prisma/db.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/AppError.js";
import * as repo from "../repositories/shipping.repository.js";
import { normalizeCode } from "../shipping.util.js";
import {
  validateLocationHierarchy,
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnions,
  getDivisionById,
  getDistrictById,
  getUpazilaById,
  getUnionById,
} from "../../../utils/location.util.js";

// ── Address Operations ───────────────────────────────────────────────────────
export const listAddresses = (userId: number) => repo.addresses(userId);

export const getAddress = async (userId: number, id: number) => {
  const x = await repo.address(userId, id);
  if (!x) throw new NotFoundError("Address not found");
  return x;
};

const resolveAddressLocation = (data: any) => {
  let divisionId = data.divisionId ? String(data.divisionId).trim() : null;
  let districtId = data.districtId ? String(data.districtId).trim() : null;
  let upazilaId = data.upazilaId ? String(data.upazilaId).trim() : null;
  let unionId = data.unionId ? String(data.unionId).trim() : null;

  // If IDs were not provided, attempt to match from text names as fallback
  if (!districtId && data.district) {
    const dName = String(data.district).trim().toLowerCase();
    const matchedDist = getDistricts().find(
      (d) => d.name.toLowerCase() === dName || d.bn_name === dName
    );
    if (matchedDist) {
      districtId = String(matchedDist.id);
      divisionId = String(matchedDist.division_id);
    }
  }

  if (districtId && !upazilaId && (data.upazila || data.thana)) {
    const uName = String(data.upazila || data.thana).trim().toLowerCase();
    const matchedUpz = getUpazilas(districtId).find(
      (u) => u.name.toLowerCase() === uName || u.bn_name === uName
    );
    if (matchedUpz) {
      upazilaId = String(matchedUpz.id);
    }
  }

  if (upazilaId && !unionId && data.area) {
    const unName = String(data.area).trim().toLowerCase();
    const matchedUnion = getUnions(upazilaId).find(
      (u) => u.name.toLowerCase() === unName || u.bn_name === unName
    );
    if (matchedUnion) {
      unionId = String(matchedUnion.id);
    }
  }

  // Validate hierarchy if districtId is available
  if (districtId) {
    const validated = validateLocationHierarchy({
      divisionId,
      districtId,
      upazilaId,
      unionId,
    });
    return {
      divisionId: validated.divisionId,
      districtId: validated.districtId,
      upazilaId: validated.upazilaId,
      unionId: validated.unionId,
      division: validated.divisionName ?? data.division ?? null,
      district: validated.districtName ?? data.district,
      upazila: validated.upazilaName ?? data.upazila ?? null,
      thana: validated.upazilaName ?? data.thana ?? null,
      area: validated.unionName ?? data.area ?? null,
    };
  }

  return {
    divisionId: divisionId ?? null,
    districtId: districtId ?? null,
    upazilaId: upazilaId ?? null,
    unionId: unionId ?? null,
    division: data.division ?? null,
    district: data.district,
    upazila: data.upazila ?? null,
    thana: data.thana ?? null,
    area: data.area ?? null,
  };
};

export const createAddress = async (userId: number, data: any) => {
  const existing = await repo.addresses(userId);
  const first = existing.length === 0;
  const resolvedLoc = resolveAddressLocation(data);

  return db.transaction(async (tx) => {
    if (data.isDefaultShipping || first)
      await repo.clearDefaults(tx, userId, "isDefaultShipping");
    if (data.isDefaultBilling || first)
      await repo.clearDefaults(tx, userId, "isDefaultBilling");
    return repo.createAddress(tx, userId, {
      ...data,
      ...resolvedLoc,
      countryCode: (data.countryCode || "BD").toUpperCase(),
      isDefaultShipping: data.isDefaultShipping ?? first,
      isDefaultBilling: data.isDefaultBilling ?? first,
    });
  });
};

export const updateAddress = async (userId: number, id: number, data: any) => {
  await getAddress(userId, id);
  const resolvedLoc = resolveAddressLocation(data);

  return db.transaction(async (tx) => {
    if (data.isDefaultShipping)
      await repo.clearDefaults(tx, userId, "isDefaultShipping");
    if (data.isDefaultBilling)
      await repo.clearDefaults(tx, userId, "isDefaultBilling");
    return repo.updateAddress(tx, id, {
      ...data,
      ...resolvedLoc,
      ...(data.countryCode
        ? { countryCode: data.countryCode.toUpperCase() }
        : {}),
    });
  });
};

export const deleteAddress = async (userId: number, id: number) => {
  const x = await getAddress(userId, id);
  const all = await repo.addresses(userId);
  await db.transaction(async (tx) => {
    await repo.removeAddress(tx, id);
    const remaining = all.filter((a: any) => a.id !== id);
    if (remaining.length && x.isDefaultShipping)
      await repo.updateAddress(tx, remaining[0].id, {
        isDefaultShipping: true,
      });
    if (remaining.length && x.isDefaultBilling)
      await repo.updateAddress(tx, remaining[0].id, { isDefaultBilling: true });
  });
};

export const setDefault = async (
  userId: number,
  id: number,
  field: "isDefaultShipping" | "isDefaultBilling"
) => {
  await getAddress(userId, id);
  return db.transaction(async (tx) => {
    await repo.clearDefaults(tx, userId, field);
    return repo.updateAddress(tx, id, { [field]: true });
  });
};

// ── Shipping Zones ───────────────────────────────────────────────────────────
export const listZones = () => repo.zones();
export const createZone = (data: any) => repo.createZone(data);
export const getZone = async (id: number) => {
  const x = await repo.zone(id);
  if (!x) throw new NotFoundError("Shipping zone not found");
  return x;
};
export const updateZone = async (id: number, data: any) => {
  await getZone(id);
  return repo.updateZone(id, data);
};
export const deleteZone = async (id: number) => {
  await getZone(id);
  await repo.deleteZone(id);
};

// ── Shipping Zone Locations ──────────────────────────────────────────────────
export const listLocations = async (zoneId: number) => {
  await getZone(zoneId);
  const locs = await repo.locations(zoneId);
  return locs.map((l: any) => ({
    ...l,
    divisionName: getDivisionById(l.divisionId)?.name ?? null,
    districtName: getDistrictById(l.districtId)?.name ?? null,
    upazilaName: getUpazilaById(l.upazilaId)?.name ?? null,
    unionName: getUnionById(l.unionId)?.name ?? null,
  }));
};

export const createLocation = async (zoneId: number, data: any) => {
  const targetZone = await getZone(zoneId);

  // 1. Strict hierarchy validation from location dataset
  const validated = validateLocationHierarchy(
    {
      divisionId: data.divisionId,
      districtId: data.districtId,
      upazilaId: data.upazilaId,
      unionId: data.unionId,
    },
    { allowPartial: true }
  );

  const targetDivId = validated.divisionId ?? null;
  const targetDistId = validated.districtId ?? null;
  const targetUpzId = validated.upazilaId ?? null;
  const targetUniId = validated.unionId ?? null;

  // 2. Prevent ambiguous / overlapping zone mappings across active zones
  const activeLocs = await repo.allActiveLocations();
  const existingMapping = activeLocs.find(
    (l: any) =>
      l.zone.isActive &&
      (l.divisionId ?? null) === targetDivId &&
      (l.districtId ?? null) === targetDistId &&
      (l.upazilaId ?? null) === targetUpzId &&
      (l.unionId ?? null) === targetUniId
  );

  if (existingMapping) {
    const match = existingMapping as any;
    if (match.zoneId === zoneId) {
      throw new ConflictError(
        "This exact location scope is already mapped in this shipping zone"
      );
    } else {
      throw new ConflictError(
        `This exact location scope is already claimed by active Shipping Zone '${match.zone?.name}'`
      );
    }
  }

  return repo.createLocation({
    zoneId,
    divisionId: targetDivId,
    districtId: targetDistId,
    upazilaId: targetUpzId,
    unionId: targetUniId,
  });
};

export const deleteLocation = async (zoneId: number, locationId: number) => {
  await getZone(zoneId);
  const loc = await repo.location(locationId);
  if (!loc || loc.zoneId !== zoneId)
    throw new NotFoundError("Shipping zone location not found");
  await repo.deleteLocation(locationId);
};

// ── Shipping Methods ────────────────────────────────────────────────────────
export const listMethods = () => repo.methods();
export const createMethod = (data: any) =>
  repo.createMethod({ ...data, code: normalizeCode(data.code) });
export const getMethod = async (id: number) => {
  const x = await repo.method(id);
  if (!x) throw new NotFoundError("Shipping method not found");
  return x;
};
export const updateMethod = async (id: number, data: any) => {
  await getMethod(id);
  return repo.updateMethod(id, {
    ...data,
    ...(data.code ? { code: normalizeCode(data.code) } : {}),
  });
};
export const deleteMethod = async (id: number) => {
  await getMethod(id);
  await repo.deleteMethod(id);
};

// ── Deterministic Hierarchical Zone Matching ────────────────────────────────
export const resolveZone = async (address: any) => {
  // Extract or resolve structured IDs
  const resolved = resolveAddressLocation(address);
  const divisionId = resolved.divisionId ? String(resolved.divisionId).trim() : null;
  const districtId = resolved.districtId ? String(resolved.districtId).trim() : null;
  const upazilaId = resolved.upazilaId ? String(resolved.upazilaId).trim() : null;
  const unionId = resolved.unionId ? String(resolved.unionId).trim() : null;

  const allActive = (await repo.allActiveLocations()).filter(
    (l: any) => l.zone.isActive
  );

  // Priority 1: Union Level Match
  if (unionId) {
    const unionMatches = allActive.filter(
      (l: any) => l.unionId && String(l.unionId) === unionId
    );
    if (unionMatches.length > 0) {
      const distinctZones = new Set(unionMatches.map((l: any) => l.zoneId));
      if (distinctZones.size > 1) {
        throw new ConflictError(
          `Shipping configuration conflict: multiple active zones claim Union ID ${unionId}`
        );
      }
      return unionMatches[0].zone;
    }
  }

  // Priority 2: Upazila Level Match
  if (upazilaId) {
    const upazilaMatches = allActive.filter(
      (l: any) =>
        l.upazilaId &&
        String(l.upazilaId) === upazilaId &&
        !l.unionId
    );
    if (upazilaMatches.length > 0) {
      const distinctZones = new Set(upazilaMatches.map((l: any) => l.zoneId));
      if (distinctZones.size > 1) {
        throw new ConflictError(
          `Shipping configuration conflict: multiple active zones claim Upazila ID ${upazilaId}`
        );
      }
      return upazilaMatches[0].zone;
    }
  }

  // Priority 3: District Level Match
  if (districtId) {
    const districtMatches = allActive.filter(
      (l: any) =>
        l.districtId &&
        String(l.districtId) === districtId &&
        !l.upazilaId &&
        !l.unionId
    );
    if (districtMatches.length > 0) {
      const distinctZones = new Set(districtMatches.map((l: any) => l.zoneId));
      if (distinctZones.size > 1) {
        throw new ConflictError(
          `Shipping configuration conflict: multiple active zones claim District ID ${districtId}`
        );
      }
      return districtMatches[0].zone;
    }
  }

  // Priority 4: Division Level Match
  if (divisionId) {
    const divisionMatches = allActive.filter(
      (l: any) =>
        l.divisionId &&
        String(l.divisionId) === divisionId &&
        !l.districtId &&
        !l.upazilaId &&
        !l.unionId
    );
    if (divisionMatches.length > 0) {
      const distinctZones = new Set(divisionMatches.map((l: any) => l.zoneId));
      if (distinctZones.size > 1) {
        throw new ConflictError(
          `Shipping configuration conflict: multiple active zones claim Division ID ${divisionId}`
        );
      }
      return divisionMatches[0].zone;
    }
  }

  // Priority 5: Nationwide / Fallback Match (All levels null)
  const fallbackMatches = allActive.filter(
    (l: any) =>
      !l.divisionId &&
      !l.districtId &&
      !l.upazilaId &&
      !l.unionId
  );
  if (fallbackMatches.length > 0) {
    return fallbackMatches[0].zone;
  }

  throw new NotFoundError("Delivery is not available for this address");
};

// ── Shipping Options & Rate Calculation ─────────────────────────────────────
export const options = async (userId: number, addressId: number) => {
  const address = await getAddress(userId, addressId);
  const zone: any = await resolveZone(address);
  const rawMethods = await repo.zoneOptions(zone.id);

  const methods = rawMethods
    .filter((x: any) => x.method.isActive)
    .map((x: any) => ({
      id: x.method.id,
      code: x.method.code,
      name: x.method.name,
      description: x.method.description,
      charge: String(x.charge),
      regularCharge: String(x.charge),
      finalCharge: String(x.charge),
      isFree: false,
      estimatedMinDays: x.estimatedMinDays,
      estimatedMaxDays: x.estimatedMaxDays,
      isRecommended: false,
    }));

  if (methods.length > 0) {
    methods[0].isRecommended = true;
  }

  return { addressId, zone: { id: zone.id, name: zone.name }, methods };
};

export const calculateOptions = async (address: any) => {
  const zone: any = await resolveZone(address);
  const rawMethods = await repo.zoneOptions(zone.id);
  const subtotalNum = address.subtotal ? Number(address.subtotal) : 0;

  const methods = rawMethods
    .filter((x: any) => x.method.isActive)
    .map((x: any) => {
      const regularChargeNum = Number(x.charge);
      const thresholdNum =
        x.freeShippingThreshold != null ? Number(x.freeShippingThreshold) : null;
      const isFree = thresholdNum !== null && subtotalNum >= thresholdNum;
      const finalChargeNum = isFree ? 0 : regularChargeNum;

      return {
        id: x.method.id,
        code: x.method.code,
        name: x.method.name,
        description: x.method.description,
        charge: finalChargeNum.toFixed(2), // backwards compatible charge field
        regularCharge: regularChargeNum.toFixed(2),
        finalCharge: finalChargeNum.toFixed(2),
        isFree,
        freeShippingThreshold:
          thresholdNum !== null ? thresholdNum.toFixed(2) : null,
        estimatedMinDays: x.estimatedMinDays,
        estimatedMaxDays: x.estimatedMaxDays,
        isRecommended: false,
      };
    });

  // Recommend the cheapest eligible final charge
  if (methods.length > 0) {
    let cheapestIdx = 0;
    let minCharge = Number(methods[0].finalCharge);
    for (let i = 1; i < methods.length; i++) {
      const curCharge = Number(methods[i].finalCharge);
      if (curCharge < minCharge) {
        minCharge = curCharge;
        cheapestIdx = i;
      }
    }
    methods[cheapestIdx].isRecommended = true;
  }

  return { zone: { id: zone.id, name: zone.name }, methods };
};

export const createZoneMethod = async (zoneId: number, data: any) => {
  await getZone(zoneId);
  await getMethod(data.methodId);
  return repo.createZoneMethod({
    ...data,
    zoneId,
    charge: String(data.charge),
    freeShippingThreshold:
      data.freeShippingThreshold != null
        ? String(data.freeShippingThreshold)
        : null,
  });
};

export const listZoneMethods = async (zoneId: number) => {
  await getZone(zoneId);
  return repo.zoneMethods(zoneId);
};

export const updateZoneMethod = async (
  zoneId: number,
  zoneMethodId: number,
  data: any
) => {
  await getZone(zoneId);
  const existing = await repo.zoneMethod(zoneMethodId);
  if (!existing || existing.zoneId !== zoneId) {
    throw new NotFoundError("Shipping zone method not found");
  }
  return repo.updateZoneMethod(zoneMethodId, {
    ...data,
    ...(data.charge !== undefined ? { charge: String(data.charge) } : {}),
    ...(data.freeShippingThreshold !== undefined
      ? {
          freeShippingThreshold:
            data.freeShippingThreshold != null
              ? String(data.freeShippingThreshold)
              : null,
        }
      : {}),
  });
};

export const deleteZoneMethod = async (
  zoneId: number,
  zoneMethodId: number
) => {
  await getZone(zoneId);
  const existing = await repo.zoneMethod(zoneMethodId);
  if (!existing || existing.zoneId !== zoneId) {
    throw new NotFoundError("Shipping zone method not found");
  }
  await repo.deleteZoneMethod(zoneMethodId);
};

