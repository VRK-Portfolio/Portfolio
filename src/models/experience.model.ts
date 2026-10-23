

import { ExperienceType, PositionType } from "@/@types/Experience.types";
import mongoose, { Schema } from "mongoose";

export const PositionSchema = new mongoose.Schema<PositionType>({
    role: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isCurrentPosition: { type: Boolean, required: true },
    description: { type: String, required: true },
});

export const ExperienceSchema = new Schema<ExperienceType>({
    company: { type: String, required: true },
    location: { type: String, required: true },
    responsibilites: { type: [String], required: true },
    positions: { type: [PositionSchema], validate: [
        (val: PositionType[]) => val.length > 0
    ], required: true },
});

export const Experience = mongoose.models.Experience || mongoose.model<ExperienceType>("Experience", ExperienceSchema);