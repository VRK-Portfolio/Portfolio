import { beforeEach, describe, expect, test, vi } from "vitest";
import { seedBlogs } from "../blogs.seed";
import { seedCertifications } from "../certifications.seed";
import { seedExperience } from "../experience.seed";
import { seedSkills } from "../skills.seed";

const mocks = vi.hoisted(() => ({
    connectDB: vi.fn(),
    blogs: vi.fn(),
    certifications: vi.fn(),
    experience: vi.fn(),
    skills: vi.fn(),
    seedDocuments: vi.fn(),
}));
vi.mock("@/libs/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/blogs.model", () => ({ BlogModel: { find: mocks.blogs } }));
vi.mock("@/models/certifications.model", () => ({ CertificationModel: { find: mocks.certifications } }));
vi.mock("@/models/experience.model", () => ({ Experience: { find: mocks.experience } }));
vi.mock("@/models/my-skills.model", () => ({ MySkillsModel: { find: mocks.skills } }));
vi.mock("../seed-documents", async importOriginal => ({
    ...await importOriginal<typeof import("../seed-documents")>(),
    seedDocuments: mocks.seedDocuments,
}));

function queryResult(records: unknown[]) {
    const query = {
        populate: vi.fn(),
        lean: vi.fn(),
        exec: vi.fn().mockResolvedValue(records),
    };
    query.populate.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    return query;
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.seedDocuments.mockResolvedValue(1);
});

describe("Portfolio collection conversions", () => {
    test("indexes skill capabilities using embeddings and lossless structured metadata", async () => {
        mocks.skills.mockReturnValue(queryResult([{
            _id: "skill-id", name: "MongoDB", capabilities: ["One, with commas", "Two"],
            category: "Backend", proficiency: "Advanced",
        }]));
        expect(await seedSkills()).toBe(1);
        expect(mocks.seedDocuments).toHaveBeenCalledWith("skills", [{
            id: "skill-id", context: "Skill: MongoDB",
            text: "Core capabilities:\n- One, with commas\n- Two\nCategory: Backend\nProficiency: Advanced",
            skill: { name: "MongoDB", capabilities: ["One, with commas", "Two"] },
        }]);
    });

    test("loads only published blogs with skill names and converts rich-text content", async () => {
        const query = queryResult([{
            _id: "blog-id", title: "React patterns", slug: "react-patterns", category: "Frontend",
            author: "Author", createdAt: new Date("2026-01-02"), updatedAt: new Date("2026-02-03"),
            skills: [{ name: "React" }, { name: "TypeScript" }],
            content: "<h2>Components</h2><p>Hooks &amp; state.</p>",
        }]);
        mocks.blogs.mockReturnValue(query);
        expect(await seedBlogs()).toBe(1);
        expect(mocks.connectDB).toHaveBeenCalledOnce();
        expect(mocks.blogs).toHaveBeenCalledWith({ status: "published" });
        expect(query.populate).toHaveBeenCalledWith({ path: "skills", select: "name" });
        expect(mocks.seedDocuments).toHaveBeenCalledWith("blogs", [{
            id: "blog-id", context: "Blog: React patterns\nURL: /blogs/react-patterns",
            text: [
                "Title: React patterns", "Category: Frontend", "Author: Author",
                "Published: 2026-01-02", "Updated: 2026-02-03",
                "Skills: React, TypeScript", "Content: Components Hooks & state.",
            ].join("\n"),
        }]);
    });

    test("does not include missing optional blog fields as undefined", async () => {
        mocks.blogs.mockReturnValue(queryResult([{
            _id: "1", title: "Minimal", slug: "minimal", category: "Code", content: "<p>Hello</p>",
        }]));
        await seedBlogs();
        const documents = mocks.seedDocuments.mock.calls[0][1];
        expect(documents[0].text).toBe("Title: Minimal\nCategory: Code\nContent: Hello");
    });

    test("includes all certification facts with UTC calendar dates", async () => {
        mocks.certifications.mockReturnValue(queryResult([{
            _id: "cert-id", title: "Cloud Developer", issuer: "Provider",
            issueDate: new Date("2025-01-02T00:00:00Z"),
            expirationDate: new Date("2027-01-02T00:00:00Z"),
            credentialID: "credential-123", credentialURL: "https://example.com/credential",
            skillsCoverd: ["Cloud", "Architecture"],
        }]));
        await seedCertifications();
        expect(mocks.seedDocuments).toHaveBeenCalledWith("certifications", [{
            id: "cert-id", context: "Certification: Cloud Developer\nIssuer: Provider",
            text: [
                "Title: Cloud Developer", "Issuer: Provider", "Issued: 2025-01-02",
                "Expires: 2027-01-02", "Credential ID: credential-123",
                "Credential URL: https://example.com/credential", "Skills covered: Cloud, Architecture",
            ].join("\n"),
        }]);
    });

    test("creates a document for each position, preserving company and current/past dates", async () => {
        mocks.experience.mockReturnValue(queryResult([{
            _id: "company-id", company: "Example", location: "Remote", responsibilites: ["Design", "Build"],
            positions: [
                { _id: "role-1", role: "Senior Developer", startDate: new Date("2025-01-01"),
                    endDate: new Date("2026-01-01"), isCurrentPosition: true, description: "<p>Leading teams</p>" },
                { _id: "role-2", role: "Developer", startDate: new Date("2023-01-01"),
                    endDate: new Date("2024-12-31"), isCurrentPosition: false, description: "Built systems" },
                { role: "Intern", startDate: new Date("2022-01-01"),
                    isCurrentPosition: false, description: "Learning" },
            ],
        }]));
        await seedExperience();
        const [source, documents] = mocks.seedDocuments.mock.calls[0];
        expect(source).toBe("experience");
        expect(documents).toHaveLength(3);
        expect(documents[0]).toEqual({
            id: "company-id:role-1", context: "Experience: Example\nRole: Senior Developer",
            text: [
                "Company: Example", "Location: Remote", "Responsibilities: Design, Build",
                "Role: Senior Developer", "Start date: 2025-01-01", "End date: Present",
                "Current position: Yes", "Description: Leading teams",
            ].join("\n"),
        });
        expect(documents[1].text).toContain("End date: 2024-12-31");
        expect(documents[1].text).toContain("Current position: No");
        expect(documents[2].id).toBe("company-id:2");
        expect(documents[2].text).toContain("End date: Not specified");
    });

    test.each([
        ["blogs", seedBlogs, mocks.blogs],
        ["certifications", seedCertifications, mocks.certifications],
        ["experience", seedExperience, mocks.experience],
        ["skills", seedSkills, mocks.skills],
    ] as const)("passes an empty %s collection through for stale-chunk cleanup", async (source, seed, find) => {
        find.mockReturnValue(queryResult([]));
        await seed();
        expect(mocks.seedDocuments).toHaveBeenCalledWith(source, []);
    });

    test("propagates database failures without changing vectors", async () => {
        mocks.blogs.mockReturnValue({ populate: () => { throw new Error("Database unavailable"); } });
        await expect(seedBlogs()).rejects.toThrow("Database unavailable");
        expect(mocks.seedDocuments).not.toHaveBeenCalled();
    });

    test("does not swallow skill embedding failures or report success", async () => {
        mocks.skills.mockReturnValue(queryResult([]));
        mocks.seedDocuments.mockRejectedValueOnce(new Error("Embedding unavailable"));
        await expect(seedSkills()).rejects.toThrow("Embedding unavailable");
    });
});
