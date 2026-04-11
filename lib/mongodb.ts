import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://nexusraman:Dignity!2301@machinisthub.8zm6r.mongodb.net/MachinistHub?retryWrites=true&w=majority'

if (!MONGODB_URI) {
  throw new Error('Please define MONGO_URI in .env.local')
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
