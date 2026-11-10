import { afterEach, describe, expect, test, vi } from "vitest";
import { Agent } from "@mastra/core/agent";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import { getChatModel } from "../chat-model";

const mocks = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock("@/libs/chat-settings", () => ({ getChatModelConfig: mocks.config }));
afterEach(() => vi.unstubAllEnvs());

describe("Dynamic provider resolution", () => {
    test.each([
        ["google", "gemini-3.8-flash"],
        ["openai", "gpt-4.1-mini"],
        ["anthropic", "claude-sonnet-4-5"],
        ["groq", "llama-3.3-70b-versatile"],
    ])("resolves %s using the installed Mastra provider with the saved key", async (provider, model) => {
        mocks.config.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, provider, model, apiKey: "fixture-key" });
        expect(await getChatModel()).toEqual({ id: `${provider}/${model}`, apiKey: "fixture-key" });
        const agent = new Agent({ id: "test", name: "test", instructions: "test", model: getChatModel });
        expect((await agent.getModel()).modelId).toBe(model);
    });

    test("uses the local OpenAI-compatible Ollama endpoint and reloads changed settings", async () => {
        vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434/");
        mocks.config.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, apiKey: undefined });
        expect(await getChatModel()).toMatchObject({ providerId: "ollama", modelId: "llama3.2", url: "http://localhost:11434/v1" });
        const agent = new Agent({ id: "local", name: "local", instructions: "test", model: getChatModel });
        expect((await agent.getModel()).modelId).toBe("llama3.2");
        mocks.config.mockResolvedValue({ ...DEFAULT_CHAT_CONFIG, model: "another-model", apiKey: undefined });
        expect(await getChatModel()).toMatchObject({ modelId: "another-model" });
    });
});
