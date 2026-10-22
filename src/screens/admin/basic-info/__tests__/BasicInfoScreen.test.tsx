import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import basicInfoHandlers, { basicInfoMock } from "@/mocks/basic-info";
import { renderWithQueryClient } from "@/tests/tan-query";
import BasicInfoScreen from "../BasicInfoScreen";

const server = setupServer(...basicInfoHandlers);

describe("BasicInfoScreen", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render the basic info form and populate its API data", async () => {
        renderWithQueryClient(<BasicInfoScreen />);

        expect(screen.getByRole("heading", { name: "Basic Information" })).toBeInTheDocument();
        expect(await screen.findByDisplayValue(basicInfoMock[0].name)).toBeInTheDocument();
        expect(screen.getByDisplayValue(basicInfoMock[0].email)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    test("should save edited information and refresh the query cache", async () => {
        const user = userEvent.setup();
        let basicInfo = { ...basicInfoMock[0] };
        const saveRequest = vi.fn();
        server.use(
            http.get("*/api/basic-info", () => HttpResponse.json({ success: true, data: [basicInfo] })),
            http.post("*/api/basic-info/", async ({ request }) => {
                const body = await request.json();
                saveRequest(body);
                basicInfo = { ...basicInfo, name: "Updated Developer" };
                return HttpResponse.json({ success: true, message: "Saved" });
            })
        );
        const { queryClient } = renderWithQueryClient(<BasicInfoScreen />);
        const name = await screen.findByDisplayValue(basicInfoMock[0].name);
        await user.clear(name);
        await user.type(name, "Updated Developer");

        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(saveRequest).toHaveBeenCalledExactlyOnceWith({ ...basicInfoMock[0], name: "Updated Developer" });
            expect(queryClient.getQueryData(["basicInfo"])).toEqual(basicInfo);
        });
        expect(screen.getByDisplayValue("Updated Developer")).toBeInTheDocument();
    });
});
