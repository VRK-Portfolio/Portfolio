import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { certificationHandlers, mockCertifications } from "@/mocks/certifications";
import { renderWithQueryClient } from "@/tests/tan-query";
import CertificationComponent from "../Certification";

const server = setupServer(...certificationHandlers);

describe("CertificationComponent", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("should render site headings, certification details, skills and safe credential links", async () => {
        renderWithQueryClient(<CertificationComponent />);
        await screen.findByRole("heading", { name: mockCertifications[0].title });

        expect(screen.getByRole("heading", { name: "Certifications", level: 2 })).toBeInTheDocument();
        for (const [index, certification] of mockCertifications.entries()) {
            expect(screen.getByRole("heading", { name: certification.title })).toBeInTheDocument();
            expect(screen.getByText(`Issuer : ${certification.issuer}`)).toBeInTheDocument();
            expect(screen.getByText(`Issued: ${certification.issueDate}`)).toBeInTheDocument();
            expect(screen.getByText(`Credential ID: ${certification.credentialID}`)).toBeInTheDocument();
            for (const skill of certification.skillsCoverd) {
                expect(screen.getByText(skill)).toBeInTheDocument();
            }
            const link = screen.getAllByRole("link", { name: "View Credential" })[index];
            expect(link).toHaveAttribute("href", certification.credentialURL);
            expect(link).toHaveAttribute("target", "_blank");
            expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    test("should apply custom and admin classes and invoke Add and Edit callbacks", async () => {
        const user = userEvent.setup();
        const modalOpen = vi.fn();
        const { container } = renderWithQueryClient(<CertificationComponent type="admin" className="custom-certifications" modalOpen={modalOpen} />);
        await screen.findByRole("heading", { name: mockCertifications[0].title });

        expect(container.querySelector(".cmp-certification")).toHaveClass("custom-certifications", "cmp-admin__type");
        expect(screen.getByRole("heading", { name: "Admin View of Certifications", level: 4 })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add Certification" }));
        expect(modalOpen).toHaveBeenNthCalledWith(1);
        await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
        expect(modalOpen).toHaveBeenNthCalledWith(2, mockCertifications[1]._id);
    });

    test("should allow admin actions when the optional modal callback is absent", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<CertificationComponent type="admin" />);
        await screen.findByRole("heading", { name: mockCertifications[0].title });

        await user.click(screen.getByRole("button", { name: "Add Certification" }));
        await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

        expect(screen.getAllByRole("link", { name: "View Credential" })).toHaveLength(mockCertifications.length);
    });

    test("should delete the selected certification and refetch the remaining cards", async () => {
        const user = userEvent.setup();
        let certifications = [...mockCertifications];
        const deleteRequest = vi.fn();
        server.use(
            http.get("*/api/certifications", () => HttpResponse.json({ success: true, data: certifications })),
            http.delete("*/api/certifications/:id", ({ params }) => {
                deleteRequest(params.id);
                certifications = certifications.filter((certification) => certification._id !== params.id);
                return HttpResponse.json({ success: true, message: "Deleted" });
            })
        );
        renderWithQueryClient(<CertificationComponent type="admin" />);
        await screen.findByRole("heading", { name: mockCertifications[0].title });

        await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);

        await waitFor(() => {
            expect(screen.queryByRole("heading", { name: mockCertifications[1].title })).not.toBeInTheDocument();
        });
        expect(deleteRequest).toHaveBeenCalledExactlyOnceWith(mockCertifications[1]._id);
        expect(screen.getByRole("heading", { name: mockCertifications[0].title })).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: "View Credential" })).toHaveLength(1);
    });

    test.each([200, 500])("should leave the list empty after an unsuccessful response with status %i", async (status) => {
        server.use(http.get("*/api/certifications", () => HttpResponse.json({ success: false, error: "Unavailable" }, { status })));
        const { queryClient } = renderWithQueryClient(<CertificationComponent />);

        await waitFor(() => expect(queryClient.getQueryState(["certifications"])?.status).toBe("error"));
        expect(screen.getByRole("heading", { name: "Certifications" })).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    test("should render an empty admin list while keeping Add Certification available", async () => {
        server.use(http.get("*/api/certifications", () => HttpResponse.json({ success: true, data: [] })));
        const { queryClient } = renderWithQueryClient(<CertificationComponent type="admin" />);

        await waitFor(() => expect(queryClient.getQueryState(["certifications"])?.status).toBe("success"));
        expect(screen.getByRole("button", { name: "Add Certification" })).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });
});
