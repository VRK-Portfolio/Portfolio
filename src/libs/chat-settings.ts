import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ChatConfigSchema, ChatSettingsUpdateSchema, DEFAULT_CHAT_CONFIG, PublicChatSettingsSchema, type ChatSettingsView, type PublicChatSettings } from "@/@types/ChatSettings.types";
import { ChatSettingsModel } from "@/models/chat-settings.model";
import { connectDB } from "@/libs/db";
import { ChatConfigurationError } from "@/libs/chat-configuration-error";

const SETTINGS_ID = "portfolio-chat";

function encryptionKey() {
    const value = process.env.CHAT_SETTINGS_ENCRYPTION_KEY;
    if (!value) throw new ChatConfigurationError("CHAT_ENCRYPTION_KEY_MISSING");
    if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new ChatConfigurationError("CHAT_ENCRYPTION_KEY_INVALID");
    return Buffer.from(value, "hex");
}

export function encryptChatApiKey(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64")).join(".");
}

export function decryptChatApiKey(value: string) {
    const key = encryptionKey();
    const parts = value.split(".");
    if (parts.length !== 3) throw new ChatConfigurationError("CHAT_API_KEY_DECRYPTION_FAILED");
    try {
        const [iv, tag, encrypted] = parts.map(part => Buffer.from(part, "base64"));
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch {
        throw new ChatConfigurationError("CHAT_API_KEY_DECRYPTION_FAILED");
    }
}

export async function getChatSettings(): Promise<ChatSettingsView> {
    await connectDB();
    const record = await ChatSettingsModel.findById(SETTINGS_ID).select("+apiKeyEncrypted").lean().exec();
    return {
        ...ChatConfigSchema.parse(record ?? DEFAULT_CHAT_CONFIG),
        hasApiKey: Boolean(record?.apiKeyEncrypted),
    };
}

export async function isChatEnabled(): Promise<boolean> {
    await connectDB();
    const record = await ChatSettingsModel.findById(SETTINGS_ID).select("chatEnabled").lean().exec();
    return record?.chatEnabled ?? DEFAULT_CHAT_CONFIG.chatEnabled;
}

export async function getPublicChatSettings(): Promise<PublicChatSettings> {
    await connectDB();
    const record = await ChatSettingsModel.findById(SETTINGS_ID).select("provider model chatEnabled").lean().exec();
    return PublicChatSettingsSchema.parse(record ?? DEFAULT_CHAT_CONFIG);
}

export async function saveChatSettings(input: unknown): Promise<ChatSettingsView> {
    const { apiKey, ...config } = ChatSettingsUpdateSchema.parse(input);
    await connectDB();
    const previous = await ChatSettingsModel.findById(SETTINGS_ID).select("+apiKeyEncrypted").lean().exec();
    const sameProvider = previous?.provider === config.provider;
    const apiKeyEncrypted = config.provider === "ollama" ? undefined
        : apiKey ? encryptChatApiKey(apiKey)
            : sameProvider ? previous?.apiKeyEncrypted : undefined;
    if (config.provider !== "ollama" && !apiKeyEncrypted) {
        throw new Error("An API key is required for the selected provider.");
    }
    await ChatSettingsModel.findByIdAndUpdate(SETTINGS_ID, {
        $set: { ...config, ...(apiKeyEncrypted ? { apiKeyEncrypted } : {}) },
        ...(!apiKeyEncrypted ? { $unset: { apiKeyEncrypted: 1 } } : {}),
    }, { upsert: true, runValidators: true }).exec();
    return { ...config, hasApiKey: Boolean(apiKeyEncrypted) };
}

export async function getChatModelConfig() {
    await connectDB();
    const record = await ChatSettingsModel.findById(SETTINGS_ID).select("+apiKeyEncrypted").lean().exec();
    const config = ChatConfigSchema.parse(record ?? DEFAULT_CHAT_CONFIG);
    if (config.provider === "ollama") return { ...config, apiKey: undefined };
    if (!record?.apiKeyEncrypted) throw new ChatConfigurationError("CHAT_API_KEY_MISSING");
    return { ...config, apiKey: decryptChatApiKey(record.apiKeyEncrypted) };
}
