const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

export const normalizeEmail = (email: string): string =>
  email
    .normalize('NFKC')
    .replace(INVISIBLE_CHARS, '')
    .trim()
    .toLowerCase();
