// Server-only: access code hashing (sha256). Never import from client components.
import { createHash } from 'node:crypto'
import { normCode } from './core'
export const hashCode = (c: string) => createHash('sha256').update(`dl-code:${normCode(c)}`).digest('hex')
