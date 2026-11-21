import { screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import BasicInfoBanner from "../Basic-Info-Banner";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BasicInfoType } from "@/@types/BasicInfo.types";
import { basicInfoMock } from "@/mocks/basic-info";
import { renderWithQueryClient } from "@/tests/tan-query";
import basicInfoHandlers from "@/mocks/basic-info";

const server = setupServer(...basicInfoHandlers);
describe("BasicInfoBanner", () => {

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    const renderBasicInfoBanner = () => renderWithQueryClient(<BasicInfoBanner />);

    test("should show a loading placeholder until basic info loads", async () => {
        const { container } = renderBasicInfoBanner();
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
        expect(container.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();

        await screen.findByRole("heading", { name: basicInfoMock[0].name });
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        const script = container.querySelector('.cmp-basic-info-banner script[type="application/ld+json"]')!;
        const data = JSON.parse(script.textContent!);
        expect(data["@graph"]).toContainEqual(expect.objectContaining({
            "@type": "Person", name: basicInfoMock[0].name,
            "@id": "https://www.vijayrameshkumar.dev/#person",
        }));
        expect(script.textContent).not.toContain(basicInfoMock[0].email);
        expect(script.textContent).not.toContain(basicInfoMock[0].address);
    });

    test("should display the basic info banner content", async () => {
        renderBasicInfoBanner();
        expect(await screen.findByRole("heading", { name: basicInfoMock[0].name })).toBeInTheDocument();
        expect(screen.getByText(basicInfoMock[0].about_me)).toBeInTheDocument();
        expect(screen.getByText(basicInfoMock[0].bio)).toBeInTheDocument();
    });

    test("should display the avatar image", async () => {
        renderBasicInfoBanner();
        const image = await screen.findByRole("img", { name: `${basicInfoMock[0].name}, frontend engineer` });
        expect(image).toHaveAttribute("loading", "eager");
        expect(image).toHaveAttribute("fetchpriority", "high");
    });


    test.each([200, 500])("should finish loading when the API returns an error with status %i", async (status) => {
        server.use(
            http.get("*/api/basic-info", () => HttpResponse.json<ApiGetResponse<BasicInfoType[]>>({
                success: false,
                error: "Failed to fetch basic info",
            }, { status }))
        );

        const { container, queryClient } = renderBasicInfoBanner();
        await waitFor(() => {
            expect(queryClient.getQueryState(["basicInfo"])?.status).toBe("error");
            expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
        });
        expect(screen.queryByText(basicInfoMock[0].name)).not.toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Portfolio portrait" })).toBeInTheDocument();
    });
});