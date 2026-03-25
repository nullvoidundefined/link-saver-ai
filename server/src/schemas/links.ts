import { z } from "zod";

export const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
