import "dotenv/config"
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'admin@schedai.com'
  const password = 'adminpassword123'
  
  const passwordHash = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    }
  })
  
  console.log(`Admin account ready: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })