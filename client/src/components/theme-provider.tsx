import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'en' | 'ar';

interface ThemeContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  language: 'en',
  setLanguage: () => {},
});

export function useLanguage() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  return (
    <ThemeContext.Provider value={{ language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}
