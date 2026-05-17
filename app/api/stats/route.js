import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { CLAIM_TABLE } from '@/lib/claimConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function countRows(supabase, builder) {
  const { count, error } = await builder.select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [total, ready, claimed, failed, today, week, month] = await Promise.all([
      countRows(supabase, supabase.from(CLAIM_TABLE)),
      countRows(supabase, supabase.from(CLAIM_TABLE).eq('status', 'ready')),
      countRows(supabase, supabase.from(CLAIM_TABLE).eq('status', 'claimed')),
      countRows(supabase, supabase.from(CLAIM_TABLE).eq('status', 'failed')),
      countRows(supabase, supabase.from(CLAIM_TABLE).gte('created_at', startToday)),
      countRows(supabase, supabase.from(CLAIM_TABLE).gte('created_at', startWeek)),
      countRows(supabase, supabase.from(CLAIM_TABLE).gte('created_at', startMonth))
    ]);

    return NextResponse.json({ success: true, total, ready, claimed, failed, today, week, month });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
