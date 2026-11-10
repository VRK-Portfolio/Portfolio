import { Mastra } from "@mastra/core";
import { ragAgent } from "./agents/ragAgent";
import { mongoVector } from "./vector";

export const mastra = new Mastra({
    agents: {ragAgent},
    vectors: {mongoVector}
})