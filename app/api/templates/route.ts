import { NextResponse } from 'next/server'
import { templates } from '@/data/templates'

export async function GET() {
  return NextResponse.json(templates)
}
