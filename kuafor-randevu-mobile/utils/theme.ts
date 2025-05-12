import { StyleSheet } from 'react-native';

type TypographyStyle = {
  fontSize: number;
  fontWeight: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
  lineHeight: number;
  color: string;
  fontFamily: string;
};

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonStyle = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
};

type ThemeType = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    surface: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    border: string;
    divider: string;
    overlay: string;
    backdrop: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  borderRadius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    full: number;
  };
  typography: {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    body: TypographyStyle;
    bodySmall: TypographyStyle;
    caption: TypographyStyle;
    button: TypographyStyle;
  };
  shadows: {
    sm: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    md: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    lg: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
  };
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
  createSpacing: (multiplier: number) => number;
  createBorderRadius: (size: keyof ThemeType['borderRadius']) => number;
  buttons: {
    [key in ButtonVariant]: ButtonStyle;
  };
};

export const theme: ThemeType = {
  colors: {
    // Web ile uyumlu ana renkler
    primary: '#4f46e5', // Web: --primary
    secondary: '#f3f4f6', // Web: --secondary
    accent: '#f59e0b', // Web: --accent

    // Arka plan renkleri
    background: '#ffffff', // Web: --background
    card: '#ffffff', // Web: --card
    surface: '#f3f4f6', // Web: --secondary

    // Metin renkleri
    text: '#171717', // Web: --foreground
    textSecondary: '#6b7280', // Web: --muted-foreground
    textMuted: '#9ca3af', // Web koyu: --muted-foreground

    // Durum renkleri
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Kenarlık ve ayırıcı renkleri
    border: '#e5e7eb', // Web: --border
    divider: '#e5e7eb', // Web: --border

    // Overlay renkleri
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(23, 23, 23, 0.3)',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
      color: '#0F172A',
      fontFamily: 'Inter',
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      color: '#0F172A',
      fontFamily: 'Inter',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      color: '#0F172A',
      fontFamily: 'Inter',
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      color: '#0F172A',
      fontFamily: 'Inter',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: '#475569',
      fontFamily: 'Inter',
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#475569',
      fontFamily: 'Inter',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: '#64748B',
      fontFamily: 'Inter',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      color: '#FFFFFF',
      fontFamily: 'Inter',
    },
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 5,
    },
  },

  // Animasyon süreleri
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Boşluk ve kenar yuvarlaklığı için yardımcı fonksiyonlar
  createSpacing: (multiplier: number) => multiplier * 4,
  createBorderRadius: (size: keyof typeof theme.borderRadius) => theme.borderRadius[size],

  buttons: {
    primary: {
      backgroundColor: '#4f46e5', // Web: --primary
      borderColor: '#4f46e5',
      borderWidth: 1,
      textColor: '#ffffff', // Web: --primary-foreground
    },
    secondary: {
      backgroundColor: '#f3f4f6', // Web: --secondary
      borderColor: '#f3f4f6',
      borderWidth: 1,
      textColor: '#1f2937', // Web: --secondary-foreground
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#4f46e5', // Web: --primary
      borderWidth: 1,
      textColor: '#4f46e5',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      textColor: '#4f46e5',
    },
  },
};

export const darkTheme: ThemeType = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#0a0a0a',
    card: '#171717',
    surface: '#1f2937',
    text: '#ededed',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    primary: '#6366f1',
    secondary: '#1f2937',
    accent: '#f59e0b',
    border: '#374151',
    divider: '#374151',
    overlay: 'rgba(0,0,0,0.7)',
    backdrop: 'rgba(10,10,10,0.7)',
  },
};

// Tema tiplerini tanımla
export type Theme = ThemeType;

// Stil oluşturucu yardımcı fonksiyonu
export const createStyles = StyleSheet.create;

// Tema renklerini kullanarak gradient oluşturma
export const gradients = {
  primary: ['#0EA5E9', '#0284C7'],
  secondary: ['#64748B', '#475569'],
  accent: ['#F59E0B', '#D97706'],
  success: ['#22C55E', '#16A34A'],
  error: ['#EF4444', '#DC2626'],
}; 