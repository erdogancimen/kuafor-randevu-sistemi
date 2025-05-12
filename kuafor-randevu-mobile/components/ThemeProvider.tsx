import { ReactNode, createContext, useContext } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { theme, darkTheme, Theme } from '@/utils/theme';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<Theme>(theme);
export const useAppTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? darkTheme : theme;

  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
} 