import { screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import basicInfoHandlers, { basicInfoMock } from "@/mocks/basic-info";
import { renderWithQueryClient } from "@/tests/tan-query";
import BasicInfo from "../page";

const server = setupServer(...basicInfoHandlers);

describe("Admin basic info page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render the basic info screen and load the editable profile", async () => {
        renderWithQueryClient(<BasicInfo />);

        expect(screen.getByRole("heading", { name: "Basic Information" })).toBeInTheDocument();
        expect(await screen.findByDisplayValue(basicInfoMock[0].name)).toBeInTheDocument();
        expect(screen.getByDisplayValue(basicInfoMock[0].email)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });
});
