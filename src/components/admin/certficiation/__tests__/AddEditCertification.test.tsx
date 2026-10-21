import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CertificationType } from "@/@types/Certification.types";
import { mockCertifications } from "@/mocks/certifications";
import AddEditCertification from "../AddEditCertification";

type CertificationMutation = (data: CertificationType, callbacks: {
    onSuccess: () => void;
    onError: (error: Error) => void;
}) => void;

const hooks = vi.hoisted(() => {
    const certifications: CertificationType[] = [];
    return {
        certifications,
        addCertification: vi.fn<CertificationMutation>(),
        updateCertification: vi.fn<CertificationMutation>(),
    };
});

vi.mock("@/hooks/useCertifications", () => ({
    useCertifications: () => ({ certifications: hooks.certifications }),
    useAddCertification: () => ({ addCertification: hooks.addCertification }),
    useUpdateCertifications: () => ({ updateCertification: hooks.updateCertification }),
}));

describe("AddEditCertification", () => {
    const certification = mockCertifications[0];
    const addModal: ComponentProps<typeof AddEditCertification>["modalState"] = {
        isOpen: true, mode: "add", certificationId: null,
    };
    const editModal: ComponentProps<typeof AddEditCertification>["modalState"] = {
        isOpen: true, mode: "edit", certificationId: certification._id,
    };
    const closedModal = { isOpen: false, mode: "add", certificationId: null };
    const renderForm = (modalState = addModal) => {
        const setModalState = vi.fn();
        return {
            ...render(<AddEditCertification modalState={modalState} setModalState={setModalState} />),
            setModalState,
        };
    };
    const fillForm = async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Certification Name"), certification.title);
        await user.type(screen.getByPlaceholderText("Issuer"), certification.issuer);
        await user.type(screen.getByPlaceholderText("Credential ID"), certification.credentialID);
        await user.type(screen.getByPlaceholderText("Issue Date"), certification.issueDate);
        await user.type(screen.getByPlaceholderText("Expiry Date"), certification.expirationDate);
        await user.type(screen.getByPlaceholderText("Credential URL"), certification.credentialURL);
        for (const skill of certification.skillsCoverd) {
            await user.type(screen.getByPlaceholderText("Type and press Enter to add Skills..."), `${skill}{Enter}`);
        }
        return user;
    };

    beforeEach(() => {
        hooks.certifications = mockCertifications;
        hooks.addCertification.mockReset();
        hooks.updateCertification.mockReset();
    });

    test("should render an empty add form", () => {
        renderForm();
        for (const placeholder of ["Certification Name", "Issuer", "Credential ID", "Issue Date", "Expiry Date", "Credential URL"]) {
            expect(screen.getByPlaceholderText(placeholder)).toHaveValue("");
        }
        expect(screen.getByPlaceholderText("Issue Date")).toHaveAttribute("type", "date");
        expect(screen.getByPlaceholderText("Credential URL")).toHaveAttribute("type", "url");
        expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });

    test("should validate every required field before saving", async () => {
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));

        for (const message of [
            "Certification Name is required", "Issuer is required", "Category is required",
            "Issue Date is required", "Expiry Date is required", "Credential URL is required",
            "At least one capability is required",
        ]) {
            expect(await screen.findByText(message)).toBeInTheDocument();
        }
        expect(hooks.addCertification).not.toHaveBeenCalled();
        expect(hooks.updateCertification).not.toHaveBeenCalled();
    });

    test("should trim skills, reject duplicates and ignore empty entries without submitting", async () => {
        const user = userEvent.setup();
        renderForm();
        const input = screen.getByPlaceholderText("Type and press Enter to add Skills...");
        await user.type(input, "  APIs  {Enter}");
        expect(input).toHaveValue("");
        await user.type(input, "APIs{Enter}");
        expect(screen.getAllByText("APIs")).toHaveLength(1);
        await user.clear(input);
        await user.type(input, "   {Enter}");
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
        expect(hooks.addCertification).not.toHaveBeenCalled();
    });

    test("should remove selected skills and validate the final removal", async () => {
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByPlaceholderText("Type and press Enter to add Skills..."), "APIs{Enter}Cloud{Enter}");

        await user.click(screen.getAllByRole("button", { name: "Close" })[0]);
        expect(screen.queryByText("APIs")).not.toBeInTheDocument();
        expect(screen.getByText("Cloud")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Close" }));
        expect(await screen.findByText("At least one capability is required")).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText("Type and press Enter to add Skills..."), "New skill{Enter}");
        await waitFor(() => expect(screen.queryByText("At least one capability is required")).not.toBeInTheDocument());
    });

    test("should submit add data, reset on success and close the modal", async () => {
        const { setModalState } = renderForm();
        const user = await fillForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));

        await waitFor(() => expect(hooks.addCertification).toHaveBeenCalledTimes(1));
        const { _id, ...data } = certification;
        expect(hooks.addCertification.mock.calls[0][0]).toEqual(data);
        expect(_id).toBeDefined();
        expect(setModalState).not.toHaveBeenCalled();
        expect(hooks.updateCertification).not.toHaveBeenCalled();

        act(() => hooks.addCertification.mock.calls[0][1].onSuccess());

        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
        expect(screen.getByPlaceholderText("Certification Name")).toHaveValue("");
        expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });

    test("should show add errors, retain inputs and clear the error after retry success", async () => {
        const { setModalState } = renderForm();
        const user = await fillForm();
        await user.click(screen.getByRole("button", { name: "Submit" }));
        await waitFor(() => expect(hooks.addCertification).toHaveBeenCalledTimes(1));

        act(() => hooks.addCertification.mock.calls[0][1].onError(new Error("Failed to add certification")));

        expect(screen.getByText("Failed to add certification")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title);
        expect(setModalState).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Submit" }));
        await waitFor(() => expect(hooks.addCertification).toHaveBeenCalledTimes(2));

        act(() => hooks.addCertification.mock.calls[1][1].onSuccess());

        expect(screen.queryByText("Failed to add certification")).not.toBeInTheDocument();
        expect(setModalState).toHaveBeenCalledWith(closedModal);
    });

    test("should populate edit fields and submit the selected certification ID", async () => {
        const user = userEvent.setup();
        const { setModalState } = renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title));
        expect(screen.getByPlaceholderText("Issuer")).toHaveValue(certification.issuer);
        expect(screen.getByPlaceholderText("Issue Date")).toHaveValue(certification.issueDate);
        expect(screen.getByPlaceholderText("Expiry Date")).toHaveValue(certification.expirationDate);
        expect(screen.getByPlaceholderText("Credential URL")).toHaveValue(certification.credentialURL);
        for (const skill of certification.skillsCoverd) {
            expect(screen.getByText(skill)).toBeInTheDocument();
        }
        await user.clear(screen.getByPlaceholderText("Certification Name"));
        await user.type(screen.getByPlaceholderText("Certification Name"), "Updated certification");
        await user.click(screen.getByRole("button", { name: "Update Certification" }));

        await waitFor(() => expect(hooks.updateCertification).toHaveBeenCalledTimes(1));
        expect(hooks.updateCertification.mock.calls[0][0]).toEqual({ ...certification, title: "Updated certification" });
        expect(hooks.addCertification).not.toHaveBeenCalled();
        act(() => hooks.updateCertification.mock.calls[0][1].onSuccess());
        expect(setModalState).toHaveBeenCalledWith(closedModal);
    });

    test("should show update errors and clear them after a successful retry", async () => {
        const user = userEvent.setup();
        renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title));
        await user.click(screen.getByRole("button", { name: "Update Certification" }));
        await waitFor(() => expect(hooks.updateCertification).toHaveBeenCalledTimes(1));
        act(() => hooks.updateCertification.mock.calls[0][1].onError(new Error("Update failed")));
        expect(screen.getByText("Update failed")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title);

        await user.click(screen.getByRole("button", { name: "Update Certification" }));
        await waitFor(() => expect(hooks.updateCertification).toHaveBeenCalledTimes(2));
        act(() => hooks.updateCertification.mock.calls[1][1].onSuccess());
        expect(screen.queryByText("Update failed")).not.toBeInTheDocument();
    });

    test("should populate edit data when certifications finish loading", async () => {
        hooks.certifications = [];
        const { rerender, setModalState } = renderForm(editModal);
        expect(screen.getByPlaceholderText("Certification Name")).toHaveValue("");

        hooks.certifications = mockCertifications;
        rerender(<AddEditCertification modalState={editModal} setModalState={setModalState} />);

        await waitFor(() => expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title));
    });

    test("should create rather than update when edit mode has no certification ID", async () => {
        renderForm({ ...editModal, certificationId: null });
        const user = await fillForm();

        await user.click(screen.getByRole("button", { name: "Update Certification" }));

        await waitFor(() => expect(hooks.addCertification).toHaveBeenCalledTimes(1));
        expect(hooks.updateCertification).not.toHaveBeenCalled();
    });

    test("should reset edit fields when switching to add mode", async () => {
        const { rerender, setModalState } = renderForm(editModal);
        await waitFor(() => expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(certification.title));

        rerender(<AddEditCertification modalState={addModal} setModalState={setModalState} />);

        await waitFor(() => expect(screen.getByPlaceholderText("Certification Name")).toHaveValue(""));
        expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });

    test.each([addModal, editModal])("should cancel the $mode form without saving", async (modalState) => {
        const user = userEvent.setup();
        const { setModalState } = renderForm(modalState);

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(setModalState).toHaveBeenCalledExactlyOnceWith(closedModal);
        expect(hooks.addCertification).not.toHaveBeenCalled();
        expect(hooks.updateCertification).not.toHaveBeenCalled();
    });
});
