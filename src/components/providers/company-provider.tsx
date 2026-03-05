"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
}

interface CompanyContextValue {
  companies: Company[];
  selectedCompanyId: string | null; // null = トキトグループ（全社）
  selectedCompanyName: string;
  setCompany: (id: string | null) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue>({
  companies: [],
  selectedCompanyId: null,
  selectedCompanyName: "トキトグループ",
  setCompany: () => {},
  refreshCompanies: async () => {},
});

const STORAGE_KEY = "selectedCompanyId";
const GROUP_NAME = "トキトグループ";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const refreshCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(data.companies ?? []);
    } catch {
      // ignore
    }
  }, []);

  // 初期化: localStorageから復元 + 会社一覧取得
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelectedCompanyId(saved === "null" ? null : saved);
    refreshCompanies();
  }, [refreshCompanies]);

  const setCompany = useCallback((id: string | null) => {
    setSelectedCompanyId(id);
    localStorage.setItem(STORAGE_KEY, id ?? "null");
  }, []);

  const selectedCompanyName =
    selectedCompanyId === null
      ? GROUP_NAME
      : (companies.find((c) => c.id === selectedCompanyId)?.name ?? GROUP_NAME);

  return (
    <CompanyContext.Provider
      value={{ companies, selectedCompanyId, selectedCompanyName, setCompany, refreshCompanies }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
