export const colors = {
  bg: '#05060F',
  bgElevated: '#0B0D22',
  surface: 'rgba(20, 24, 58, 0.55)',
  surfaceStrong: 'rgba(28, 32, 76, 0.85)',
  border: 'rgba(120, 140, 255, 0.18)',
  borderStrong: 'rgba(0, 240, 255, 0.45)',
  text: '#EEF2FF',
  textDim: '#9AA3C7',
  textFaint: '#5F678F',
  cyan: '#00F0FF',
  violet: '#8B5CF6',
  magenta: '#FF3CAC',
  green: '#25D366',
  amber: '#FFB547',
  red: '#FF4D6D',
};

export const gradients = {
  primary: ['#00F0FF', '#8B5CF6'] as const,
  whatsapp: ['#25D366', '#00C2A8'] as const,
  danger: ['#FF4D6D', '#FF3CAC'] as const,
  card: ['rgba(30, 36, 90, 0.65)', 'rgba(12, 14, 40, 0.65)'] as const,
  aurora: ['#8B5CF6', '#FF3CAC', '#00F0FF'] as const,
};

export const fonts = {
  display: 'Orbitron_800ExtraBold',
  displayMedium: 'Orbitron_600SemiBold',
  body: 'SpaceGrotesk_400Regular',
  bodyMedium: 'SpaceGrotesk_500Medium',
  bodyBold: 'SpaceGrotesk_700Bold',
  /** Orbitron's slashed zero reads like a missing glyph, so numbers use this. */
  number: 'SpaceGrotesk_700Bold',
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32 };

/** Deterministic neon gradient per contact, used for avatars. */
const avatarPairs: [string, string][] = [
  ['#00F0FF', '#8B5CF6'],
  ['#FF3CAC', '#8B5CF6'],
  ['#25D366', '#00C2A8'],
  ['#FFB547', '#FF3CAC'],
  ['#8B5CF6', '#3B82F6'],
  ['#00C2A8', '#00F0FF'],
];

export function avatarGradient(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return avatarPairs[Math.abs(h) % avatarPairs.length];
}
