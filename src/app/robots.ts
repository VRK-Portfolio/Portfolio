import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/libs/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/login", "/api"],
        },
        sitemap: new URL("/sitemap.xml", SITE_ORIGIN).href,
    };
}
