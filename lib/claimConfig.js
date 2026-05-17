export const CLAIM_TABLE = process.env.CLAIM_TABLE || 'claim_videos';
export const CLAIM_BUCKET = process.env.SUPABASE_BUCKET || 'claim-videos';
export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 100);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const CLAIM_EXPIRE_HOURS = Number(process.env.CLAIM_EXPIRE_HOURS || 24);

export function safeFileName(name = 'video.mp4') {
  const cleaned = String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
  return cleaned || 'video.mp4';
}

export function fileExt(name = '', mime = '') {
  const fromName = String(name).split('.').pop();
  if (fromName && fromName.length <= 6 && fromName !== name) return fromName.toLowerCase();
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  return 'mp4';
}
