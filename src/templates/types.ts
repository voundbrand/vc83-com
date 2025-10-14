/**
 * Template/Theme Types for L4YERCAK3.com
 *
 * Defines interfaces for separating structure (templates) from appearance (themes).
 */

import React from "react";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Theme Color Configuration
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  textDark: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Theme Typography Configuration
 */
export interface ThemeTypography {
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    body: string;
    small: string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Theme Spacing Configuration
 */
export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

/**
 * Theme Border Radius Configuration
 */
export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

/**
 * Theme Shadow Configuration
 */
export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  none: string;
}

/**
 * Theme Layout Configuration
 */
export interface ThemeLayout {
  maxWidth: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
}

/**
 * Theme Object
 *
 * Complete theme definition with all styling properties.
 */
export interface Theme {
  code: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  layout: ThemeLayout;
}

/**
 * Published Page (from database)
 */
export interface PublishedPage {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  subtype?: string;
  name: string;
  status: string;
  customProperties?: {
    slug: string;
    publicUrl: string;
    metaTitle: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
    templateCode?: string;
    themeCode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Organization (from database)
 */
export interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  [key: string]: unknown;
}

/**
 * Source Data Object
 *
 * Content object being published (more flexible than just Record).
 */
export interface SourceData {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  subtype?: string;
  name: string;
  customProperties?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Template Props
 *
 * Props passed to every template component.
 */
export interface TemplateProps {
  page: PublishedPage; // The published page metadata
  data: SourceData; // Content data from linked object
  organization: Organization; // Organization info
  theme: Theme; // Theme object for styling
}

/**
 * Template Component Type
 *
 * All template components must accept these props and render JSX.
 */
export type TemplateComponent = (props: TemplateProps) => React.ReactElement;
