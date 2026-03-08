"use client";

import { useState, useEffect } from "react";
import { PermissionLevel, ALL_FIELDS } from "@/lib/field-permissions";

export function useFieldPermissions(companyId?: string | null, departmentId?: string | null) {
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(() => {
    const init: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) init[f.key] = "edit";
    return init;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          setPermissions(perms);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [companyId, departmentId]);

  // フィールドの権限レベルを返す（デフォルト: edit）
  const can = (fieldKey: string): PermissionLevel =>
    permissions[fieldKey] ?? "edit";

  return { can, loading };
}
