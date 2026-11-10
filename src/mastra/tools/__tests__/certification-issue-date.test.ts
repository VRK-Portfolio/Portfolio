import { beforeEach, describe, expect, test, vi } from "vitest";
import { getCertificationIssueDate, isCertificationIssueDateQuestion } from "../certification-issue-date";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), find: vi.fn() }));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/certifications.model", () => ({ CertificationModel: { find: mocks.find } }));

const title = "Adobe Experience Manager Edge Delivery Services - Developer Professional";
const prompt = `what is the issue date of ${title} certficate`;

function queryResult(records: { title: string; issueDate?: Date | string }[]) {
    const query = { select: vi.fn(), lean: vi.fn(), exec: vi.fn().mockResolvedValue(records) };
    query.select.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => vi.resetAllMocks());

describe("Grounded certification issue dates", () => {
    test.each([
        prompt,
        `What is the issued date of the ${title} certificate?`,
        `When was the ${title} certification issued?`,
        `Date of issuance of ${title} certificate`,
    ])("recognizes issue-date-only requests: %s", question => {
        expect(isCertificationIssueDateQuestion(question)).toBe(true);
    });

    test.each([
        "List all skills",
        "What is the issue date of this blog?",
        `What is the expiration date of ${title} certificate?`,
        `Show issue date and skills of ${title} certificate`,
        `Show issue date and issuer of ${title} certificate`,
        `Compare issue dates of ${title} certificates`,
    ])("preserves other factual or compound questions: %s", question => {
        expect(isCertificationIssueDateQuestion(question)).toBe(false);
    });

    test("returns only the exact named certificate's saved issue date", async () => {
        const query = queryResult([
            { title: "Unrelated certificate", issueDate: new Date("2024-01-01") },
            { title, issueDate: new Date("2025-03-19T00:00:00Z") },
        ]);
        mocks.find.mockReturnValue(query);
        expect(await getCertificationIssueDate(prompt)).toBe("Issue date: 2025-03-19.");
        expect(query.select).toHaveBeenCalledWith("title issueDate");
    });

    test("matches title punctuation and case without inferring the certificate from skills", async () => {
        mocks.find.mockReturnValue(queryResult([{ title, issueDate: "2025-03-19" }]));
        expect(await getCertificationIssueDate(prompt.toUpperCase().replace(" - ", " ")))
            .toBe("Issue date: 2025-03-19.");
        expect(await getCertificationIssueDate("What is the issue date of a React certificate?"))
            .toBe("I could not find that information in the database.");
    });

    test("does not use a partial title match or guess between certifications", async () => {
        mocks.find.mockReturnValue(queryResult([{ title: "Adobe Pro", issueDate: "2025-03-19" }]));
        expect(await getCertificationIssueDate("Issue date of Adobe Professional certificate?"))
            .toBe("I could not find that information in the database.");
        mocks.find.mockReturnValue(queryResult([
            { title, issueDate: "2025-03-19" }, { title, issueDate: "2026-03-19" },
        ]));
        expect(await getCertificationIssueDate(prompt)).toBe("Please specify a single certification title.");
    });

    test("reports a missing saved date instead of fabricating one", async () => {
        mocks.find.mockReturnValue(queryResult([{ title }]));
        expect(await getCertificationIssueDate(prompt)).toBe("No issue date is recorded for this certification.");
    });

    test("surfaces invalid saved dates", async () => {
        mocks.find.mockReturnValue(queryResult([{ title, issueDate: "invalid" }]));
        await expect(getCertificationIssueDate(prompt)).rejects.toThrow("invalid issue date");
    });

    test("propagates database failures without falling back to skills", async () => {
        mocks.connectDB.mockRejectedValue(new Error("Database unavailable"));
        await expect(getCertificationIssueDate(prompt)).rejects.toThrow("Database unavailable");
        expect(mocks.find).not.toHaveBeenCalled();
    });
});
