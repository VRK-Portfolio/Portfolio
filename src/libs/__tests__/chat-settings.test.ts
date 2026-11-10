import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import { decryptChatApiKey, encryptChatApiKey, getChatModelConfig, getChatSettings, getPublicChatSettings, isChatEnabled, saveChatSettings } from "../chat-settings";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/chat-settings.model", () => ({
    ChatSettingsModel: {
        findById: () => ({ select: () => ({ lean: () => ({ exec: mocks.read }) }) }),
        findByIdAndUpdate: (...args: unknown[]) => { mocks.write(...args); return { exec: async () => ({}) }; },
    },
}));

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CHAT_SETTINGS_ENCRYPTION_KEY", "a".repeat(64));
    mocks.read.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe("Persistent chat configuration", () => {
    test("preserves the local default until settings are saved", async () => {
        expect(await getChatSettings()).toEqual({ ...DEFAULT_CHAT_CONFIG, hasApiKey: false });
        expect(await isChatEnabled()).toBe(true);
        expect(await getPublicChatSettings()).toEqual({ provider: "ollama", model: "llama3.2", chatEnabled: true });
    });

    test("publishes only provider, model, and visibility, without decrypting saved credentials", async () => {
        mocks.read.mockResolvedValue({
            ...DEFAULT_CHAT_CONFIG, provider: "groq", model: "saved-model", apiKeyEncrypted: "private-ciphertext",
        });
        vi.stubEnv("CHAT_SETTINGS_ENCRYPTION_KEY", "");
        expect(await getPublicChatSettings()).toEqual({ provider: "groq", model: "saved-model", chatEnabled: true });
    });

    test("encrypts API keys using authenticated encryption and distinct random IVs", () => {
        const first = encryptChatApiKey("test-provider-secret");
        const second = encryptChatApiKey("test-provider-secret");
        expect(first).not.toBe(second);
        expect(first).not.toContain("test-provider-secret");
        expect(decryptChatApiKey(first)).toBe("test-provider-secret");
        const [iv, tag, body] = first.split(".");
        const tampered = Buffer.from(body, "base64");
        tampered[0] ^= 1;
        expect(() => decryptChatApiKey([iv, tag, tampered.toString("base64")].join("."))).toThrow();
    });

    test("requires a server encryption secret and rejects a different secret", () => {
        const encrypted = encryptChatApiKey("test-secret");
        vi.stubEnv("CHAT_SETTINGS_ENCRYPTION_KEY", "b".repeat(64));
        expect(() => decryptChatApiKey(encrypted)).toThrow();
        vi.stubEnv("CHAT_SETTINGS_ENCRYPTION_KEY", "");
        expect(() => encryptChatApiKey("test-secret")).toThrow("CHAT_SETTINGS_ENCRYPTION_KEY");
        expect(() => decryptChatApiKey("invalid")).toThrow("Invalid encrypted");
    });

    test("persists only ciphertext and never returns plaintext or ciphertext to the admin", async () => {
        const result = await saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "google", model: "gemini-2.5-flash", apiKey: "test-secret" });
        expect(result.hasApiKey).toBe(true);
        expect(JSON.stringify(result)).not.toContain("test-secret");
        const update = mocks.write.mock.calls[0][1];
        expect(decryptChatApiKey(update.$set.apiKeyEncrypted)).toBe("test-secret");
        expect(update.$set.apiKey).toBeUndefined();
        mocks.read.mockResolvedValue({ ...result, apiKeyEncrypted: update.$set.apiKeyEncrypted });
        expect(await getChatSettings()).toEqual(result);
        expect(await getChatModelConfig()).toMatchObject({ provider: "google", apiKey: "test-secret" });
    });

    test("keeps an unchanged provider key but requires a fresh key when switching providers", async () => {
        const apiKeyEncrypted = encryptChatApiKey("saved-secret");
        mocks.read.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, provider: "google", apiKeyEncrypted });
        await saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "google", apiKey: "" });
        expect(mocks.write.mock.calls[0][1].$set.apiKeyEncrypted).toBe(apiKeyEncrypted);
        await expect(saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "groq" })).rejects.toThrow("API key is required");
    });

    test("replaces a saved key and removes cloud credentials when switching to Ollama", async () => {
        mocks.read.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, provider: "google", apiKeyEncrypted: encryptChatApiKey("old") });
        await saveChatSettings({ ...DEFAULT_CHAT_CONFIG, provider: "google", apiKey: "new" });
        expect(decryptChatApiKey(mocks.write.mock.calls[0][1].$set.apiKeyEncrypted)).toBe("new");
        await saveChatSettings(DEFAULT_CHAT_CONFIG);
        expect(mocks.write.mock.calls[1][1].$unset).toEqual({ apiKeyEncrypted: 1 });
    });

    test("rejects invalid limits, providers, and extra fields", async () => {
        for (const invalid of [{ temperature: 2 }, { maxOutputTokens: 0 }, { provider: "unknown" }, { extra: true }]) {
            await expect(saveChatSettings({ ...DEFAULT_CHAT_CONFIG, ...invalid })).rejects.toThrow();
        }
        expect(mocks.write).not.toHaveBeenCalled();
    });

    test("propagates database failures without falling back to enabled/default configuration", async () => {
        mocks.read.mockRejectedValue(new Error("database down"));
        await expect(getChatSettings()).rejects.toThrow("database down");
        await expect(isChatEnabled()).rejects.toThrow("database down");
        await expect(getPublicChatSettings()).rejects.toThrow("database down");
    });
});
