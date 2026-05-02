import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import prisma from '../src/config/prisma'
import { jest, beforeEach } from '@jest/globals'

jest.mock('../src/config/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}))

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
