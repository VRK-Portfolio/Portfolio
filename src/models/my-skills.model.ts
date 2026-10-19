import { MySkillsType } from "@/@types/MySkills.types";
import { model, Model, models, Schema } from "mongoose";


const mySkillsSchema = new Schema<MySkillsType>({
    name: { type: String, required: true },
    icon: { type: String, required: true },
    category: { type: String, required: true },
    capabilities: { type: [String], required: true },
    proficiency: { type: String, required: true },
});

export const MySkillsModel: Model<MySkillsType> = (models.MySkills as Model<MySkillsType>) || model<MySkillsType>('MySkills', mySkillsSchema);

