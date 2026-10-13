import { z } from "zod";
export const listingSchema = z.object({
  title: z.string().trim().min(8).max(160),
  commodity: z.string().trim().min(2).max(60),
  country: z.enum(["Lesotho", "South Africa", "Other"]),
  location: z.string().trim().min(2).max(160),
  description: z.string().trim().min(50).max(8000),
  transaction_type: z.enum([
    "Full sale",
    "Partial stake",
    "Joint venture",
    "Offtake",
  ]),
  asking_price: z.number().positive().max(99999999999999).nullable(),
  currency: z.enum(["USD", "ZAR", "LSL"]),
  area_hectares: z.number().positive().max(100000000).nullable(),
  right_reference: z.string().trim().max(200).default(""),
});
export const uuid = z.string().uuid();
export const money = z.number().positive().max(99999999999999);
export const uploadTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const fileSchema = z.object({
  listing_id: uuid,
  name: z.string().min(1).max(180),
  kind: z.enum(["title", "mandate", "technical", "company", "photo", "other"]),
  size: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024),
  content_type: z.enum(uploadTypes as [string, ...string[]]),
});
