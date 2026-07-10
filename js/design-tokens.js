/**
 * js/design-tokens.js
 * Definición centralizada de tokens de diseño para mantener la consistencia (Atomic Vibe).
 */

export const Colors = {
  // Brand & Accents
  primary: '#c9a96e', // Dorado KVN
  secondary: '#5a9fd4', // Azul suave
  accent: '#52c48a', // Verde éxito
  
  // Feedback
  danger: '#e05252',
  warning: '#e8c98a',
  info: '#73c6e8',
  success: '#52c48a',
  gold: '#c9a96e',
  
  // Interface
  bg1: 'var(--bg1, #0f172a)',
  bg2: 'var(--bg2, #1e293b)',
  bg3: 'var(--bg3, #334155)',
  text: 'var(--text, #f0ede8)',
  muted: 'var(--muted, #8a8680)',
  border: 'var(--border, #2a2a2a)',
  
  // Charts Palette
  palette: [
    '#c9a96e', // Dorado
    '#5a9fd4', // Azul
    '#52c48a', // Verde
    '#e07b9a', // Rosado
    '#9b7fd4', // Púrpura
    '#4ec9b0', // Turquesa
    '#e8c98a', // Crema
    '#e05252', // Rojo
    '#73c6e8', // Celeste
    '#a3d977'  // Lima
  ]
};

export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px'
};

export const Typography = {
  fontFamily: "'Inter', sans-serif",
  sizeXs: '11px',
  sizeSm: '12px',
  sizeMd: '14px',
  sizeLg: '16px',
  weightNormal: '400',
  weightBold: '700'
};
