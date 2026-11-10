import { NextResponse } from "next/server";
import { getPublicChatSettings } from "@/libs/chat-settings";

export async function GET() {
    try {
        return NextResponse.json({ success: true, ...await getPublicChatSettings() }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch {
        console.error("Failed to load chat visibility.");
        return NextResponse.json({ success: false, error: "Failed to load chat visibility." }, { status: 500 });
    }
}
