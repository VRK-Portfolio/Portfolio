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

    if (mongoose.connection.readyState === 1) {
        cached.conn = mongoose;
        return mongoose;
    }
    if (cached.conn) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable mongoose buffering
        }
        console.log('Connecting to MongoDB...');
        cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongooseInstance) => {
            cached.conn = mongooseInstance;
            console.log('MongoDB connected successfully');
            return mongooseInstance;
        }).catch((err) => {
            console.error('Error connecting to MongoDB:', err);
            cached.conn = null;
            cached.promise = null;
            throw err;
        });
    }
    return cached.promise;
}