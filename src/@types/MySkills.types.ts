import z from "zod";

export const MySkillsSchema = z.object({
    _id: z.string().optional(),
    name: z.string(),
    icon: z.union([z.string(), z.instanceof(File)]),
    category: z.string(),
    capabilities: z.array(z.string()),
    proficiency: z.string()
});

export type MySkillsType = z.infer<typeof MySkillsSchema>;
