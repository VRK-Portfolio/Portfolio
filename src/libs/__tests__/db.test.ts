import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/libs/env", () => ({ env: { MONGODB_URI: "mongodb://localhost/test-connection-cache" } }));

let state: mongoose.ConnectionStates;
let connectDB: typeof import("../db").connectDB;

beforeEach(async () => {
    vi.resetModules();
    global.mongooseCache = undefined;
    state = 0;
    vi.spyOn(mongoose.connection, "readyState", "get").mockImplementation(() => state);
    vi.spyOn(mongoose, "connect").mockImplementation(async () => {
        state = 1;
        return mongoose;
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    ({ connectDB } = await import("../db"));
});

afterEach(() => {
    vi.restoreAllMocks();
    global.mongooseCache = undefined;
});

describe("MongoDB connection readiness", () => {
    test("returns an already connected client without reconnecting", async () => {
        state = 1;
        expect(await connectDB()).toBe(mongoose);
        expect(mongoose.connect).not.toHaveBeenCalled();
    });

    test("shares and awaits one in-flight connection across concurrent cold-start requests", async () => {
        const connection = Promise.withResolvers<typeof mongoose>();
        vi.mocked(mongoose.connect).mockImplementation(() => {
            state = 2;
            return connection.promise;
        });
        const first = connectDB();
        const second = connectDB();
        let secondResolved = false;
        void second.then(() => { secondResolved = true; });
        await Promise.resolve();
        expect(secondResolved).toBe(false);
        expect(mongoose.connect).toHaveBeenCalledOnce();
        state = 1;
        connection.resolve(mongoose);
        expect(await first).toBe(mongoose);
        expect(await second).toBe(mongoose);
    });

    test("does not return a stale cached client after a disconnection", async () => {
        await connectDB();
        state = 0;
        await connectDB();
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
        expect(state).toBe(1);
    });

    test("does not treat a disconnecting client as connected", async () => {
        state = 3;
        await connectDB();
        expect(mongoose.connect).toHaveBeenCalledOnce();
    });

    test("clears a failed connection attempt so the next request can recover", async () => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error("Connection failed"));
        await expect(connectDB()).rejects.toThrow("Connection failed");
        expect(global.mongooseCache?.conn).toBeNull();
        expect(global.mongooseCache?.promise).toBeNull();
        expect(await connectDB()).toBe(mongoose);
        expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });
});
