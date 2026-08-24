/**
 * FCP-04.1 design-token contract.
 *
 * CSS custom properties in app/globals.css are the runtime styling source.
 * The serialized values below exist for configuration/data paths that cannot
 * store a CSS variable reference (for example an HTML color input value).
 */

export type HexColor = `#${string}`;
export type CssVariableName = `--${string}`;
export type CssVariableReference = `var(${CssVariableName})`;

export const DESIGN_TOKEN_VALUES = {
  surface: {
    page: '#FAF9F6',
    panel: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#F4F3EF',
    soft: '#EBF2EE',
    highlight: '#FDF4F0',
    accent: '#E4EFE8',
    inverse: '#141615',
    disabled: '#F0F3F1',
  },
  text: {
    primary: '#181C1A',
    muted: '#5A615D',
    subtle: '#828A85',
    inverse: '#FFFFFF',
    disabled: '#9EAFA5',
    link: '#D07A60',
  },
  border: {
    default: '#E2DED8',
    strong: '#B5C4BB',
    subtle: '#EFECE6',
    focus: '#D07A60',
  },
  action: {
    primary: '#D07A60',
    primaryHover: '#B56148',
    secondary: '#4A7C59',
    secondaryHover: '#386145',
    disabled: '#E4ECE7',
  },
  status: {
    info: {
      surface: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
    },
    success: {
      surface: '#ECFDF5',
      border: '#A7F3D0',
      text: '#047857',
    },
    warning: {
      surface: '#FFFBEB',
      border: '#FDE68A',
      text: '#B45309',
    },
    danger: {
      surface: '#FEF2F2',
      border: '#FECACA',
      text: '#C2410C',
    },
  },
  overlay: {
    backdrop: 'rgba(20, 22, 21, 0.62)',
  },
  radius: {
    none: '0px',
    small: '0.25rem',
    control: '0.375rem',
    card: '0.5rem',
    panel: '0.75rem',
    pill: '9999px',
  },
  spacing: {
    controlMinHeight: '2.75rem',
    controlIconSize: '2.75rem',
  },
  typography: {
    minimumReadable: '0.75rem',
  },
  shadow: {
    none: 'none',
    small: '0 1px 3px rgba(24, 28, 26, 0.04)',
    panel: '0 4px 16px rgba(24, 28, 26, 0.06)',
    elevated: '0 20px 48px rgba(24, 28, 26, 0.12)',
    focus: '0 0 0 3px rgba(208, 122, 96, 0.22)',
  },
} as const;

export const DESIGN_TOKEN_CSS_VARIABLES = {
  surface: {
    page: '--color-surface-page',
    panel: '--color-surface-panel',
    elevated: '--color-surface-elevated',
    subtle: '--color-surface-subtle',
    soft: '--color-surface-soft',
    highlight: '--color-surface-highlight',
    accent: '--color-surface-accent',
    inverse: '--color-surface-inverse',
    disabled: '--color-surface-disabled',
  },
  text: {
    primary: '--color-text-primary',
    muted: '--color-text-muted',
    subtle: '--color-text-subtle',
    inverse: '--color-text-inverse',
    disabled: '--color-text-disabled',
    link: '--color-text-link',
  },
  border: {
    default: '--color-border-default',
    strong: '--color-border-strong',
    subtle: '--color-border-subtle',
    focus: '--color-border-focus',
  },
  action: {
    primary: '--color-action-primary',
    primaryHover: '--color-action-primary-hover',
    secondary: '--color-action-secondary',
    secondaryHover: '--color-action-secondary-hover',
    disabled: '--color-action-disabled',
  },
  status: {
    infoSurface: '--color-status-info-surface',
    infoBorder: '--color-status-info-border',
    infoText: '--color-status-info-text',
    successSurface: '--color-status-success-surface',
    successBorder: '--color-status-success-border',
    successText: '--color-status-success-text',
    warningSurface: '--color-status-warning-surface',
    warningBorder: '--color-status-warning-border',
    warningText: '--color-status-warning-text',
    dangerSurface: '--color-status-danger-surface',
    dangerBorder: '--color-status-danger-border',
    dangerText: '--color-status-danger-text',
  },
  focus: {
    ring: '--color-focus-ring',
  },
  overlay: {
    backdrop: '--color-overlay-backdrop',
  },
  radius: {
    small: '--radius-small',
    control: '--radius-control',
    panel: '--radius-panel',
    pill: '--radius-pill',
  },
  spacing: {
    controlMinHeight: '--control-min-height',
    controlIconSize: '--control-icon-size',
  },
  typography: {
    minimumReadable: '--font-size-minimum-readable',
  },
  shadow: {
    small: '--shadow-small',
    panel: '--shadow-panel',
    elevated: '--shadow-elevated',
    focus: '--shadow-focus',
  },
} as const satisfies Record<string, unknown>;

export function cssVariable(name: CssVariableName): CssVariableReference {
  return `var(${name})`;
}

export const DESIGN_TOKEN_REFS = {
  surface: {
    page: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.page),
    panel: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.panel),
    elevated: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.elevated),
    subtle: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.subtle),
    soft: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.soft),
    highlight: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.highlight),
    accent: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.accent),
    inverse: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.inverse),
    disabled: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.surface.disabled),
  },
  text: {
    primary: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.primary),
    muted: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.muted),
    subtle: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.subtle),
    inverse: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.inverse),
    disabled: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.disabled),
    link: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.text.link),
  },
  border: {
    default: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.border.default),
    strong: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.border.strong),
    subtle: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.border.subtle),
    focus: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.border.focus),
  },
  action: {
    primary: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.action.primary),
    primaryHover: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.action.primaryHover),
    secondary: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.action.secondary),
    secondaryHover: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.action.secondaryHover),
    disabled: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.action.disabled),
  },
  status: {
    info: {
      surface: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.infoSurface),
      border: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.infoBorder),
      text: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.infoText),
    },
    success: {
      surface: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.successSurface),
      border: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.successBorder),
      text: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.successText),
    },
    warning: {
      surface: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.warningSurface),
      border: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.warningBorder),
      text: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.warningText),
    },
    danger: {
      surface: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.dangerSurface),
      border: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.dangerBorder),
      text: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.status.dangerText),
    },
  },
  focus: {
    ring: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.focus.ring),
  },
  overlay: {
    backdrop: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.overlay.backdrop),
  },
  radius: {
    small: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.radius.small),
    control: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.radius.control),
    panel: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.radius.panel),
    pill: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.radius.pill),
  },
  spacing: {
    controlMinHeight: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.spacing.controlMinHeight),
    controlIconSize: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.spacing.controlIconSize),
  },
  typography: {
    minimumReadable: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.typography.minimumReadable),
  },
  shadow: {
    small: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.shadow.small),
    panel: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.shadow.panel),
    elevated: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.shadow.elevated),
    focus: cssVariable(DESIGN_TOKEN_CSS_VARIABLES.shadow.focus),
  },
} as const;

export type DesignTokenValues = typeof DESIGN_TOKEN_VALUES;
export type DesignTokenRefs = typeof DESIGN_TOKEN_REFS;
