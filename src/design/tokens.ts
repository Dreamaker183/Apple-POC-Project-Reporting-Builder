/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Human Interface Guidelines — Design Token System
 *
 * Centralizes all color, typography, spacing, radius, shadow, and motion
 * values used across the application. Components should reference these
 * tokens instead of hardcoded values for consistent Apple-style rendering.
 */

export const AppleTokens = {
  color: {
    // Semantic label colors
    labelPrimary: '#1D1D1F',
    labelSecondary: '#6E6E73',
    labelTertiary: '#AEAEB2',
    labelQuaternary: '#C7C7CC',

    // Fill colors
    fillPrimary: '#E8E8ED',
    fillSecondary: '#F2F2F7',
    fillTertiary: '#F5F5F7',

    // Background colors
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundGrouped: '#F2F2F7',
    backgroundElevated: '#FFFFFF',

    // Separator colors
    separatorOpaque: '#C6C6C8',
    separatorTranslucent: 'rgba(60, 60, 67, 0.12)',

    // System accent colors
    accent: '#007AFF',
    accentHover: '#0066D6',
    accentActive: '#004EA2',

    // Semantic colors
    destructive: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5856D6',

    // Severity colors (for risk cards)
    critical: '#FF3B30',
    high: '#FF9500',
    medium: '#FFCC00',
    low: '#8E8E93',

    // Dark mode overrides
    dark: {
      labelPrimary: '#F5F5F7',
      labelSecondary: '#8E8E93',
      labelTertiary: '#6E6E73',
      fillPrimary: '#3A3A3C',
      fillSecondary: '#2C2C2E',
      backgroundPrimary: '#1C1C1E',
      backgroundSecondary: '#000000',
      backgroundGrouped: '#000000',
      backgroundElevated: '#2C2C2E',
      separatorOpaque: '#38383A',
      separatorTranslucent: 'rgba(255, 255, 255, 0.1)',
      accent: '#0A84FF',
    },
  },

  typography: {
    largeTitle:   { size: '34px', weight: 700, tracking: '0.37px',  leading: '41px' },
    title1:      { size: '28px', weight: 700, tracking: '0.36px',  leading: '34px' },
    title2:      { size: '22px', weight: 700, tracking: '0.35px',  leading: '28px' },
    title3:      { size: '20px', weight: 600, tracking: '0.38px',  leading: '25px' },
    headline:    { size: '17px', weight: 600, tracking: '-0.41px', leading: '22px' },
    body:        { size: '17px', weight: 400, tracking: '-0.41px', leading: '22px' },
    callout:     { size: '16px', weight: 400, tracking: '-0.32px', leading: '21px' },
    subheadline: { size: '15px', weight: 400, tracking: '-0.24px', leading: '20px' },
    footnote:    { size: '13px', weight: 400, tracking: '-0.08px', leading: '18px' },
    caption1:    { size: '12px', weight: 400, tracking: '0px',     leading: '16px' },
    caption2:    { size: '11px', weight: 400, tracking: '0.07px',  leading: '13px' },
  },

  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    /** Apple's continuous (squircle/superellipse) corner radius */
    continuous: '24px',
    full: '9999px',
  },

  shadow: {
    xs: '0 0.5px 1px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 12px 40px rgba(0, 0, 0, 0.12)',
    elevated: '0 20px 60px rgba(0, 0, 0, 0.18)',
    /** Menu/popover shadow matching macOS */
    menu: '0 12px 40px rgba(0, 0, 0, 0.13)',
  },

  motion: {
    /** Snappy spring for direct-manipulation interactions */
    springSnappy: { stiffness: 500, damping: 30 },
    /** Gentle spring for layout shifts and reveals */
    springGentle: { stiffness: 300, damping: 25 },
    /** Apple's standard ease-out curve */
    easeOut: [0.32, 0.72, 0, 1] as readonly [number, number, number, number],
    duration: {
      instant: 0.1,
      fast: 0.2,
      normal: 0.35,
      slow: 0.5,
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
} as const;

export type AppleColorKey = keyof typeof AppleTokens.color;
export type AppleTypographyKey = keyof typeof AppleTokens.typography;
export type AppleRadiusKey = keyof typeof AppleTokens.radius;
