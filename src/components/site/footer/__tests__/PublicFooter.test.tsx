import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, test, vi } from "vitest";
import PublicFooter from "../PublicFooter";
import type { PublicChatSettings } from "@/@types/ChatSettings.types";

vi.mock("../Footer", () => ({
    default: ({ year, chatEnabled, modelConfig }: { year: number; chatEnabled: boolean; modelConfig?: PublicChatSettings }) => <footer>
        Copyright {year}
        {chatEnabled && <button>Chat with me</button>}
        {chatEnabled && modelConfig && <p>{modelConfig.provider}: {modelConfig.model}</p>}
    </footer>,
}));
afterEach(() => vi.unstubAllGlobals());

describe("Public chat visibility", () => {
    test.each([true, false])("shows the launcher only when the server enables it: %s", async chatEnabled => {
        const settings = { success: true, chatEnabled, provider: "ollama", model: "llama3.2" };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(settings))));
        const client = new QueryClient();
        const view = render(<QueryClientProvider client={client}><PublicFooter year={2026} /></QueryClientProvider>);
        await waitFor(() => expect(client.getQueryData(["chatVisibility"])).toEqual(settings));
        expect(Boolean(screen.queryByRole("button", { name: "Chat with me" }))).toBe(chatEnabled);
        expect(screen.getByText("Copyright 2026")).toBeInTheDocument();
        view.unmount();
        client.clear();
    });

    test("updates provider and model without closing the chatbot or remounting the footer", async () => {
        const fetch = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, chatEnabled: true, provider: "ollama", model: "llama3.2" })))
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, chatEnabled: true, provider: "groq", model: "llama-3.3-70b-versatile" })));
        vi.stubGlobal("fetch", fetch);
        const client = new QueryClient();
        const view = render(<QueryClientProvider client={client}><PublicFooter year={2026} /></QueryClientProvider>);
        await screen.findByText("ollama: llama3.2");
        const launcher = screen.getByRole("button", { name: "Chat with me" });
        await client.refetchQueries({ queryKey: ["chatVisibility"] });
        await screen.findByText("groq: llama-3.3-70b-versatile");
        expect(screen.getByRole("button", { name: "Chat with me" })).toBe(launcher);
        view.unmount();
        client.clear();
    });

    test("fails closed and reports visibility errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
        const client = new QueryClient();
        const view = render(<QueryClientProvider client={client}><PublicFooter year={2026} /></QueryClientProvider>);
        expect(await screen.findByRole("status")).toHaveTextContent("Chat availability could not be loaded.");
        expect(screen.queryByRole("button", { name: "Chat with me" })).not.toBeInTheDocument();
        view.unmount();
        client.clear();
    });
});
