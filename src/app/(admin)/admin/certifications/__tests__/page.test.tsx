import { screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { certificationHandlers, mockCertifications } from "@/mocks/certifications";
import { renderWithQueryClient } from "@/tests/tan-query";
import Certifications from "../page";

const server = setupServer(...certificationHandlers);

describe("Admin certifications page", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render the certification screen and load its admin content", async () => {
        renderWithQueryClient(<Certifications />);

        expect(screen.getByRole("heading", { name: "Admin View of Certifications" })).toBeInTheDocument();
        expect(await screen.findByRole("heading", { name: mockCertifications[0].title })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add Certification" })).toBeEnabled();
        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
    });
});
