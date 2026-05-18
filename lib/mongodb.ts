import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {
  serverSelectionTimeoutMS: 10000,
};

declare global {
  var _mrnineMongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise = uri
  ? (global._mrnineMongoClientPromise ?? new MongoClient(uri, options).connect())
  : undefined;

if (process.env.NODE_ENV !== "production" && clientPromise) {
  global._mrnineMongoClientPromise = clientPromise;
}

export default clientPromise;
