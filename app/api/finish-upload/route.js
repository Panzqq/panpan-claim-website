import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { CLAIM_TABLE } from '@/lib/claimConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { token, storagePath } = await req.json();

    if (!token || !storagePath) {
      return NextResponse.json({ success: false, error: 'Token atau path kosong.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(CLAIM_TABLE)
      .update({ status: 'ready' })
      .eq('token', String(token).toUpperCase())
      .eq('storage_path', storagePath);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('finish-upload error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error.' }, { status: 500 });
  }
}
