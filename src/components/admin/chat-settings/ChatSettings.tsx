"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/block/ui/button/Button";
import Card from "@/block/ui/card/Card";
import { CHAT_PROVIDER_LABELS, ChatConfigSchema, ChatSettingsResponseSchema, type ChatProvider, type ChatSettingsView } from "@/@types/ChatSettings.types";
import "@/block/ui/input/input.css";

const providers: { value: ChatProvider; model: string }[] = [
    { value: "ollama", model: "llama3.2" },
    { value: "google", model: "gemini-3.8-flash" },
    { value: "openai", model: "gpt-4.1-mini" },
    { value: "anthropic", model: "claude-sonnet-4-5" },
    { value: "groq", model: "llama-3.3-70b-versatile" },
];

async function readSettings(response: Response) {
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.error || "Failed to load chat settings.");
    return ChatSettingsResponseSchema.parse(body).data;
}

function SettingsForm({ initial }: { initial: ChatSettingsView }) {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(initial);
    const [config, setConfig] = useState(initial);
    const [apiKey, setApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const hasSavedKey = config.provider === saved.provider && saved.hasApiKey;

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            const values = ChatConfigSchema.parse(config);
            const data = await readSettings(await fetch("/api/chat-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, ...(apiKey ? { apiKey } : {}) }),
            }));
            setSaved(data);
            setConfig(data);
            queryClient.setQueryData(["chatSettings"], data);
            setApiKey("");
            setNotice("Chat settings saved. Public pages update within 30 seconds or on reload.");
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to save chat settings.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={save} className="space-y-6">
            <p>Configure the portfolio assistant. Choose a tool-calling model; all existing database-grounding rules stay enabled.</p>
            <fieldset disabled={isSaving} className="space-y-5">
                <div className="cmp-input">
                    <label className="cmp-input__label" htmlFor="chat-provider">LLM provider</label>
                    <select id="chat-provider" className="cmp-input__field" value={config.provider} onChange={event => {
                        const provider = providers.find(item => item.value === event.target.value);
                        if (!provider) return;
                        setConfig({ ...config, provider: provider.value, model: provider.model });
                        setApiKey("");
                        setNotice("");
                    }}>
                        {providers.map(provider => <option key={provider.value} value={provider.value}>{CHAT_PROVIDER_LABELS[provider.value]}</option>)}
                    </select>
                </div>
                <div className="cmp-input">
                    <label className="cmp-input__label" htmlFor="chat-model">Model ID</label>
                    <input id="chat-model" className="cmp-input__field" required maxLength={150} value={config.model}
                        onChange={event => setConfig({ ...config, model: event.target.value })} />
                </div>
                {config.provider !== "ollama" ? (
                    <div className="cmp-input">
                        <label className="cmp-input__label" htmlFor="chat-api-key">API key</label>
                        <input id="chat-api-key" className="cmp-input__field" type="password" autoComplete="new-password"
                            required={!hasSavedKey} maxLength={4096} value={apiKey} spellCheck={false}
                            aria-describedby="chat-key-hint"
                            placeholder={hasSavedKey ? "Saved key: ******** (leave blank to keep)" : "Enter provider API key"}
                            onChange={event => setApiKey(event.target.value)} />
                        <p id="chat-key-hint" className="mt-2 text-sm">
                            {hasSavedKey ? "A key is saved. Enter a new key to replace it." : "A key is required for this provider."}
                            {" "}Keys are encrypted on the server and never returned to the browser. Switching providers replaces the previous configuration.
                        </p>
                    </div>
                ) : <p className="text-sm">Ollama uses the server&apos;s OLLAMA_BASE_URL (default: http://localhost:11434). No API key is needed. Saving removes any previously saved cloud key.</p>}
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="cmp-input">
                        <label className="cmp-input__label" htmlFor="chat-temperature">Temperature (0-1)</label>
                        <input id="chat-temperature" className="cmp-input__field" type="number" min={0} max={1} step={0.1} required
                            value={config.temperature} onChange={event => setConfig({ ...config, temperature: event.target.valueAsNumber })} />
                    </div>
                    <div className="cmp-input">
                        <label className="cmp-input__label" htmlFor="chat-token-limit">Maximum output tokens</label>
                        <input id="chat-token-limit" className="cmp-input__field" type="number" min={128} max={16384} step={1} required
                            value={config.maxOutputTokens} onChange={event => setConfig({ ...config, maxOutputTokens: event.target.valueAsNumber })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="font-semibold">Chat button visibility</h2>
                    <p>The floating and footer chat button is currently {config.chatEnabled ? "shown" : "hidden"} in this configuration.</p>
                    <Button type="button" aria-pressed={config.chatEnabled}
                        onClick={() => { setConfig({ ...config, chatEnabled: !config.chatEnabled }); setNotice(""); }}>
                        {config.chatEnabled ? "Hide chat button" : "Show chat button"}
                    </Button>
                    <p className="text-sm">Save to apply site-wide. Hiding also disables the chat API.</p>
                </div>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save chat settings"}</Button>
            </fieldset>
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
        </form>
    );
}

export default function ChatSettings() {
    const query = useQuery({
        queryKey: ["chatSettings"],
        queryFn: async () => readSettings(await fetch("/api/chat-settings", { cache: "no-store" })),
        refetchOnWindowFocus: false,
        retry: false,
    });
    return (
        <Card>
            <Card.Heading>Chatbot settings</Card.Heading>
            <Card.Body>
                {query.isPending && <p role="status">Loading chat settings...</p>}
                {query.isError && <div role="alert"><p>{query.error.message}</p><Button onClick={() => query.refetch()}>Retry</Button></div>}
                {!query.isError && query.data && <SettingsForm initial={query.data} />}
            </Card.Body>
        </Card>
    );
}
