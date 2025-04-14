"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface Build {
  id: string;
  site_id: string;
  site_name: string;
  state: string;
  created_at: string;
  deploy_id?: string;
  error?: string;
  title?: string;
  context?: string;
  branch?: string;
  deploy_time?: number;
  progress?: number;
}

interface BuildsContextType {
  builds: Build[];
  setBuilds: (builds: Build[]) => void;
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

const BuildsContext = createContext<BuildsContextType | undefined>(undefined);

export function BuildsProvider({ children }: { children: ReactNode }) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <BuildsContext.Provider
      value={{ builds, setBuilds, isLoaded, setIsLoaded }}
    >
      {children}
    </BuildsContext.Provider>
  );
}

export function useBuilds() {
  const context = useContext(BuildsContext);
  if (context === undefined) {
    throw new Error("useBuilds must be used within a BuildsProvider");
  }
  return context;
}
