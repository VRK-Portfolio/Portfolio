'use server';
import mongoose from 'mongoose';
import { env } from './env';

interface MongooseCache {
    conn: typeof import("mongoose") | null;
    promise: Promise<typeof import("mongoose")> | null;
};

declare global {
    var mongooseCache: MongooseCache | undefined;
};

const cached = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
    global.mongooseCache = cached;
}


export const connectDB = async(): Promise<typeof mongoose> => {

    if (mongoose.connection.readyState >= 1) {
        return mongoose;
    }
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable mongoose buffering
        }
        console.log('Connecting to MongoDB...');
        console.log('MongoDB URI:', env.MONGODB_URI);
        cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongooseInstance) => {
            return mongooseInstance;
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}