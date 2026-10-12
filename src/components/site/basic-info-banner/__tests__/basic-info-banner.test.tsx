import { render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import BasicInfoBanner from "../Basic-Info-Banner";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { ApiGetResponse } from "@/@types/ApiResponse.types";
import { BasicInfoType } from "@/@types/BasicInfo.types";
import { basicInfoMock } from "@/mocks/basic-info";

const server = setupServer(
    http.get<never, never, ApiGetResponse<BasicInfoType[]>>("/api/basic-info", () => {
        return HttpResponse.json({
            data: basicInfoMock,
            success: true,
            message: "Basic info fetched successfully"
        });
    })
);
describe("BasicInfoBanner", () => {

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
    const renderBasicInfoBanner = () => render(<BasicInfoBanner />);
    test("should render correctly", () => {
        renderBasicInfoBanner();
    });

    test("should display the basic info banner content", async () => {
        const { getByText } = renderBasicInfoBanner();
        await waitFor(() => {
            expect(getByText(basicInfoMock[0].name)).toBeInTheDocument();
            expect(getByText(basicInfoMock[0].about_me)).toBeInTheDocument();
            expect(getByText(basicInfoMock[0].bio)).toBeInTheDocument();
        }) 
    });

    test("should display the avatar image", () => {
        const { getByAltText } = renderBasicInfoBanner();
        expect(getByAltText(/Basic Info Banner/i)).toBeInTheDocument();
    });


    test("should")
});