'use client';
import { links } from '@/lib/data';
import { useState, createContext, useContext } from 'react';

type ActiveSectionContextProviderProps = {
  children: React.ReactNode;
};

type SectionName = (typeof links)[number]['name'];

type ActiveSectionContextType = {
  activeSection: SectionName;
  setActiveSection: React.Dispatch<React.SetStateAction<SectionName>>;
};

export const ActiveSectionContext =
  createContext<ActiveSectionContextType | null>(null);

// Provider for the ActiveSectionContext
export default function ActiveSectionContextProvider({
  children,
}: ActiveSectionContextProviderProps) {
  const [activeSection, setActiveSection] = useState<SectionName>('Home');

  return (
    <ActiveSectionContext.Provider
      value={{
        activeSection,
        setActiveSection,
      }}
    >
      {children}
    </ActiveSectionContext.Provider>
  );
}

// Custom hook to use the ActiveSectionContext
export function useActiveSectionContext() {
  const context = useContext(ActiveSectionContext);
  if (context === null) {
    throw new Error(
      'useActiveSection must be used within an ActiveSectionContextProvider',
    );
  }
  return context;
}
