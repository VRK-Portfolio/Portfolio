import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  image_url: z.url(),
  technologies: z.array(z.string()),
});

export type ProjectType = z.infer<typeof ProjectSchema>;