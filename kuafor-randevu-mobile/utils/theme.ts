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
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
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
    destructive: string;
    destructiveForeground: string;
    gradient: {
      primary: string[];
      secondary: string[];
    };
    shadow: {
      light: string;
      medium: string;
      dark: string;
    };
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
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
      '4xl': number;
    };
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
    // Ana renkler
    primary: '#6366f1', // indigo-500
    primaryForeground: '#ffffff',
    secondary: '#1f2937', // zinc-800
    secondaryForeground: '#f3f4f6', // zinc-100
    accent: '#f59e0b', // amber-500
    
    // Arka plan renkleri
    background: '#111827', // gray-900
    surface: '#1f2937', // gray-800
    card: '#1f2937', // gray-800
    
    // Metin renkleri
    text: '#f3f4f6', // zinc-100
    textSecondary: '#9ca3af', // zinc-400
    textMuted: '#6b7280', // zinc-500
    
    // Kenarlık ve ayırıcı renkleri
    border: '#374151', // gray-700
    divider: '#374151', // gray-700
    
    // Durum renkleri
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#3b82f6', // blue-500
    
    // Özel renkler
    destructive: '#ef4444', // red-500
    destructiveForeground: '#ffffff',
    
    // Overlay renkleri
    overlay: 'rgba(0, 0, 0, 0.7)',
    backdrop: 'rgba(17, 24, 39, 0.7)',
    
    // Gradient renkleri
    gradient: {
      primary: ['#6366f1', '#4f46e5'], // indigo-500 to indigo-600
      secondary: ['#1f2937', '#111827'], // gray-800 to gray-900
    },
    
    // Gölge renkleri
    shadow: {
      light: 'rgba(0, 0, 0, 0.3)',
      medium: 'rgba(0, 0, 0, 0.4)',
      dark: 'rgba(0, 0, 0, 0.5)',
    },
  },
  
  // Tipografi
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
      color: '#f3f4f6',
      fontFamily: 'System',
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      color: '#f3f4f6',
      fontFamily: 'System',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      color: '#f3f4f6',
      fontFamily: 'System',
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      color: '#f3f4f6',
      fontFamily: 'System',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: '#9ca3af',
      fontFamily: 'System',
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#9ca3af',
      fontFamily: 'System',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: '#6b7280',
      fontFamily: 'System',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      color: '#FFFFFF',
      fontFamily: 'System',
    },
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
  },
  
  // Boşluk ve kenar yuvarlaklığı
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    '4xl': 80,
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
  
  // Gölgeler
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
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
      backgroundColor: '#6366f1',
      borderColor: '#6366f1',
      borderWidth: 1,
      textColor: '#ffffff',
    },
    secondary: {
      backgroundColor: '#1f2937',
      borderColor: '#1f2937',
      borderWidth: 1,
      textColor: '#f3f4f6',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#6366f1',
      borderWidth: 1,
      textColor: '#6366f1',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      textColor: '#6366f1',
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