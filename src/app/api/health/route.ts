import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/shared/lib/supabase/config'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: isSupabaseConfigured() ? 'supabase' : 'demo',
    timestamp: new Date().toISOString(),
  })
}
