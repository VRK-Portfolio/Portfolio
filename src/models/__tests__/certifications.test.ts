import { describe, expect, test } from "vitest";
import { CertificationModel } from "../certifications.model";
import { mockCertifications } from "@/mocks/certifications";

describe("Certification model dates", () => {
    test("declares both certification dates as required Date fields", () => {
        for (const field of ["issueDate", "expirationDate"]) {
            expect(CertificationModel.schema.path(field).instance).toBe("Date");
            expect(CertificationModel.schema.path(field).options.required).toBe(true);
        }
    });

    test("persists date-only strings as UTC dates and reloads them", async () => {
        const document = await CertificationModel.create({
            ...mockCertifications[0],
            issueDate: "2025-01-01",
            expirationDate: "2027-01-01",
        });
        const saved = await CertificationModel.findById(document._id).orFail();
        expect(saved.issueDate).toEqual(new Date("2025-01-01T00:00:00.000Z"));
        expect(saved.expirationDate).toEqual(new Date("2027-01-01T00:00:00.000Z"));
    });

    test.each(["issueDate", "expirationDate"] as const)("rejects missing or invalid %s", async (field) => {
        for (const value of [undefined, "invalid"]) {
            const document = new CertificationModel({ ...mockCertifications[0], [field]: value });
            await expect(document.validate()).rejects.toMatchObject({ errors: { [field]: expect.anything() } });
        }
    });
});
