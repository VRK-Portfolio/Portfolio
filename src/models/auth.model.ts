
import mongoose, { Schema, Document, Model } from "mongoose";

export const AuthSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true });

export interface IAuth extends Document {
    email: string;
    password: string;
}

export const AuthModel: Model<IAuth> = mongoose.models.Auth || mongoose.model<IAuth>("Auth", AuthSchema);
