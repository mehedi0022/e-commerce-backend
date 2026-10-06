import { z } from "zod";

const id = z.coerce.number().int().positive();
const textLocation = z.string().trim().max(120).nullable().optional();
const locationId = z.string().trim().max(50).nullable().optional();

export const addressId = z.object({ params: z.object({ addressId: id }) });

const addressFields = {
  label: z.string().trim().max(80).nullable().optional(),
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(30),
  addressLine1: z.string().trim().min(3).max(250),
  addressLine2: z.string().trim().max(250).nullable().optional(),

  // Canonical structured IDs
  divisionId: locationId,
  districtId: z.string().trim().min(1).max(50).optional(),
  upazilaId: locationId,
  unionId: locationId,

  // Text names for backwards compatibility / snapshots
  division: textLocation,
  district: z.string().trim().min(1).max(120),
  upazila: textLocation,
  thana: textLocation,
  area: textLocation,
  postalCode: z.string().trim().max(20).nullable().optional(),
  countryCode: z.string().trim().length(2).default("BD"),
};

export const createAddress = z.object({
  body: z
    .object({
      ...addressFields,
      isDefaultShipping: z.boolean().optional(),
      isDefaultBilling: z.boolean().optional(),
    })
    .strict(),
});

export const updateAddress = z.object({
  params: z.object({ addressId: id }),
  body: z
    .object({
      ...addressFields,
      isDefaultShipping: z.boolean().optional(),
      isDefaultBilling: z.boolean().optional(),
    })
    .partial()
    .strict()
    .refine((x) => Object.keys(x).length > 0, "At least one field is required"),
});

export const zoneId = z.object({ params: z.object({ zoneId: id }) });

export const zoneBody = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().max(500).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
    })
    .strict(),
});

// ── ShippingZoneLocation Validation ─────────────────────────────────────────
export const zoneLocationId = z.object({
  params: z.object({ zoneId: id, locationId: id }),
});

export const locationBody = z.object({
  params: z.object({ zoneId: id }),
  body: z
    .object({
      divisionId: locationId,
      districtId: locationId,
      upazilaId: locationId,
      unionId: locationId,
    })
    .strict(),
});

export const locationUpdate = z.object({
  params: z.object({ zoneId: id, locationId: id }),
  body: locationBody.shape.body.partial().strict(),
});

// ── Shipping Method Validation ──────────────────────────────────────────────
export const methodBody = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(150),
      code: z.string().trim().min(1).max(50),
      description: z.string().trim().max(500).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
    })
    .strict(),
});

export const methodId = z.object({ params: z.object({ methodId: id }) });

export const optionQuery = z.object({
  query: z.object({ addressId: id }).strict(),
});

export const zoneMethodBody = z.object({
  params: z.object({ zoneId: id }),
  body: z
    .object({
      methodId: id,
      charge: z.coerce.number().min(0),
      freeShippingThreshold: z.coerce.number().min(0).nullable().optional(),
      estimatedMinDays: z.coerce.number().int().min(0).nullable().optional(),
      estimatedMaxDays: z.coerce.number().int().min(0).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (
        v.estimatedMinDays != null &&
        v.estimatedMaxDays != null &&
        v.estimatedMaxDays < v.estimatedMinDays
      ) {
        ctx.addIssue({
          code: "custom",
          message: "estimatedMaxDays must be >= estimatedMinDays",
        });
      }
    }),
});

export const zoneMethodId = z.object({
  params: z.object({ zoneId: id, zoneMethodId: id }),
});

export const updateZoneMethodBody = z.object({
  params: z.object({ zoneId: id, zoneMethodId: id }),
  body: z
    .object({
      charge: z.coerce.number().min(0).optional(),
      freeShippingThreshold: z.coerce.number().min(0).nullable().optional(),
      estimatedMinDays: z.coerce.number().int().min(0).nullable().optional(),
      estimatedMaxDays: z.coerce.number().int().min(0).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.coerce.number().int().min(0).optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (
        v.estimatedMinDays != null &&
        v.estimatedMaxDays != null &&
        v.estimatedMaxDays < v.estimatedMinDays
      ) {
        ctx.addIssue({
          code: "custom",
          message: "estimatedMaxDays must be >= estimatedMinDays",
        });
      }
    }),
});


export const calculateShippingBody = z.object({
  body: z
    .object({
      divisionId: locationId,
      districtId: z.string().trim().optional().nullable(),
      upazilaId: locationId,
      unionId: locationId,
      // Optional text fallbacks for compatibility
      division: textLocation,
      district: textLocation,
      upazila: textLocation,
      area: textLocation,
      countryCode: z.string().trim().length(2).optional(),
      postalCode: z.string().trim().max(20).optional().nullable(),
      subtotal: z.coerce.number().min(0).optional(),
    })
    .strict(),
});
