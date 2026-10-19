import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockDialogMethods } from "@/tests/dialog";
import Modal from "../Modal";

describe("Modal", () => {
    let dialogMethods: ReturnType<typeof mockDialogMethods>;

    beforeEach(() => {
        dialogMethods = mockDialogMethods();
    });

    afterEach(() => dialogMethods.restore());

    test("should remain closed when isOpen is omitted", () => {
        render(<Modal />);
        const dialog = screen.getByRole("dialog", { hidden: true });

        expect(dialog).toHaveClass("cmp-modal");
        expect(dialog).not.toHaveAttribute("open");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(dialogMethods.showModal).not.toHaveBeenCalled();
        expect(dialogMethods.close).not.toHaveBeenCalled();
    });

    test("should open the dialog and render its title and children", () => {
        render(
            <Modal isOpen title="Manage Skills">
                <p>Modal content</p>
                <input placeholder="Skill name" />
            </Modal>
        );

        expect(screen.getByRole("dialog")).toHaveAttribute("open");
        expect(screen.getByRole("heading", { name: "Manage Skills", level: 3 })).toBeInTheDocument();
        expect(screen.getByText("Modal content")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Skill name")).toBeInTheDocument();
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);
        expect(dialogMethods.close).not.toHaveBeenCalled();
    });

    test("should apply custom classes and remove them when the prop is cleared", () => {
        const { rerender } = render(<Modal isOpen className="custom-modal wide-modal" />);
        expect(screen.getByRole("dialog")).toHaveClass("cmp-modal", "custom-modal", "wide-modal");

        rerender(<Modal isOpen />);

        expect(screen.getByRole("dialog")).toHaveClass("cmp-modal");
        expect(screen.getByRole("dialog")).not.toHaveClass("custom-modal", "wide-modal");
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);
    });

    test("should open, close and reopen as isOpen changes", () => {
        const { rerender } = render(<Modal isOpen={false} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(dialogMethods.close).not.toHaveBeenCalled();

        rerender(<Modal isOpen />);
        expect(screen.getByRole("dialog")).toHaveAttribute("open");
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);

        rerender(<Modal isOpen={false} />);
        expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
        expect(dialogMethods.close).toHaveBeenCalledTimes(1);

        rerender(<Modal isOpen />);
        expect(screen.getByRole("dialog")).toHaveAttribute("open");
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(2);
    });

    test("should not call showModal when the dialog is already open", () => {
        const { container, rerender } = render(<Modal isOpen={false} />);
        container.querySelector("dialog")?.setAttribute("open", "");

        rerender(<Modal isOpen />);

        expect(screen.getByRole("dialog")).toHaveAttribute("open");
        expect(dialogMethods.showModal).not.toHaveBeenCalled();
    });

    test("should call onClose when the close button is clicked", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Modal isOpen onClose={onClose} />);

        await user.click(screen.getByRole("button", { name: "\u00d7" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("should forward a native dialog close event to onClose", () => {
        const onClose = vi.fn();
        const { container } = render(<Modal isOpen onClose={onClose} />);

        act(() => container.querySelector("dialog")?.close());

        expect(dialogMethods.close).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    });

    test("should notify onClose when an open dialog is closed through its props", () => {
        const onClose = vi.fn();
        const { rerender } = render(<Modal isOpen onClose={onClose} />);

        rerender(<Modal isOpen={false} onClose={onClose} />);

        expect(dialogMethods.close).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("should allow closing without an onClose callback", async () => {
        const user = userEvent.setup();
        const { container, rerender } = render(<Modal isOpen />);

        await user.click(screen.getByRole("button", { name: "\u00d7" }));
        act(() => container.querySelector("dialog")?.close());
        expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");

        rerender(<Modal isOpen={false} />);
        expect(dialogMethods.close).toHaveBeenCalledTimes(1);
    });

    test("should update the title and children without reopening the dialog", () => {
        const { rerender } = render(<Modal isOpen title="Add Skill">Add form</Modal>);

        rerender(<Modal isOpen title="Edit Skill">Edit form</Modal>);

        expect(screen.getByRole("heading", { name: "Edit Skill" })).toBeInTheDocument();
        expect(screen.getByText("Edit form")).toBeInTheDocument();
        expect(screen.queryByText("Add form")).not.toBeInTheDocument();
        expect(dialogMethods.showModal).toHaveBeenCalledTimes(1);
        expect(dialogMethods.close).not.toHaveBeenCalled();
    });
});
