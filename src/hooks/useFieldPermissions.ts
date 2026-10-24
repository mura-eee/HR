"use client";

import { useState, useEffect } from "react";
import { PermissionLevel, ALL_FIELDS } from "@/lib/field-permissions";

// ページ遷移をまたいで再利用するメモリキャッシュ（60秒TTL）
const _cache: Record<string, { perms: Record<string, PermissionLevel>; ts: number }> = {};
const CACHE_TTL = 60_000;

function getCached(key: string) {
  const entry = _cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.perms;
  return null;
}

export function useFieldPermissions(companyId?: string | null, departmentId?: string | null) {
  const cacheKey = `${companyId ?? ""}:${departmentId ?? ""}`;
  const cached = getCached(cacheKey);

  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(() => {
    if (cached) return cached;
    const init: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) init[f.key] = "hidden";
    return init;
  });
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const hit = getCached(cacheKey);
    if (hit) {
      setPermissions(hit);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPermissions(() => {
      const init: Record<string, PermissionLevel> = {};
      for (const f of ALL_FIELDS) init[f.key] = "hidden";
      return init;
    });

    const fetch_ = async () => {
      try {
        const params = new URLSearchParams();
        if (companyId) params.set("companyId", companyId);
        if (departmentId) params.set("departmentId", departmentId);
        const query = params.toString();
        const url = query ? `/api/permissions/effective?${query}` : "/api/permissions/effective";
        const res = await fetch(url);
        if (res.ok) {
          const { permissions: perms } = await res.json();
          _cache[cacheKey] = { perms, ts: Date.now() };
          setPermissions(perms);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [cacheKey, companyId, departmentId]);

  const can = (fieldKey: string): PermissionLevel =>
    permissions[fieldKey] ?? (loading ? "hidden" : "edit");

  return { can, loading };
}
