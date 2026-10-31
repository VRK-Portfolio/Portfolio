import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ExperiencePropsSchema, type ExperienceType } from "@/@types/Experience.types";
import { renderWithQueryClient } from "@/tests/tan-query";
import ExperienceScreen from "../ExperienceScreen";

vi.mock("@/components/ui/modal/Modal", () => ({
    default: ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => (
        <div role="dialog" aria-label={title}>
            <button onClick={onClose}>Close experience modal</button>
            {children}
        </div>
    ),
}));

let experiences: ExperienceType[] = [];
const createRequest = vi.fn();
const updateRequest = vi.fn();
const server = setupServer(
    http.get("*/api/experience", () => HttpResponse.json({ success: true, data: experiences })),
    http.post("*/api/experience", async ({ request }) => {
        const body = ExperiencePropsSchema.parse(await request.json());
        createRequest(body);
        experiences = [...experiences, { ...body, _id: "507f1f77bcf86cd799439011" }];
        return HttpResponse.json({ success: true, message: "Created" }, { status: 201 });
    }),
    http.put("*/api/experience/:id", async ({ request, params }) => {
        const body = ExperiencePropsSchema.parse(await request.json());
        updateRequest(params.id, body);
        experiences = experiences.map((entry) => entry._id === params.id ? body : entry);
        return HttpResponse.json({ success: true, message: "Updated" });
    })
);

describe("ExperienceScreen", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    beforeEach(() => {
        experiences = [];
        createRequest.mockReset();
        updateRequest.mockReset();
    });
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("adds an experience, refreshes the list, then opens and saves the edit form", async () => {
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<ExperienceScreen />);
        await waitFor(() => expect(queryClient.getQueryState(["experience"])?.status).toBe("success"));
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        const form = within(screen.getByRole("dialog", { name: "Add Experience" }));
        await user.type(form.getByRole("textbox", { name: "Company" }), "Example Company");
        await user.type(form.getByRole("textbox", { name: "Location" }), "Remote");
        await user.type(form.getByRole("textbox", { name: "Responsibility" }), "Architecture{Enter}");
        await user.type(form.getByRole("textbox", { name: "Role 1" }), "Engineer");
        await user.type(form.getByLabelText("Start Date 1"), "2024-02-29");
        await user.type(form.getByRole("textbox", { name: "Description 1" }), "Building accessible applications.");
        await user.click(form.getByRole("checkbox", { name: "Current position 1" }));
        await user.click(form.getByRole("button", { name: "Add Experience" }));

        expect(await screen.findByRole("heading", { name: "Example Company" })).toBeInTheDocument();
        expect(createRequest).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Edit" }));
        const editForm = within(screen.getByRole("dialog", { name: "Edit Experience" }));
        await waitFor(() => expect(queryClient.isFetching({ queryKey: ["experience"] })).toBe(0));
        expect(editForm.getByLabelText("Start Date 1")).toHaveValue("2024-02-29");
        expect(editForm.getByRole("checkbox", { name: "Current position 1" })).toBeChecked();
        await user.clear(editForm.getByRole("textbox", { name: "Company" }));
        await user.type(editForm.getByRole("textbox", { name: "Company" }), "Updated Company");
        await user.click(editForm.getByRole("button", { name: "Update Experience" }));

        expect(await screen.findByRole("heading", { name: "Updated Company" })).toBeInTheDocument();
        expect(updateRequest).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439011",
            expect.objectContaining({ company: "Updated Company" })
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("keeps the modal open when the server rejects a save", async () => {
        experiences = [{
            _id: "507f1f77bcf86cd799439011",
            company: "Example Company",
            location: "Remote",
            responsibilites: ["Architecture"],
            positions: [{
                role: "Engineer",
                startDate: new Date("2024-02-29"),
                isCurrentPosition: true,
                description: "Building applications.",
            }],
        }];
        server.use(http.put("*/api/experience/:id", () => (
            HttpResponse.json({ success: false, error: "Could not save experience" }, { status: 500 })
        )));
        const user = userEvent.setup();
        renderWithQueryClient(<ExperienceScreen />);
        await user.click(await screen.findByRole("button", { name: "Edit" }));
        const form = within(screen.getByRole("dialog", { name: "Edit Experience" }));
        await user.click(form.getByRole("button", { name: "Update Experience" }));
        expect(await form.findByRole("alert")).toHaveTextContent("Could not save experience");
        expect(form.getByRole("textbox", { name: "Company" })).toHaveValue("Example Company");
    });

    test("closes the modal through its close callback and can open a fresh add form", async () => {
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<ExperienceScreen />);
        await waitFor(() => expect(queryClient.getQueryState(["experience"])?.status).toBe("success"));
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        await user.type(screen.getByRole("textbox", { name: "Company" }), "Unsaved Company");
        await user.click(screen.getByRole("button", { name: "Close experience modal" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Experience" }));
        expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue("");
        expect(createRequest).not.toHaveBeenCalled();
    });
});
