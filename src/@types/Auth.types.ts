import z from "zod";

export const AuthTypeSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export type AuthType = z.infer<typeof AuthTypeSchema>;

