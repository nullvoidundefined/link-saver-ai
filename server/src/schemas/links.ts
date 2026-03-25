import { z } from "zod";

export const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export const updateLinkSchema = z.object({
  title: z.string().min(1, "Title must not be empty").max(500).optional(),
});

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
