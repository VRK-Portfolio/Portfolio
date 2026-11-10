import mongoose, { Document, Schema, type Model } from "mongoose";

export interface IVectorDOC extends Document {
    docId: string;
    source: string;
    text: string;
    vector: number[];
    chunkIndex: number;
    skill?: { name: string; capabilities: string[] };
}

export const VectorStoreSchema = new Schema<IVectorDOC>({
    docId: { type: String, required: true },
    source: { type: String, required: true },
    text: { type: String, required: true },
    vector: { type: [Number], required: true },
    chunkIndex: { type: Number, required: true },
    skill: {
        type: new Schema({
            name: { type: String, required: true },
            capabilities: { type: [String], required: true },
        }, { _id: false }),
        required: false,
    },
});

export const VectorStoreModel: Model<IVectorDOC> = mongoose.models.VectorStore || mongoose.model<IVectorDOC>('VectorStore', VectorStoreSchema);