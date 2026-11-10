"use client";

import { useQuery } from "@tanstack/react-query";
import { PublicChatSettingsResponseSchema } from "@/@types/ChatSettings.types";
import Footer from "./Footer";

export default function PublicFooter({ year }: { year: number }) {
    const query = useQuery({
        queryKey: ["chatVisibility"],
        queryFn: async () => {
            const response = await fetch("/api/chat/visibility", { cache: "no-store" });
            if (!response.ok) throw new Error("Chat availability could not be loaded.");
            return PublicChatSettingsResponseSchema.parse(await response.json());
        },
        refetchInterval: 30000,
        retry: false,
    });
    const enabled = !query.isError && query.data?.chatEnabled === true;
    return <>
        <Footer key={String(enabled)} year={year} chatEnabled={enabled} modelConfig={query.data} />
        {query.isError && <p role="status" className="text-center text-sm">Chat availability could not be loaded.</p>}
    </>;
}
