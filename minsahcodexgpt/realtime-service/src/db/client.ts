import { PrismaClient } from '../generated/prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __realtimePrisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient()
}

const prisma = global.__realtimePrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__realtimePrisma = prisma
}

export { prisma }
