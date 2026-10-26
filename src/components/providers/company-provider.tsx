"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  // SSR時はnull（ハイドレーション一致）、クライアントのpaint前にlocalStorageから復元
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

  // useLayoutEffect: paint前に同期実行 → ユーザーにflashが見えず、二重フェッチも起きない
  // Cookieにも書き込んでServer Componentから読めるようにする
  useLayoutEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelectedCompanyId(saved === "null" ? null : saved);
      document.cookie = `${STORAGE_KEY}=${saved}; path=/; max-age=86400`;
    }
  }, []);

  // 会社一覧取得
  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  const setCompany = useCallback((id: string | null) => {
    setSelectedCompanyId(id);
    const value = id ?? "null";
    localStorage.setItem(STORAGE_KEY, value);
    document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=86400`;
    router.refresh();
  }, [router]);

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
