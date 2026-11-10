import { beforeEach, describe, expect, test, vi } from "vitest";
import { seedDocuments, toPlainText } from "../seed-documents";

const mocks = vi.hoisted(() => ({
    embedMany: vi.fn(),
    bulkWrite: vi.fn(),
    deleteMany: vi.fn(),
}));

vi.mock("ai", () => ({ embedMany: mocks.embedMany }));
vi.mock("ollama-ai-provider-v2", () => ({
    ollama: { embedding: vi.fn().mockReturnValue("local-embedding-model") },
}));
vi.mock("@/models/vector-store.model", () => ({ VectorStoreModel: mocks }));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.embedMany.mockImplementation(async ({ values }: { values: string[] }) => ({
        embeddings: values.map(() => [0.1, 0.2, 0.3]),
    }));
    mocks.bulkWrite.mockResolvedValue({});
    mocks.deleteMany.mockResolvedValue({});
});

describe("RAG document ingestion", () => {
    test("converts HTML to readable text without joining neighboring words", () => {
        expect(toPlainText(
            '<p>React &amp; TypeScript</p><p>&quot;Skills&quot; &#39;code&#39; &#x1F680;&nbsp;</p><script>hidden()</script><style>body{}</style>',
        )).toBe('React & TypeScript "Skills" \'code\' \u{1f680}');
        expect(toPlainText("&lt;code&gt; &unknown; &#1114112;")).toBe("<code> &unknown; &#1114112;");
    });

    test("chunks long records with context, embeddings, and stable source-scoped IDs", async () => {
        const document = { id: "blog-123", context: "Blog: Testing", text: "A useful sentence about testing. ".repeat(80) };
        const count = await seedDocuments("blogs", [document]);
        expect(count).toBeGreaterThan(1);
        const { values } = mocks.embedMany.mock.calls[0][0] as { values: string[] };
        expect(values).toHaveLength(count);
        expect(values.every(value => value.startsWith("Blog: Testing\n") &&
            value.length <= 500 + "Blog: Testing\n".length)).toBe(true);
        const operations = mocks.bulkWrite.mock.calls[0][0];
        expect(operations[0]).toEqual({
            updateOne: {
                filter: { source: "blogs", docId: "blogs:blog-123:0" },
                update: { $set: {
                    docId: "blogs:blog-123:0", source: "blogs", chunkIndex: 0,
                    text: values[0], vector: [0.1, 0.2, 0.3],
                } },
                upsert: true,
            },
        });
        expect(mocks.deleteMany).toHaveBeenCalledWith({
            source: "blogs",
            docId: { $nin: Array.from({ length: count }, (_, index) => `blogs:blog-123:${index}`) },
        });
        expect(mocks.bulkWrite.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteMany.mock.invocationCallOrder[0]);
        await seedDocuments("blogs", [document]);
        expect(mocks.bulkWrite.mock.calls[1][0]).toEqual(operations);
    });

    test("clears stale vectors for an empty source without calling the embedding model", async () => {
        expect(await seedDocuments("certifications", [])).toBe(0);
        expect(mocks.embedMany).not.toHaveBeenCalled();
        expect(mocks.bulkWrite).not.toHaveBeenCalled();
        expect(mocks.deleteMany).toHaveBeenCalledWith({ source: "certifications", docId: { $nin: [] } });
    });

    test("persists complete skill capabilities on every embedded chunk", async () => {
        const skill = { name: "MongoDB", capabilities: ["One, with commas", "Two"] };
        const count = await seedDocuments("skills", [{
            id: "skill-id", context: "Skill: MongoDB", text: "Saved capability details. ".repeat(80), skill,
        }]);
        expect(count).toBeGreaterThan(1);
        const operations = mocks.bulkWrite.mock.calls[0][0];
        expect(operations).toHaveLength(count);
        for (const operation of operations) {
            expect(operation.updateOne.update.$set).toMatchObject({ source: "skills", skill, vector: [0.1, 0.2, 0.3] });
        }
        expect(mocks.deleteMany).toHaveBeenCalledWith({
            source: "skills", docId: { $nin: expect.arrayContaining(["skills:skill-id:0"]) },
        });
    });

    test("does not write or delete vectors when embedding fails", async () => {
        mocks.embedMany.mockRejectedValue(new Error("Ollama unavailable"));
        await expect(seedDocuments("experience", [{ id: "1", context: "Role", text: "Developer" }]))
            .rejects.toThrow("Ollama unavailable");
        expect(mocks.bulkWrite).not.toHaveBeenCalled();
        expect(mocks.deleteMany).not.toHaveBeenCalled();
    });

    test.each([
        [], [[]], [[NaN]], [[Infinity]], [[0, 0]],
    ])("rejects invalid embeddings %j before writing", async (...vectors) => {
        mocks.embedMany.mockResolvedValue({ embeddings: vectors });
        await expect(seedDocuments("blogs", [{ id: "1", context: "Blog", text: "Content" }]))
            .rejects.toThrow("Invalid embeddings");
        expect(mocks.bulkWrite).not.toHaveBeenCalled();
        expect(mocks.deleteMany).not.toHaveBeenCalled();
    });

    test("does not remove stale chunks if a write fails", async () => {
        mocks.bulkWrite.mockRejectedValue(new Error("Database write failed"));
        await expect(seedDocuments("blogs", [{ id: "1", context: "Blog", text: "Content" }]))
            .rejects.toThrow("Database write failed");
        expect(mocks.deleteMany).not.toHaveBeenCalled();
    });
});
