import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import { VectorStoreModel } from "@/models/vector-store.model";

type Source = "basic-info" | "blogs" | "certifications" | "experience" | "skills";

interface SourceDocument {
    id: string;
    context: string;
    text: string;
    skill?: { name: string; capabilities: string[] };
}

export function toPlainText(html: string): string {
    const entities: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    };
    return html
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, value: string) => {
            if (!value.startsWith("#")) return entities[value.toLowerCase()] ?? entity;
            const code = value[1].toLowerCase() === "x"
                ? parseInt(value.slice(2), 16) : parseInt(value.slice(1), 10);
            return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
                ? String.fromCodePoint(code) : entity;
        })
        .replace(/\s+/g, " ")
        .trim();
}

export async function seedDocuments(source: Source, documents: SourceDocument[]) {
    const chunks: (Pick<SourceDocument, "skill"> & { docId: string; source: Source; text: string; chunkIndex: number })[] = [];

    for (const document of documents) {
        const parts = await MDocument.fromText(document.text).chunk({
            strategy: "recursive",
            separators: ["\n\n", "\n", " ", ""],
            maxSize: 500,
            overlap: 32,
        });
        parts.forEach((part, chunkIndex) => {
            chunks.push({
                docId: `${source}:${document.id}:${chunkIndex}`,
                source,
                text: `${document.context}\n${part.text}`,
                chunkIndex,
                ...(document.skill ? { skill: document.skill } : {}),
            });
        });
    }


    if (chunks.length) {
        const { embeddings } = await embedMany({
            model: ollama.embedding("nomic-embed-text"),
            values: chunks.map(chunk => chunk.text),
        });
        if (embeddings.length !== chunks.length || embeddings.some(vector =>
            !vector.length || vector.length !== embeddings[0].length ||
            !vector.every(Number.isFinite) || !vector.some(value => value !== 0))) {
            throw new Error(`Invalid embeddings returned for ${source}; existing vectors were not changed.`);
        }

        await VectorStoreModel.bulkWrite(chunks.map((chunk, index) => ({
            updateOne: {
                filter: { source, docId: chunk.docId },
                update: { $set: { ...chunk, vector: embeddings[index] } },
                upsert: true,
            },
        })));
    }

    await VectorStoreModel.deleteMany({
        source,
        docId: { $nin: chunks.map(chunk => chunk.docId) },
    });
    return chunks.length;
}
