import { MongoDBVector } from '@mastra/mongodb';

import dotenv from 'dotenv';

dotenv.config({path: '.env.local'});

if(!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}
export const mongoVector = new MongoDBVector({
  uri: process.env.MONGODB_URI as string,
  dbName: 'test',
  id: 'mongodb-vector'
});


