import divisionsData from "../constants/address/divisions.json" with { type: "json" };
import districtsData from "../constants/address/districts.json" with { type: "json" };
import upazilasData from "../constants/address/upazilas.json" with { type: "json" };
import unionsData from "../constants/address/unions.json" with { type: "json" };
import { ValidationError } from "../errors/AppError.js";

export interface Division {
  id: string;
  name: string;
  bn_name: string;
  url?: string;
}

export interface District {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  lat?: string;
  lon?: string;
  url?: string;
}

export interface Upazila {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
  url?: string;
}

export interface Union {
  id: string;
  upazila_id: string;
  name: string;
  bn_name: string;
  url?: string;
}

export interface LocationHierarchyInput {
  divisionId?: string | number | null;
  districtId?: string | number | null;
  upazilaId?: string | number | null;
  unionId?: string | number | null;
}

export interface ValidatedLocationHierarchy {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
  divisionName: string | null;
  districtName: string | null;
  upazilaName: string | null;
  unionName: string | null;
  division?: Division;
  district?: District;
  upazila?: Upazila;
  union?: Union;
}

// ── Index maps for O(1) lookups ──────────────────────────────────────────────
const divisionsList: Division[] = divisionsData as Division[];
const districtsList: District[] = districtsData as District[];
const upazilasList: Upazila[] = upazilasData as Upazila[];
const unionsList: Union[] = unionsData as Union[];

const divisionMap = new Map<string, Division>();
for (const d of divisionsList) {
  divisionMap.set(String(d.id), d);
}

const districtMap = new Map<string, District>();
const districtsByDivisionMap = new Map<string, District[]>();
for (const d of districtsList) {
  const idStr = String(d.id);
  const divIdStr = String(d.division_id);
  districtMap.set(idStr, d);
  if (!districtsByDivisionMap.has(divIdStr)) {
    districtsByDivisionMap.set(divIdStr, []);
  }
  districtsByDivisionMap.get(divIdStr)!.push(d);
}

const upazilaMap = new Map<string, Upazila>();
const upazilasByDistrictMap = new Map<string, Upazila[]>();
for (const u of upazilasList) {
  const idStr = String(u.id);
  const distIdStr = String(u.district_id);
  upazilaMap.set(idStr, u);
  if (!upazilasByDistrictMap.has(distIdStr)) {
    upazilasByDistrictMap.set(distIdStr, []);
  }
  upazilasByDistrictMap.get(distIdStr)!.push(u);
}

const unionMap = new Map<string, Union>();
const unionsByUpazilaMap = new Map<string, Union[]>();
for (const un of unionsList) {
  const idStr = String(un.id);
  const upzIdStr = String(un.upazila_id);
  unionMap.set(idStr, un);
  if (!unionsByUpazilaMap.has(upzIdStr)) {
    unionsByUpazilaMap.set(upzIdStr, []);
  }
  unionsByUpazilaMap.get(upzIdStr)!.push(un);
}

// ── Accessors ───────────────────────────────────────────────────────────────
export const getDivisions = (): Division[] => divisionsList;

export const getDistricts = (divisionId?: string | number | null): District[] => {
  if (!divisionId) return districtsList;
  return districtsByDivisionMap.get(String(divisionId)) || [];
};

export const getUpazilas = (districtId?: string | number | null): Upazila[] => {
  if (!districtId) return upazilasList;
  return upazilasByDistrictMap.get(String(districtId)) || [];
};

export const getUnions = (upazilaId?: string | number | null): Union[] => {
  if (!upazilaId) return unionsList;
  return unionsByUpazilaMap.get(String(upazilaId)) || [];
};

export const getDivisionById = (id?: string | number | null): Division | undefined => {
  if (id === null || id === undefined || id === "") return undefined;
  return divisionMap.get(String(id));
};

export const getDistrictById = (id?: string | number | null): District | undefined => {
  if (id === null || id === undefined || id === "") return undefined;
  return districtMap.get(String(id));
};

export const getUpazilaById = (id?: string | number | null): Upazila | undefined => {
  if (id === null || id === undefined || id === "") return undefined;
  return upazilaMap.get(String(id));
};

export const getUnionById = (id?: string | number | null): Union | undefined => {
  if (id === null || id === undefined || id === "") return undefined;
  return unionMap.get(String(id));
};

// ── Server-side Strict Location Hierarchy Validation ───────────────────────
export const validateLocationHierarchy = (
  input: LocationHierarchyInput,
  options: {
    requireDistrict?: boolean;
    allowPartial?: boolean; // When true (e.g. for zone mapping), not all levels are required
  } = {}
): ValidatedLocationHierarchy => {
  const rawDivisionId = input.divisionId ? String(input.divisionId).trim() : null;
  const rawDistrictId = input.districtId ? String(input.districtId).trim() : null;
  const rawUpazilaId = input.upazilaId ? String(input.upazilaId).trim() : null;
  const rawUnionId = input.unionId ? String(input.unionId).trim() : null;

  let division: Division | undefined;
  let district: District | undefined;
  let upazila: Upazila | undefined;
  let union: Union | undefined;

  // 1. Validate Division if provided
  if (rawDivisionId) {
    division = divisionMap.get(rawDivisionId);
    if (!division) {
      throw new ValidationError(`Invalid divisionId: '${rawDivisionId}' does not exist`);
    }
  }

  // 2. Validate District if provided
  if (rawDistrictId) {
    district = districtMap.get(rawDistrictId);
    if (!district) {
      throw new ValidationError(`Invalid districtId: '${rawDistrictId}' does not exist`);
    }

    // Verify district belongs to division
    if (division && String(district.division_id) !== String(division.id)) {
      throw new ValidationError(
        `Hierarchy mismatch: District '${district.name}' does not belong to Division '${division.name}'`
      );
    }

    // If division was not explicitly provided, infer it from district
    if (!division) {
      division = divisionMap.get(String(district.division_id));
    }
  } else if (options.requireDistrict) {
    throw new ValidationError("districtId is required for this address");
  }

  // 3. Validate Upazila if provided
  if (rawUpazilaId) {
    upazila = upazilaMap.get(rawUpazilaId);
    if (!upazila) {
      throw new ValidationError(`Invalid upazilaId: '${rawUpazilaId}' does not exist`);
    }

    if (!district) {
      throw new ValidationError(
        `Hierarchy error: districtId must be specified when upazilaId '${rawUpazilaId}' is provided`
      );
    }

    // Verify upazila belongs to district
    if (String(upazila.district_id) !== String(district.id)) {
      throw new ValidationError(
        `Hierarchy mismatch: Upazila '${upazila.name}' does not belong to District '${district.name}'`
      );
    }
  }

  // 4. Validate Union if provided
  if (rawUnionId) {
    union = unionMap.get(rawUnionId);
    if (!union) {
      throw new ValidationError(`Invalid unionId: '${rawUnionId}' does not exist`);
    }

    if (!upazila) {
      throw new ValidationError(
        `Hierarchy error: upazilaId must be specified when unionId '${rawUnionId}' is provided`
      );
    }

    // Verify union belongs to upazila
    if (String(union.upazila_id) !== String(upazila.id)) {
      throw new ValidationError(
        `Hierarchy mismatch: Union '${union.name}' does not belong to Upazila '${upazila.name}'`
      );
    }
  }

  return {
    divisionId: division ? String(division.id) : rawDivisionId,
    districtId: district ? String(district.id) : rawDistrictId,
    upazilaId: upazila ? String(upazila.id) : rawUpazilaId,
    unionId: union ? String(union.id) : rawUnionId,
    divisionName: division?.name ?? null,
    districtName: district?.name ?? null,
    upazilaName: upazila?.name ?? null,
    unionName: union?.name ?? null,
    division,
    district,
    upazila,
    union,
  };
};
