import { createFont, createTamagui } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';
import { createMedia } from '@tamagui/react-native-media-driver';
import { createAnimations } from '@tamagui/animations-react-native';

const animations = createAnimations({
  fast: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: 'spring',
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
  slow: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  bouncy: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  lazy: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
});

const headingFont = createFont({
  family: 'Jost_700Bold',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
    11: 56,
    12: 64,
    13: 72,
    14: 92,
    15: 114,
    16: 134,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    8: '800',
  },
  letterSpacing: {
    4: 0,
    5: -0.5,
    6: -1,
    7: -1.5,
  },
  face: {
    400: { normal: 'Jost_400Regular' },
    500: { normal: 'Jost_500Medium' },
    600: { normal: 'Jost_600SemiBold' },
    700: { normal: 'Jost_700Bold' },
    800: { normal: 'Jost_800ExtraBold' },
  },
});

const bodyFont = createFont({
  family: 'Jost_400Regular',
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 15,
    6: 16,
    7: 18,
    8: 20,
    9: 22,
    10: 24,
  },
  lineHeight: {
    1: 19,
    2: 20,
    3: 21,
    4: 22,
    5: 23,
    6: 24,
    7: 26,
    8: 28,
    9: 30,
    10: 32,
  },
  weight: {
    1: '400',
    2: '500',
    3: '600',
    4: '700',
  },
  face: {
    400: { normal: 'Jost_400Regular' },
    500: { normal: 'Jost_500Medium' },
    600: { normal: 'Jost_600SemiBold' },
    700: { normal: 'Jost_700Bold' },
  },
});

// Mirrors the main app token contract (Midnight + Daylight)
const glassColors = {
  // Accent system from main app
  brandPrimary: '#E8520A',
  brandSecondary: '#CC4709',

  // Midnight (dark)
  darkBg: '#0A0A0A',
  darkBgElevated: '#1A1A1A',
  darkSurface: '#141414',
  darkGlass: '#141414',
  darkGlassBorder: '#262626',
  darkGlassHover: '#1E1E1E',

  // Text on midnight
  darkTextPrimary: '#EDEDED',
  darkTextSecondary: '#888888',
  darkTextTertiary: '#555555',
  darkTextMuted: '#777777',

  // Daylight (light)
  lightBg: '#F4F3EF',
  lightBgElevated: '#FFFFFF',
  lightSurface: '#EBE9E0',
  lightGlass: '#FFFFFF',
  lightGlassBorder: '#D6D0C2',

  // Text on daylight
  lightTextPrimary: '#15120F',
  lightTextSecondary: '#5C5246',
  lightTextTertiary: '#766B5E',

  // Status colors
  success: '#34D399',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#3B82F6',
};

const config = createTamagui({
  animations,
  defaultTheme: 'dark',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    ...themes,
    dark: {
      ...themes.dark,
      // Backgrounds
      background: glassColors.darkBg,
      backgroundHover: glassColors.darkGlassHover,
      backgroundPress: glassColors.darkSurface,
      backgroundFocus: glassColors.darkGlass,
      backgroundStrong: glassColors.darkBgElevated,
      backgroundTransparent: 'transparent',

      // Glass surfaces
      glass: glassColors.darkGlass,
      glassBorder: glassColors.darkGlassBorder,
      surface: glassColors.darkSurface,

      // Text
      color: glassColors.darkTextPrimary,
      colorHover: glassColors.darkTextPrimary,
      colorPress: glassColors.darkTextSecondary,
      colorFocus: glassColors.darkTextPrimary,
      colorSecondary: glassColors.darkTextSecondary,
      colorTertiary: glassColors.darkTextTertiary,
      colorMuted: glassColors.darkTextMuted,

      // Borders
      borderColor: glassColors.darkGlassBorder,
      borderColorHover: '#3A3A3A',
      borderColorFocus: glassColors.brandPrimary,

      // Other
      placeholderColor: glassColors.darkTextMuted,

      // Brand
      primary: glassColors.brandPrimary,
      primaryHover: '#CC4709',
      primaryPress: '#B53F08',
      secondary: glassColors.brandSecondary,

      // Input
      inputBg: glassColors.darkGlass,
      inputBorder: glassColors.darkGlassBorder,

      // Semantic
      success: glassColors.success,
      warning: glassColors.warning,
      error: glassColors.error,
      info: glassColors.info,

      // Chat bubbles
      bubbleUser: glassColors.brandPrimary,
      bubbleAssistant: glassColors.darkGlass,
    },
    light: {
      ...themes.light,
      // Backgrounds
      background: glassColors.lightBg,
      backgroundHover: glassColors.lightSurface,
      backgroundPress: glassColors.lightSurface,
      backgroundFocus: glassColors.lightGlass,
      backgroundStrong: glassColors.lightBgElevated,
      backgroundTransparent: 'transparent',

      // Glass surfaces
      glass: glassColors.lightGlass,
      glassBorder: glassColors.lightGlassBorder,
      surface: glassColors.lightSurface,

      // Text
      color: glassColors.lightTextPrimary,
      colorHover: glassColors.lightTextPrimary,
      colorPress: glassColors.lightTextSecondary,
      colorFocus: glassColors.lightTextPrimary,
      colorSecondary: glassColors.lightTextSecondary,
      colorTertiary: glassColors.lightTextTertiary,
      colorMuted: '#8A7E70',

      // Borders
      borderColor: glassColors.lightGlassBorder,
      borderColorHover: '#BFB7A6',
      borderColorFocus: glassColors.brandPrimary,

      // Other
      placeholderColor: '#8A7E70',

      // Brand
      primary: glassColors.brandPrimary,
      primaryHover: '#CC4709',
      primaryPress: '#B53F08',
      secondary: glassColors.brandSecondary,

      // Input
      inputBg: glassColors.lightGlass,
      inputBorder: glassColors.lightGlassBorder,

      // Semantic
      success: glassColors.success,
      warning: glassColors.warning,
      error: glassColors.error,
      info: glassColors.info,

      // Chat bubbles
      bubbleUser: glassColors.brandPrimary,
      bubbleAssistant: '#EBE9E0',
    },
  },
  tokens: {
    ...tokens,
    color: {
      ...tokens.color,
      ...glassColors,
    },
    radius: {
      ...tokens.radius,
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 40,
      10: 48,
      true: 12,
    },
    size: {
      ...tokens.size,
      buttonHeight: 50,
      inputHeight: 50,
    },
  },
  media: createMedia({
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  }),
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  // Tamagui uses module augmentation here; this empty extension is intentional.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
