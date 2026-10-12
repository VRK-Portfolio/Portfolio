import { z } from "zod";

export const BlogSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  image_url: z.url(),
  technologies: z.array(z.string()),
  published_at: z.coerce.date(),
});

export type BlogType = z.infer<typeof BlogSchema>;