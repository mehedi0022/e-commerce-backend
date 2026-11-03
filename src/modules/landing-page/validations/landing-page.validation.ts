import { z } from "zod";

const featureSchema = z.object({
  icon: z.string().trim().optional(),
  title: z.string().trim().min(1, "Feature title is required").max(150),
  description: z.string().trim().max(500).optional(),
});

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
});

export const createLandingPageSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(255),
    slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
    productId: z.number().int().positive("A valid product must be selected"),
    badgeText: z.string().trim().max(100).nullable().optional(),
    headline: z.string().trim().max(500).nullable().optional(),
    subHeadline: z.string().trim().max(2000).nullable().optional(),
    videoUrl: z.string().trim().max(500).nullable().optional(),
    countdownTarget: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable().optional(),
    features: z.array(featureSchema).default([]),
    gallery: z.array(z.string().trim()).default([]),
    faqs: z.array(faqSchema).default([]),
    customContent: z.string().trim().max(20000).nullable().optional(),
    isPublished: z.boolean().default(true),
  }),
});

export const updateLandingPageSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    title: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
    productId: z.number().int().positive().optional(),
    badgeText: z.string().trim().max(100).nullable().optional(),
    headline: z.string().trim().max(500).nullable().optional(),
    subHeadline: z.string().trim().max(2000).nullable().optional(),
    videoUrl: z.string().trim().max(500).nullable().optional(),
    countdownTarget: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable().optional(),
    features: z.array(featureSchema).optional(),
    gallery: z.array(z.string().trim()).optional(),
    faqs: z.array(faqSchema).optional(),
    customContent: z.string().trim().max(20000).nullable().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const landingPageQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    productId: z.coerce.number().int().positive().optional(),
    isPublished: z.preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
  }),
});

export const landingPageIdSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const landingPageSlugSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1).max(255) }),
});
