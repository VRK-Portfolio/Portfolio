import { BasicInfoType } from '@/@types/BasicInfo.types'
import { Schema, model, models, Model } from 'mongoose'

const basicInfoSchema = new Schema<BasicInfoType & { singleton_key: string }>({
    singleton_key: { type: String, default: 'SINGLETON_BASIC_INFO', unique: true, immutable: true, select: false },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    website_url: { type: String, required: true, trim: true },
    avatar_url: { type: String, required: true, trim: true },
    favicon_url: { type: String, required: true, trim: true },
    github_url: { type: String, required: true, trim: true },
    linked_in_url: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    about_me: { type: String, required: true, trim: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

export const BasicInfoModel: Model<BasicInfoType & { singleton_key: string }> =
    (models['basic-info'] as Model<BasicInfoType & { singleton_key: string }>) ||
    model<BasicInfoType & { singleton_key: string }>('basic-info', basicInfoSchema);