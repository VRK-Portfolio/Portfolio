import z from "zod";

export const PositionPropsSchema = z.object({
    _id: z.string().optional(),
    role: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    isCurrentPosition: z.boolean(),
    description: z.string(),
});


export const ExperiencePropsSchema = z.object({
    _id: z.string().optional(),
    company: z.string(),
    location: z.string(),
    responsibilites: z.array(z.string()),
    positions: z.array(PositionPropsSchema),
});

export type ExperienceType = z.infer<typeof ExperiencePropsSchema>;
export type PositionType = z.infer<typeof PositionPropsSchema>;