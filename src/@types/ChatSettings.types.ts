import { z } from "zod";

export const ChatProviderSchema = z.enum(["ollama", "google", "openai", "anthropic", "groq"]);
export type ChatProvider = z.infer<typeof ChatProviderSchema>;
export const CHAT_PROVIDER_LABELS: Record<ChatProvider, string> = {
    ollama: "Ollama",
    google: "Google Gemini",
    openai: "OpenAI",
    anthropic: "Anthropic",
    groq: "Groq",
};

export const ChatConfigSchema = z.object({
    provider: ChatProviderSchema,
    model: z.string().trim().min(1).max(150).regex(/^[a-zA-Z0-9._:/-]+$/, "Use a valid model ID"),
    chatEnabled: z.boolean(),
    temperature: z.number().min(0).max(1),
    maxOutputTokens: z.number().int().min(128).max(16384),
});
export type ChatConfig = z.infer<typeof ChatConfigSchema>;
export const PublicChatSettingsSchema = ChatConfigSchema.pick({ provider: true, model: true, chatEnabled: true });
export type PublicChatSettings = z.infer<typeof PublicChatSettingsSchema>;
export const PublicChatSettingsResponseSchema = PublicChatSettingsSchema.extend({ success: z.literal(true) });
export const ChatSettingsUpdateSchema = ChatConfigSchema.extend({
    apiKey: z.string().trim().max(4096).optional(),
}).strict();
export const ChatSettingsResponseSchema = z.object({
    success: z.literal(true),
    data: ChatConfigSchema.extend({ hasApiKey: z.boolean() }),
});
export type ChatSettingsView = z.infer<typeof ChatSettingsResponseSchema>["data"];

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
    provider: "ollama",
    model: "llama3.2",
    chatEnabled: true,
    temperature: 0,
    maxOutputTokens: 2048,
};
