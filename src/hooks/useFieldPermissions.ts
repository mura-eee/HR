"use client";

import { useState, useEffect } from "react";
import { PermissionLevel, ALL_FIELDS } from "@/lib/field-permissions";

export function useFieldPermissions() {
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(() => {
    const init: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) init[f.key] = "edit";
    return init;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/permissions/effective");
        if (res.ok) {
          const { permissions: perms } = await res.json();
          setPermissions(perms);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  // フィールドの権限レベルを返す（デフォルト: edit）
  const can = (fieldKey: string): PermissionLevel =>
    permissions[fieldKey] ?? "edit";

  return { can, loading };
}
