/**
 * Design tokens mirroring demo-app's Tailwind palette.
 *
 * The web app leans on Tailwind utility classes; React Native has no such system,
 * so the exact colour values Tailwind would emit are captured here and consumed via
 * StyleSheet. Keeping the same hex values is what makes the two apps look like the
 * same product rather than a reinterpretation.
 */

export const colors = {
  // Greys (Tailwind gray-*)
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Blues
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',

  // Ambers (incoming call)
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',

  // Reds (destructive / muted)
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',

  // Greens (resolved / available)
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',

  // Oranges (unresolved / away)
  orange100: '#ffedd5',
  orange800: '#9a3412',

  // Purples (wrap-up / viewing / private messaging)
  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple200: '#e9d5ff',
  purple600: '#9333ea',
  purple700: '#7e22ce',
  purple800: '#6b21a8',
  purpleBrand: '#5800B1',

  // Brand
  avayaRed: '#DA291C',
  avayaNavy: '#003a51',

  // Status dots
  statusAvailable: '#4CAF50',
  statusBusy: '#f44336',
  statusAway: '#FF9800',
  statusOffline: '#9E9E9E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

export const fontSize = {
  xxs: 9,
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  display: 36,
} as const;

/** Cross-platform elevation. iOS uses shadow*, Android uses elevation. */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;
