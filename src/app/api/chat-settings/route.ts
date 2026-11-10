import { NextResponse } from "next/server";
import { withAuth } from "@/libs/auth-wrapper";
import { getChatSettings, saveChatSettings } from "@/libs/chat-settings";
import { ChatSettingsUpdateSchema } from "@/@types/ChatSettings.types";
import { ChatConfigurationError } from "@/libs/chat-configuration-error";

export const GET = withAuth(async () => {
    try {
        return NextResponse.json({ success: true, data: await getChatSettings() }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch {
        console.error("Failed to load chat settings.");
        return NextResponse.json({ success: false, error: "Failed to load chat settings." }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: Request) => {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
        return NextResponse.json({ success: false, error: "Invalid request origin." }, { status: 403 });
    }
    try {
        const parsed = ChatSettingsUpdateSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: "Invalid chat settings.", errors: parsed.error.issues }, { status: 422 });
        }
        return NextResponse.json({ success: true, data: await saveChatSettings(parsed.data) }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
        }
        console.error("Failed to save chat settings.");
        const message = error instanceof ChatConfigurationError ? error.message
            : error instanceof Error && error.message === "An API key is required for the selected provider."
                ? error.message : "Failed to save chat settings.";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
});
