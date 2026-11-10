import type { MastraModelConfig } from "@mastra/core/llm";
import { getChatModelConfig } from "@/libs/chat-settings";

export async function getChatModel(): Promise<MastraModelConfig> {
    const config = await getChatModelConfig();
    if (config.provider === "ollama") {
        return {
            providerId: "ollama",
            modelId: config.model,
            url: `${(process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "")}/v1`,
        };
    }
    return { id: `${config.provider}/${config.model}` as const, apiKey: config.apiKey };
}
