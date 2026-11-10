const messages = {
    CHAT_ENCRYPTION_KEY_MISSING: "Set CHAT_SETTINGS_ENCRYPTION_KEY in the deployment environment and redeploy. Use the same key that encrypted the saved API key.",
    CHAT_ENCRYPTION_KEY_INVALID: "Set CHAT_SETTINGS_ENCRYPTION_KEY to a 64-character hexadecimal secret in the deployment environment and redeploy.",
    CHAT_API_KEY_DECRYPTION_FAILED: "The saved AI API key could not be decrypted. Use the original CHAT_SETTINGS_ENCRYPTION_KEY or save the API key again in Chatbot Settings.",
    CHAT_API_KEY_MISSING: "The selected AI provider has no saved API key. Save one in Chatbot Settings.",
};

export class ChatConfigurationError extends Error {
    constructor(readonly code: keyof typeof messages) {
        super(messages[code]);
        this.name = "ChatConfigurationError";
    }
}
