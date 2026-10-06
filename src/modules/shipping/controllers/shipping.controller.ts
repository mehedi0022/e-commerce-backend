import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import * as s from "../services/shipping.service.js";
import {
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnions,
} from "../../../utils/location.util.js";

// ── Address Handlers ────────────────────────────────────────────────────────
export const addresses = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Addresses fetched successfully",
      await s.listAddresses(req.auth!.userId),
    ),
  ),
);

export const address = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Address fetched successfully",
      await s.getAddress(req.auth!.userId, Number(req.params.addressId)),
    ),
  ),
);

export const createAddress = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Address created successfully",
        await s.createAddress(req.auth!.userId, req.body),
      ),
    ),
);

export const updateAddress = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Address updated successfully",
      await s.updateAddress(
        req.auth!.userId,
        Number(req.params.addressId),
        req.body,
      ),
    ),
  ),
);

export const deleteAddress = asyncHandler(async (req, res) => {
  await s.deleteAddress(req.auth!.userId, Number(req.params.addressId));
  res.json(successResponse("Address deleted successfully", null));
});

export const defaultShipping = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Default shipping address updated successfully",
      await s.setDefault(
        req.auth!.userId,
        Number(req.params.addressId),
        "isDefaultShipping",
      ),
    ),
  ),
);

export const defaultBilling = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Default billing address updated successfully",
      await s.setDefault(
        req.auth!.userId,
        Number(req.params.addressId),
        "isDefaultBilling",
      ),
    ),
  ),
);

// ── Shipping Zone Handlers ──────────────────────────────────────────────────
export const zones = asyncHandler(async (_req, res) =>
  res.json(
    successResponse("Shipping zones fetched successfully", await s.listZones()),
  ),
);

export const zone = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping zone fetched successfully",
      await s.getZone(Number(req.params.zoneId)),
    ),
  ),
);

export const createZone = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Shipping zone created successfully",
        await s.createZone(req.body),
      ),
    ),
);

export const updateZone = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping zone updated successfully",
      await s.updateZone(Number(req.params.zoneId), req.body),
    ),
  ),
);

export const deleteZone = asyncHandler(async (req, res) => {
  await s.deleteZone(Number(req.params.zoneId));
  res.json(successResponse("Shipping zone deleted successfully", null));
});

// ── Shipping Zone Location Handlers ─────────────────────────────────────────
export const locations = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping zone locations fetched successfully",
      await s.listLocations(Number(req.params.zoneId)),
    ),
  ),
);

export const createLocation = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Shipping zone location created successfully",
        await s.createLocation(Number(req.params.zoneId), req.body),
      ),
    ),
);

export const deleteLocation = asyncHandler(async (req, res) => {
  await s.deleteLocation(
    Number(req.params.zoneId),
    Number(req.params.locationId),
  );
  res.json(
    successResponse("Shipping zone location deleted successfully", null),
  );
});

// ── Location Dataset Handlers (Bangladesh Dataset) ──────────────────────────
export const divisions = asyncHandler(async (_req, res) =>
  res.json(
    successResponse("Divisions fetched successfully", getDivisions()),
  ),
);

export const districts = asyncHandler(async (req, res) => {
  const divisionId = req.query.divisionId ? String(req.query.divisionId) : undefined;
  res.json(
    successResponse("Districts fetched successfully", getDistricts(divisionId)),
  );
});

export const upazilas = asyncHandler(async (req, res) => {
  const districtId = req.query.districtId ? String(req.query.districtId) : undefined;
  res.json(
    successResponse("Upazilas fetched successfully", getUpazilas(districtId)),
  );
});

export const unions = asyncHandler(async (req, res) => {
  const upazilaId = req.query.upazilaId ? String(req.query.upazilaId) : undefined;
  res.json(
    successResponse("Unions fetched successfully", getUnions(upazilaId)),
  );
});

// ── Shipping Methods Handlers ───────────────────────────────────────────────
export const methods = asyncHandler(async (_req, res) =>
  res.json(
    successResponse(
      "Shipping methods fetched successfully",
      await s.listMethods(),
    ),
  ),
);

export const method = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping method fetched successfully",
      await s.getMethod(Number(req.params.methodId)),
    ),
  ),
);

export const createMethod = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Shipping method created successfully",
        await s.createMethod(req.body),
      ),
    ),
);

export const updateMethod = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping method updated successfully",
      await s.updateMethod(Number(req.params.methodId), req.body),
    ),
  ),
);

export const deleteMethod = asyncHandler(async (req, res) => {
  await s.deleteMethod(Number(req.params.methodId));
  res.json(successResponse("Shipping method deleted successfully", null));
});

export const options = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping options fetched successfully",
      await s.options(req.auth!.userId, Number(req.query.addressId)),
    ),
  ),
);

export const calculate = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping options calculated successfully",
      await s.calculateOptions(req.body),
    ),
  ),
);

export const createZoneMethod = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Shipping zone method created successfully",
        await s.createZoneMethod(Number(req.params.zoneId), req.body),
      ),
    ),
);

export const zoneMethods = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping zone methods fetched successfully",
      await s.listZoneMethods(Number(req.params.zoneId)),
    ),
  ),
);

export const updateZoneMethod = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Shipping zone method updated successfully",
      await s.updateZoneMethod(
        Number(req.params.zoneId),
        Number(req.params.zoneMethodId),
        req.body,
      ),
    ),
  ),
);

export const deleteZoneMethod = asyncHandler(async (req, res) => {
  await s.deleteZoneMethod(
    Number(req.params.zoneId),
    Number(req.params.zoneMethodId),
  );
  res.json(
    successResponse("Shipping zone method deleted successfully", null),
  );
});

