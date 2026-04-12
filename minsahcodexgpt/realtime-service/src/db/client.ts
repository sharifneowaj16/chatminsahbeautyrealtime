import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../prisma/generated/prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __realtimePrisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const adapter = new PrismaPg(connectionString)
  return new PrismaClient({ adapter })
}

const prisma = global.__realtimePrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__realtimePrisma = prisma
}

export { prisma }
