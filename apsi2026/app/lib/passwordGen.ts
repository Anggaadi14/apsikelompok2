// app/lib/passwordGen.ts
// Helper untuk generate password random alphanumeric (admin create user).

const LOWER = 'abcdefghijkmnopqrstuvwxyz'; // tanpa 'l' agar tidak bingung sama '1'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // tanpa 'I', 'O' agar tidak bingung sama '1', '0'
const DIGIT = '23456789';                  // tanpa '0', '1'
const ALL   = LOWER + UPPER + DIGIT;

/**
 * Generate password acak 10 karakter, kombinasi huruf besar/kecil + angka.
 * Karakter yang ambigu (l, I, O, 0, 1) dihindari biar enak dibaca oleh user.
 */
export function generateRandomPassword(length = 10): string {
  if (length < 8) length = 8;
  // Jamin minimal 1 lower, 1 upper, 1 digit.
  const out: string[] = [
    LOWER[Math.floor(Math.random() * LOWER.length)],
    UPPER[Math.floor(Math.random() * UPPER.length)],
    DIGIT[Math.floor(Math.random() * DIGIT.length)],
  ];
  for (let i = out.length; i < length; i++) {
    out.push(ALL[Math.floor(Math.random() * ALL.length)]);
  }
  // Shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}