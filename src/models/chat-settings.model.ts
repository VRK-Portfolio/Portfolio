import mongoose, { Schema, type Model } from "mongoose";
import type { ChatConfig } from "@/@types/ChatSettings.types";

export interface ChatSettingsRecord extends ChatConfig {
    _id: string;
    apiKeyEncrypted?: string;
}

const ChatSettingsSchema = new Schema<ChatSettingsRecord>({
    _id: { type: String, required: true },
    provider: { type: String, enum: ["ollama", "google", "openai", "anthropic", "groq"], required: true },
    model: { type: String, required: true },
    chatEnabled: { type: Boolean, required: true },
    temperature: { type: Number, min: 0, max: 1, required: true },
    maxOutputTokens: { type: Number, min: 128, max: 16384, required: true },
    apiKeyEncrypted: { type: String, select: false },
}, { timestamps: true });

export const ChatSettingsModel: Model<ChatSettingsRecord> =
    mongoose.models.ChatSettings || mongoose.model<ChatSettingsRecord>("ChatSettings", ChatSettingsSchema);
