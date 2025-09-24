import 'dotenv/config'
import { connectDB } from './config/db'
import { app } from './app'

const PORT = Number(process.env.PORT) || 3001

const uri = process.env.MONGODB_URI

if (!uri) {
  console.error('MONGODB_URI not set in environment')
  process.exit(1)
}

connectDB(uri)
  .then(() => app.listen(PORT, () => console.log(`API on :${PORT}`)))
  .catch((e) => {
    console.error('DB ERROR', e)
    process.exit(1)
  })

export default app
