import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BasicInfoType } from "@/@types/BasicInfo.types";
import { basicInfoMock } from "@/mocks/basic-info";
import BasicInfoComponent from "../Basic-Info";

const hooks = vi.hoisted(() => {
    const data: { basicInfo: BasicInfoType | null } = { basicInfo: null };
    return { ...data, updateBasicInfo: vi.fn<(data: BasicInfoType) => void>() };
});

vi.mock("@/hooks/useBasicInfo", () => ({
    useBasicInfo: () => ({ basicInfo: hooks.basicInfo }),
    useUpdateBasicInfo: () => ({ updateBasicInfo: hooks.updateBasicInfo }),
}));

describe("BasicInfoComponent", () => {
    const getInput = (name: keyof BasicInfoType) => {
        const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (!input) {
            throw new Error(`Missing form input: ${name}`);
        }
        return input;
    };
    const submitForm = () => {
        const form = getInput("name").form;
        if (!form) {
            throw new Error("Missing basic info form");
        }
        fireEvent.submit(form);
    };

    beforeEach(() => {
        hooks.basicInfo = null;
        hooks.updateBasicInfo.mockReset();
    });

    test("should render the empty form and supported upload formats", () => {
        render(<BasicInfoComponent />);

        expect(screen.getByRole("heading", { name: "Basic Information" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
        for (const field of ["name", "email", "phone", "address", "about_me", "bio", "website_url", "linked_in_url", "github_url"] as const) {
            expect(getInput(field)).toHaveValue("");
        }
        for (const field of ["avatar_url", "favicon_url"] as const) {
            expect(getInput(field)).toHaveAttribute("type", "file");
            expect(getInput(field)).toHaveAttribute("accept", ".svg,.png,.jpg,.jpeg,.webp");
        }
        expect(getInput("email")).toHaveAttribute("type", "email");
        expect(getInput("phone")).toHaveAttribute("type", "tel");
    });

    test("should validate every required field before saving an empty form", async () => {
        const user = userEvent.setup();
        render(<BasicInfoComponent />);

        await user.click(screen.getByRole("button", { name: "Save" }));

        for (const message of [
            "Name is required", "Email is required", "Phone is required",
            "Profile Picture is required", "Address is required", "About Me is required",
            "Bio is required", "Favicon is required", "Website URL is required",
            "LinkedIn URL is required", "GitHub URL is required",
        ]) {
            expect(await screen.findByText(message)).toBeInTheDocument();
        }
        expect(hooks.updateBasicInfo).not.toHaveBeenCalled();
    });

    test("should populate values when basic info finishes loading", async () => {
        const { rerender } = render(<BasicInfoComponent />);
        expect(getInput("name")).toHaveValue("");

        hooks.basicInfo = basicInfoMock[0];
        rerender(<BasicInfoComponent />);

        await waitFor(() => expect(getInput("name")).toHaveValue(basicInfoMock[0].name));
        for (const field of ["email", "phone", "address", "about_me", "bio", "website_url", "linked_in_url", "github_url"] as const) {
            expect(getInput(field)).toHaveValue(basicInfoMock[0][field]);
        }
    });

    test("should submit updated text while retaining existing image URLs", async () => {
        const user = userEvent.setup();
        hooks.basicInfo = basicInfoMock[0];
        render(<BasicInfoComponent />);
        await user.clear(getInput("name"));
        await user.type(getInput("name"), "Updated Developer");

        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(hooks.updateBasicInfo).toHaveBeenCalledExactlyOnceWith({
            ...basicInfoMock[0],
            name: "Updated Developer",
        }));
        expect(screen.queryByText("Profile Picture is required")).not.toBeInTheDocument();
        expect(screen.queryByText("Favicon is required")).not.toBeInTheDocument();
    });

    test.each([
        { field: "phone", value: "12345", message: "Phone must be at least 10 digits" },
        { field: "phone", value: "123456789a", message: "Phone must be a number" },
        { field: "email", value: "invalid-email", message: "Invalid email address" },
    ] as const)("should reject $field value $value", async ({ field, value, message }) => {
        const user = userEvent.setup();
        hooks.basicInfo = basicInfoMock[0];
        render(<BasicInfoComponent />);
        await user.clear(getInput(field));
        await user.type(getInput(field), value);

        submitForm();

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(hooks.updateBasicInfo).not.toHaveBeenCalled();
    });

    test.each(["avatar_url", "favicon_url"] as const)("should require %s when there is no existing URL", async (field) => {
        hooks.basicInfo = { ...basicInfoMock[0], [field]: "" };
        render(<BasicInfoComponent />);

        submitForm();

        expect(await screen.findByText(field === "avatar_url" ? "Profile Picture is required" : "Favicon is required")).toBeInTheDocument();
        expect(hooks.updateBasicInfo).not.toHaveBeenCalled();
    });

    test("should submit newly selected avatar and favicon files", async () => {
        const user = userEvent.setup();
        const avatar = new File(["avatar"], "avatar.png", { type: "image/png" });
        const favicon = new File(["favicon"], "favicon.svg", { type: "image/svg+xml" });
        hooks.basicInfo = basicInfoMock[0];
        render(<BasicInfoComponent />);
        await user.upload(getInput("avatar_url"), avatar);
        await user.upload(getInput("favicon_url"), favicon);

        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(hooks.updateBasicInfo).toHaveBeenCalledExactlyOnceWith({
            ...basicInfoMock[0],
            avatar_url: expect.objectContaining({ 0: avatar, length: 1 }),
            favicon_url: expect.objectContaining({ 0: favicon, length: 1 }),
        }));
    });
});
