import mongoose from 'mongoose'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db'
import { User } from '../modules/auth/user.model'

async function run() {
  const [, , email, password] = process.argv

  if (!email) {
    console.error('Usage: pnpm --filter ./apps/api promote-admin <email> [password]')
    process.exit(1)
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  await connectDB(process.env.MONGODB_URI)

  let user = await User.findOne({ email })

  if (!user) {
    if (!password) {
      console.error('Password required to create new admin user')
      process.exit(1)
    }
    const hash = await bcrypt.hash(password, 10)
    user = await User.create({ email, hash, role: 'admin', tokenVersion: 0 })
    console.log(`Created admin user ${email} (${user.id})`)
  } else {
    if (user.role !== 'admin') {
      user.role = 'admin'
      await user.save()
      console.log(`Updated ${email} to role admin`)
    } else {
      console.log(`${email} is already an admin`)
    }
  }

  await mongoose.connection.close()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
