import { z } from "zod";

export const roleIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Role ID must be a positive integer"),
  }),
});

export const createRoleSchema = z.object({
  body: z.object({
    key: z
      .string()
      .min(2, "Role key must be at least 2 characters")
      .max(50, "Role key cannot exceed 50 characters")
      .regex(
        /^[A-Z0-9_]+$/,
        "Role key must consist of uppercase alphanumeric characters and underscores (e.g. ORDER_MANAGER)",
      ),
    name: z
      .string()
      .min(2, "Role name must be at least 2 characters")
      .max(100, "Role name cannot exceed 100 characters"),
    rank: z
      .number()
      .int()
      .min(1, "Role rank must be at least 1")
      .max(7, "Custom role rank cannot exceed 7 (Reserved for System Super Admin)"),
    permissionIds: z.array(z.number().int().positive()).optional().default([]),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      rank: z.number().int().min(1).max(7).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field to update must be provided",
    }),
});

export const updateRolePermissionsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    permissionIds: z.array(z.number().int().positive()),
  }),
});
