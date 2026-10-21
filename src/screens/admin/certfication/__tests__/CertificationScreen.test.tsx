import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import CertificationScreen from "../CertificationScreen";
import { renderWithQueryClient } from "@/tests/tan-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { certificationHandlers, mockCertifications } from "@/mocks/certifications";
import { mockDialogMethods } from "@/tests/dialog";

const server = setupServer(...certificationHandlers);

describe("CertificationScreen", () => {
    let dialogMethods: ReturnType<typeof mockDialogMethods>;
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    beforeEach(() => {
        dialogMethods = mockDialogMethods();
    });
    afterEach(() => {
        server.resetHandlers();
        dialogMethods.restore();
    });
    afterAll(() => server.close());

    const renderCertificationScreen = async () => {
        const result = renderWithQueryClient(<CertificationScreen />);
        await screen.findByRole("heading", { name: mockCertifications[0].title });
        return result;
    };

    test("should render the admin list without an initial modal", async () => {
        await renderCertificationScreen();
        expect(screen.getByRole("heading", { name: "Admin View of Certifications", level: 4 })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add Certification" })).toBeEnabled();
        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        expect(dialogMethods.showModal).not.toHaveBeenCalled();
    });

    test("should open an empty add form", async () => {
        const user = userEvent.setup();
        await renderCertificationScreen();

        await user.click(screen.getByRole("button", { name: "Add Certification" }));

        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Add Certification" })).toBeInTheDocument();
        expect(dialog.getByPlaceholderText("Certification Name")).toHaveValue("");
        expect(dialog.getByRole("button", { name: "Submit" })).toBeInTheDocument();
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);
    });

    test.each([0, 1])("should open an edit form with the certification at index %i", async (index) => {
        const user = userEvent.setup();
        await renderCertificationScreen();
        await user.click(screen.getAllByRole("button", { name: "Edit" })[index]);

        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Edit Certification" })).toBeInTheDocument();
        await waitFor(() => {
            expect(dialog.getByPlaceholderText("Certification Name")).toHaveValue(mockCertifications[index].title);
        });
        expect(dialog.getByPlaceholderText("Credential ID")).toHaveValue(mockCertifications[index].credentialID);
        expect(dialog.getByRole("button", { name: "Update Certification" })).toBeInTheDocument();
    });

    test.each(["Cancel", "\u00d7"])("should close the form with %s and reset the next modal to add mode", async (button) => {
        const user = userEvent.setup();
        await renderCertificationScreen();
        await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: button }));

        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Certification" }));
        const dialog = within(screen.getByRole("dialog"));
        expect(dialog.getByRole("heading", { name: "Add Certification" })).toBeInTheDocument();
        expect(dialog.getByPlaceholderText("Certification Name")).toHaveValue("");
    });

    test("should unmount the form when the dialog emits a close event", async () => {
        const user = userEvent.setup();
        await renderCertificationScreen();
        await user.click(screen.getByRole("button", { name: "Add Certification" }));

        fireEvent(screen.getByRole("dialog"), new Event("close"));

        expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Certification Name")).not.toBeInTheDocument();
    });
});