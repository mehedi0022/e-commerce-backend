import { z } from "zod";

const id = z.coerce.number().int().positive();

export const sizeChartIdSchema = z.object({
  params: z.object({ id }),
});

export const createSizeChartSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().max(1000).nullable().optional(),
      unit: z.string().trim().max(20).default("inches"),
      columns: z.array(z.string().trim().min(1)).min(1),
      rows: z.array(z.record(z.string(), z.any())).min(1),
      tips: z.string().trim().max(2000).nullable().optional(),
      image: z.string().trim().max(500).nullable().optional(),
    })
    .strict(),
});

export const updateSizeChartSchema = z.object({
  params: z.object({ id }),
  body: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      unit: z.string().trim().max(20).optional(),
      columns: z.array(z.string().trim().min(1)).optional(),
      rows: z.array(z.record(z.string(), z.any())).optional(),
      tips: z.string().trim().max(2000).nullable().optional(),
      image: z.string().trim().max(500).nullable().optional(),
    })
    .strict(),
});
