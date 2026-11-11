import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/libs/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
    const origin = await getSiteOrigin();
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/login", "/api"],
        },
        sitemap: new URL("/sitemap.xml", origin).href,
    };
}
