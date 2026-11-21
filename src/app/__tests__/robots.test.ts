import { beforeEach, describe, expect, test, vi } from "vitest";
import { BasicInfoModel } from "@/models/basic-info.model";
import { basicInfoMock } from "@/mocks/basic-info";
import robots, { dynamic } from "../robots";

describe("robots.txt", () => {
    beforeEach(async () => {
        await BasicInfoModel.create({ ...basicInfoMock[0], website_url: "https://portfolio.example/" });
    });

    test("allows public pages, excludes private routes, and advertises the sitemap", async () => {
        expect(await robots()).toEqual({
            rules: {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/login", "/api"],
            },
            sitemap: "https://www.vijayrameshkumar.dev/sitemap.xml",
        });
    });

    test("uses the deployment domain regardless of an outdated saved website", async () => {
        await BasicInfoModel.updateOne({}, { website_url: "https://updated.example/portfolio?preview=1#about" });
        expect((await robots()).sitemap).toBe("https://www.vijayrameshkumar.dev/sitemap.xml");
        expect(dynamic).toBe("force-dynamic");
    });

    test("keeps crawler rules available without querying the profile database", async () => {
        const spy = vi.spyOn(BasicInfoModel, "findOne").mockImplementationOnce(() => {
            throw new Error("Database unavailable");
        });
        try {
            expect((await robots()).sitemap).toBe("https://www.vijayrameshkumar.dev/sitemap.xml");
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });
});
