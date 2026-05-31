import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface FontInfo {
  filename: string;
  familyName: string;
  category: string;
  style: string;
}

export interface UploadedFont {
  name: string;
  data: string;
  familyName: string;
}

interface FontContextValue {
  fonts: FontInfo[];
  fontsByCategory: Record<string, FontInfo[]>;
  isLoading: boolean;
  selectedFont: string;
  setSelectedFont: (font: string) => void;
  uploadedFont: UploadedFont | null;
  setUploadedFont: (font: UploadedFont | null) => void;
  fontOverride: string;
  setFontOverride: (override: string) => void;
}

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: ReactNode }) {
  const [selectedFont, setSelectedFont] = useState('');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);
  const [fontOverride, setFontOverride] = useState('');

  const { data: fontsData, isLoading } = useQuery<{ success: boolean; fonts: FontInfo[]; count: number }>({
    queryKey: ['/api/fonts/library'],
  });

  const fonts = fontsData?.fonts || [];
  const fontsByCategory = fonts.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontInfo[]>);

  return (
    <FontContext.Provider
      value={{
        fonts,
        fontsByCategory,
        isLoading,
        selectedFont,
        setSelectedFont,
        uploadedFont,
        setUploadedFont,
        fontOverride,
        setFontOverride,
      }}
    >
      {children}
    </FontContext.Provider>
  );
}

export function useFontContext() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFontContext must be used within a FontProvider');
  }
  return context;
}
