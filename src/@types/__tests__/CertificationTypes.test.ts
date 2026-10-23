import { describe, expect, test } from "vitest";
import { CertificationSchema } from "../Certification.types";
import { mockCertifications } from "@/mocks/certifications";

describe("certification date schema", () => {
    test("accepts Date objects and coerces API date strings", () => {
        const certification = mockCertifications[0];
        expect(CertificationSchema.parse(certification)).toEqual(certification);
        expect(CertificationSchema.parse({
            ...certification,
            issueDate: "2025-01-01",
            expirationDate: "2027-01-01T00:00:00.000Z",
        })).toEqual(certification);
    });

    test.each(["issueDate", "expirationDate"] as const)("rejects missing and malformed %s", (field) => {
        for (const value of [undefined, "", "not-a-date", new Date("invalid")]) {
            expect(CertificationSchema.safeParse({ ...mockCertifications[0], [field]: value }).success).toBe(false);
        }
    });

    test.each([
        { field: "issueDate", message: "Date is required" },
        { field: "expirationDate", message: "Expiration date is required" },
    ])("rejects $field before the supported date range", ({ field, message }) => {
        const result = CertificationSchema.safeParse({ ...mockCertifications[0], [field]: "1969-12-31" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field], message }));
        }
    });
});
