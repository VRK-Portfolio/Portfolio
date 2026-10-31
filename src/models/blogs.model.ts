import { BlogType } from "@/@types/Blogs.types";
import mongoose, { Schema, Model, model } from "mongoose";

const BlogsSchema = new Schema<BlogType>({
    title: { type: String, required: true },
    slug: { type: String, required: true },
    category: { type: String, required: true },
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "MySkills" }],
    content: { type: String, required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    author: { type: String, default: "Vijay Rameshkumar" },
    createdAt: { type: String, required: false },
    coverImage: { type: String, required: false },
    updatedAt: { type: String, required: false }
});

export const BlogModel: Model<BlogType> = mongoose.models.Blog || model<BlogType>('Blog', BlogsSchema);
