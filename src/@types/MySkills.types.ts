import z from "zod";

export const MySkillsSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    icon: z.string()
});

export type MySkillsType = z.infer<typeof MySkillsSchema>;
