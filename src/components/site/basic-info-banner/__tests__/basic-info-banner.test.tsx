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
        expect(screen.queryByRole("img")).not.toBeInTheDocument();

        await screen.findByRole("heading", { name: basicInfoMock[0].name });
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });

    test("should display the basic info banner content", async () => {
        renderBasicInfoBanner();
        expect(await screen.findByRole("heading", { name: basicInfoMock[0].name })).toBeInTheDocument();
        expect(screen.getByText(basicInfoMock[0].about_me)).toBeInTheDocument();
        expect(screen.getByText(basicInfoMock[0].bio)).toBeInTheDocument();
    });

    test("should display the avatar image", async () => {
        renderBasicInfoBanner();
        expect(await screen.findByRole("img", { name: /Basic Info Banner/i })).toBeInTheDocument();
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
        expect(screen.getByRole("img", { name: /Basic Info Banner/i })).toBeInTheDocument();
    });
});