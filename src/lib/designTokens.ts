/**
 * Zoho-inspired design tokens for Data Dungeon CRM
 * Dark theme, cyan/teal accents, consistent spacing and typography
 */

// ZOHO-INSPIRED COLOR PALETTE
export const colors = {
  // Dark Theme (Primary)
  background: {
    primary: "#1a1a1a",
    secondary: "#2c2c2c",
    tertiary: "#1e1e1e",
    surface: "#242424",
  },

  // Accent Colors
  primary: "#00BCD4",
  primaryHover: "#00ACC1",
  primaryActive: "#0097A7",

  secondary: "#4A90E2",
  secondaryHover: "#357ABD",
  secondaryActive: "#2E5C9A",

  // Status Colors
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",

  // Text Colors
  text: {
    primary: "#FFFFFF",
    secondary: "#E0E0E0",
    tertiary: "#999999",
    muted: "#666666",
  },

  // Semantic
  border: "rgba(255, 255, 255, 0.1)",
  borderHover: "rgba(255, 255, 255, 0.2)",
  overlay: "rgba(0, 0, 0, 0.6)",
};

// SPACING SYSTEM
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
};

// LAYOUT DIMENSIONS
export const layout = {
  sidebarWidth: "248px",
  sidebarCollapsed: "80px",
  headerHeight: "60px",
  toolbarHeight: "50px",
  filterPanelWidth: "248px",
};

// TYPOGRAPHY
export const typography = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "14px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "20px",
    "3xl": "24px",
    "4xl": "30px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 550,
    bold: 600,
  },
};

// SHADOWS
export const shadows = {
  sm: "0 1px 3px rgba(0, 0, 0, 0.3)",
  md: "0 4px 8px rgba(0, 0, 0, 0.4)",
  lg: "0 8px 16px rgba(0, 0, 0, 0.5)",
  xl: "0 12px 24px rgba(0, 0, 0, 0.6)",
};

// TRANSITIONS
export const transitions = {
  fast: "150ms ease-in-out",
  normal: "250ms ease-in-out",
  slow: "350ms ease-in-out",
};
