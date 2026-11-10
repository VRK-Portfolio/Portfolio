import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_CHAT_CONFIG } from "@/@types/ChatSettings.types";
import ChatSettings from "../ChatSettings";

const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const success = (data = { ...DEFAULT_CHAT_CONFIG, hasApiKey: false }) => response({ success: true, data });
function renderSettings() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}>
        <ChatSettings />
    </QueryClientProvider>);
    return { ...view, client };
}
afterEach(() => vi.unstubAllGlobals());

describe("Dashboard chat configuration", () => {
    test("loads settings, offers all providers, and saves visibility and generation limits", async () => {
        const user = userEvent.setup();
        const fetch = vi.fn().mockResolvedValueOnce(success()).mockResolvedValueOnce(success({ ...DEFAULT_CHAT_CONFIG, hasApiKey: false, chatEnabled: false, maxOutputTokens: 512 }));
        vi.stubGlobal("fetch", fetch);
        const { client } = renderSettings();
        expect(await screen.findByLabelText("LLM provider")).toHaveValue("ollama");
        expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(["Ollama", "Google Gemini", "OpenAI", "Anthropic", "Groq"]);
        await user.click(screen.getByRole("button", { name: "Hide chat button" }));
        expect(screen.getByRole("button", { name: "Show chat button" })).toHaveAttribute("aria-pressed", "false");
        await user.clear(screen.getByLabelText("Maximum output tokens"));
        await user.type(screen.getByLabelText("Maximum output tokens"), "512");
        await user.click(screen.getByRole("button", { name: "Save chat settings" }));
        await screen.findByText(/Chat settings saved/);
        const sent = JSON.parse(fetch.mock.calls[1][1].body);
        expect(sent).toEqual({ ...DEFAULT_CHAT_CONFIG, chatEnabled: false, maxOutputTokens: 512 });
        expect(sent).not.toHaveProperty("hasApiKey");
        expect(client.getQueryData(["chatSettings"])).toMatchObject({ chatEnabled: false, maxOutputTokens: 512 });
    });

    test("never fetches a saved key and sends a replacement only when entered", async () => {
        const user = userEvent.setup();
        const config = { ...DEFAULT_CHAT_CONFIG, provider: "google" as const, model: "gemini-2.5-flash", hasApiKey: true };
        const fetch = vi.fn().mockResolvedValueOnce(success(config)).mockResolvedValueOnce(success(config));
        vi.stubGlobal("fetch", fetch);
        renderSettings();
        const key = await screen.findByLabelText("API key");
        expect(key).toHaveValue("");
        expect(key).not.toBeRequired();
        expect(key).toHaveAttribute("type", "password");
        await user.type(key, "fixture-secret");
        await user.click(screen.getByRole("button", { name: "Save chat settings" }));
        await screen.findByText(/Chat settings saved/);
        expect(JSON.parse(fetch.mock.calls[1][1].body).apiKey).toBe("fixture-secret");
        expect(screen.getByLabelText("API key")).toHaveValue("");
        await user.selectOptions(screen.getByLabelText("LLM provider"), "groq");
        expect(screen.getByLabelText("API key")).toBeRequired();
        expect(screen.getByLabelText("Model ID")).toHaveValue("llama-3.3-70b-versatile");
        await user.selectOptions(screen.getByLabelText("LLM provider"), "google");
        expect(screen.getByLabelText("Model ID")).toHaveValue("gemini-3.8-flash");
    });

    test("keeps edits on save failure and displays an explicit error", async () => {
        const user = userEvent.setup();
        const fetch = vi.fn().mockResolvedValueOnce(success()).mockResolvedValueOnce(response({ success: false, error: "Encryption secret is missing." }, 500));
        vi.stubGlobal("fetch", fetch);
        renderSettings();
        await screen.findByLabelText("LLM provider");
        await user.selectOptions(screen.getByLabelText("LLM provider"), "openai");
        await user.type(screen.getByLabelText("API key"), "fixture-key");
        await user.click(screen.getByRole("button", { name: "Save chat settings" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Encryption secret is missing.");
        expect(screen.getByLabelText("API key")).toHaveValue("fixture-key");
        expect(screen.queryByText(/Chat settings saved/)).not.toBeInTheDocument();
    });

    test("shows load errors and supports retrying", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ success: false, error: "Unauthorized" }, 401)).mockResolvedValueOnce(success()));
        renderSettings();
        expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
        await user.click(screen.getByRole("button", { name: "Retry" }));
        await waitFor(() => expect(screen.getByLabelText("Model ID")).toHaveValue("llama3.2"));
    });
});
