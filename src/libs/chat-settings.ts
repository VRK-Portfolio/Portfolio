import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ChatConfigSchema, ChatSettingsUpdateSchema, DEFAULT_CHAT_CONFIG, PublicChatSettingsSchema, type ChatSettingsView, type PublicChatSettings } from "@/@types/ChatSettings.types";
import { ChatSettingsModel } from "@/models/chat-settings.model";
import { connectDB } from "@/libs/db";

const SETTINGS_ID = "portfolio-chat";

function encryptionKey() {
    const value = process.env.CHAT_SETTINGS_ENCRYPTION_KEY;
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error("Set CHAT_SETTINGS_ENCRYPTION_KEY to a 64-character hexadecimal secret before saving API keys.");
    }
    return Buffer.from(value, "hex");
}

export function encryptChatApiKey(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64")).join(".");
}

export function decryptChatApiKey(value: string) {
    const parts = value.split(".");
    if (parts.length !== 3) throw new Error("Invalid encrypted chat API key.");
    const [iv, tag, encrypted] = parts.map(part => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
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
    if (!record?.apiKeyEncrypted) throw new Error("The selected chat provider has no saved API key.");
    return { ...config, apiKey: decryptChatApiKey(record.apiKeyEncrypted) };
}
