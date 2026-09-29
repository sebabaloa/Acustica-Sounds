import 'dotenv/config'
import mongoose from 'mongoose'

async function run() {
  const uri = process.env.E2E_MONGODB_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('E2E_MONGODB_URI or MONGODB_URI must be defined')
    process.exit(1)
  }

  const client = await mongoose.connect(uri)
  try {
    const db = client.connection.db
    if (!db) throw new Error('Database connection missing')
    await db.dropDatabase()
    console.log(`[e2e-reset] dropped database ${db.databaseName}`)
  } finally {
    await client.disconnect()
  }
}

run().catch((error) => {
  console.error('[e2e-reset] failed', error)
  process.exit(1)
})
