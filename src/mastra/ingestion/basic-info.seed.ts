import { connectDB } from "@/libs/db";
import { BasicInfoModel } from "@/models/basic-info.model";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import { VectorStoreModel } from "@/models/vector-store.model";

export async function seedBasicInfo() {
    console.log('Seeding basic info vector embeddings...');
    try {
        await connectDB();

        const basicInfo = await BasicInfoModel.findOne().select('name email bio about_me phone linked_in_url github_url website_url').lean().exec();

        if(!basicInfo) {
            throw new Error('No basic info found in the database.');
        }

        const document = [
            `My Name is ${basicInfo.name}`,
            `My Email Address is ${basicInfo.email}`,
            `My Bio is ${basicInfo.bio}`,
            `About Me: ${basicInfo.about_me}`,
            `My Phone Number is ${basicInfo.phone}`,
            `My LinkedIn URL is ${basicInfo.linked_in_url}`,
            `My GitHub URL is ${basicInfo.github_url}`,
            `My Website URL is ${basicInfo.website_url}`
        ]
        const doc = MDocument.fromText(document.join('\n'));
        const chunks = await doc.chunk({
            strategy: 'recursive',
            separators: ['\n\n', '\n', ' '],
            maxSize: 500,
            overlap: 32
        });

        const chunkTexts = chunks.map(chunk => chunk.text);

        const {embeddings} = await embedMany({
            values: chunkTexts,
            model: ollama.embedding('nomic-embed-text')
        });

        await VectorStoreModel.deleteMany({ source: 'basic-info' });

        const docToInser = chunkTexts.map((text, index) => ({
            docId: `basic-info:${index.toString()}`,
            source: 'basic-info',
            text,
            vector: embeddings[index],
            chunkIndex: index
        }));
        await VectorStoreModel.insertMany(docToInser);

    } catch (error) {
        console.error('Error seeding basic info:', error);
    }
}