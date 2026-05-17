import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { CLAIM_BUCKET, CLAIM_EXPIRE_HOURS, CLAIM_TABLE, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, fileExt, safeFileName } from '@/lib/claimConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

async function createUniqueToken(supabase) {
  for (let i = 0; i < 8; i++) {
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const { data, error } = await supabase
      .from(CLAIM_TABLE)
      .select('token')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return token;
  }
  throw new Error('Gagal membuat token unik. Coba lagi.');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const fileName = safeFileName(body.fileName);
    const mimeType = String(body.mimeType || '');
    const size = Number(body.size || 0);

    if (!mimeType.startsWith('video/')) {
      return json({ success: false, error: 'File harus berupa video.' }, 400);
    }

    if (!size || size > MAX_UPLOAD_BYTES) {
      return json({ success: false, error: `Ukuran maksimal ${MAX_UPLOAD_MB} MB.` }, 400);
    }

    const supabase = getSupabaseAdmin();
    const token = await createUniqueToken(supabase);
    const ext = fileExt(fileName, mimeType);
    const dateFolder = new Date().toISOString().slice(0, 10);
    const storagePath = `${dateFolder}/${token}-${Date.now()}.${ext}`;
    const expiresAt = new Date(Date.now() + CLAIM_EXPIRE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: signed, error: signedError } = await supabase.storage
      .from(CLAIM_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (signedError) throw signedError;

    const { data: publicData } = supabase.storage
      .from(CLAIM_BUCKET)
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from(CLAIM_TABLE).insert({
      token,
      original_name: fileName,
      file_name: `${token}.${ext}`,
      mime_type: mimeType,
      size_bytes: size,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      status: 'uploading',
      expires_at: expiresAt
    });

    if (insertError) throw insertError;

    const botNumber = String(process.env.BOT_NUMBER || '').replace(/\D/g, '');

    return json({
      success: true,
      token,
      storagePath,
      uploadToken: signed.token,
      signedUrl: signed.signedUrl || signed.signedURL,
      botNumber,
      claimMessage: `.claim ${token}`,
      redirectUrl: botNumber ? `https://wa.me/${botNumber}?text=${encodeURIComponent(`.claim ${token}`)}` : null
    });
  } catch (error) {
    console.error('create-upload error:', error);
    return json({ success: false, error: error.message || 'Server error.' }, 500);
  }
}
