export const ALLOWED_MIME: readonly string[] = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;

export type UploadResult = { ok: true } | { ok: false; reason: 'TYPE' | 'SIZE' | 'COUNT' };

export function validateUpload(
  file: { name: string; type: string; size: number },
  existingCount: number,
): UploadResult {
  if (existingCount >= MAX_FILES) return { ok: false, reason: 'COUNT' };
  if (!ALLOWED_MIME.includes(file.type)) return { ok: false, reason: 'TYPE' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'SIZE' };
  return { ok: true };
}
