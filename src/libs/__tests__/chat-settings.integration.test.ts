import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import { ChatSettingsModel } from "@/models/chat-settings.model";
import { getChatModelConfig, getChatSettings, getPublicChatSettings, isChatEnabled, saveChatSettings } from "../chat-settings";

vi.mock("@/libs/db", () => ({ connectDB: vi.fn() }));
beforeEach(() => vi.stubEnv("CHAT_SETTINGS_ENCRYPTION_KEY", "c".repeat(64)));
afterEach(() => vi.unstubAllEnvs());

describe("Chat settings MongoDB persistence", () => {
    test("upserts one persistent configuration, masks keys, updates visibility, and removes obsolete credentials", async () => {
        await saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "fixture-secret", chatEnabled: false });
        expect(await ChatSettingsModel.countDocuments()).toBe(1);
        expect(await isChatEnabled()).toBe(false);
        const normallySelected = await ChatSettingsModel.findOne().lean().exec();
        expect(normallySelected).not.toHaveProperty("apiKeyEncrypted");
        const raw = await ChatSettingsModel.findById("portfolio-chat").select("+apiKeyEncrypted").lean().exec();
        expect(raw?.apiKeyEncrypted).toBeTruthy();
        expect(JSON.stringify(raw)).not.toContain("fixture-secret");
        expect(await getChatSettings()).toMatchObject({ provider: "groq", chatEnabled: false, hasApiKey: true });
        expect(await getPublicChatSettings()).toEqual({ provider: "groq", model: "llama-3.3-70b-versatile", chatEnabled: false });
        expect(await getChatModelConfig()).toMatchObject({ apiKey: "fixture-secret" });
        await saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "groq", chatEnabled: true });
        expect(await isChatEnabled()).toBe(true);
        await saveChatSettings(DEFAULT_CHAT_CONFIG);
        expect(await ChatSettingsModel.countDocuments()).toBe(1);
        expect(await getChatSettings()).toEqual({ ...DEFAULT_CHAT_CONFIG, hasApiKey: false });
        const cleared = await ChatSettingsModel.findById("portfolio-chat").select("+apiKeyEncrypted").lean().exec();
        expect(cleared).not.toHaveProperty("apiKeyEncrypted");
    });
});
