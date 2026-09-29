import mongoose from 'mongoose'

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
const g = globalThis as unknown as { __mongo?: Cached }
const cached: Cached = g.__mongo || (g.__mongo = { conn: null, promise: null })

export async function connectDB(uri: string) {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    const options: Parameters<typeof mongoose.connect>[1] = { autoIndex: true }
    if (process.env.MONGODB_DB_NAME) options.dbName = process.env.MONGODB_DB_NAME
    cached.promise = mongoose.connect(uri, options)
  }
  cached.conn = await cached.promise
  return cached.conn
}
