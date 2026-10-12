import {z} from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("3000"),
    MONGODB_URI: z.url({ message: 'Invalid MongoDB URI' })
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("Invalid environment variables:", _env.error);
    throw new Error("Invalid environment variables");
}

export const env = _env.data;