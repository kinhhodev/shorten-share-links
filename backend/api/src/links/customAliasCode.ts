import { CustomAliasSchema } from '@ssl/shared';

/**
 * Sinh mã code cho lần thử thứ `attempt` (0-based) khi user nhập custom alias.
 * - attempt 0: đúng slug gốc (đã pass Zod).
 * - attempt ≥ 1: `{baseTrimmed}-{attempt}` (ví dụ hoc-tieng-anh-1, hoc-tieng-anh-2).
 */
export function codeForCustomAliasAttempt(baseSlug: string, attempt: number): string | null {
  if (attempt < 0) return null;
  if (attempt === 0) return baseSlug.slice(0, 64);

  const suffix = `-${attempt}`;
  const maxBaseLen = 64 - suffix.length;
  if (maxBaseLen < 1) return null;

  let b = baseSlug.length <= maxBaseLen ? baseSlug : baseSlug.slice(0, maxBaseLen);
  b = b.replace(/-+$/g, '');
  if (!b) b = 'x';

  const candidate = `${b}${suffix}`;
  const parsed = CustomAliasSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
