"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FIELD_GROUPS,
  ALL_FIELDS,
  TargetType,
  TARGET_TYPE_LABELS,
  LEVEL_LABELS,
  PermissionLevel,
} from "@/lib/field-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";

interface Target {
  id: string;
  name: string;
}

const TARGET_TYPES: TargetType[] = ["user", "position"];
const LEVELS: PermissionLevel[] = ["edit", "view", "hidden"];

export function PermissionsTab() {
  const [targetType, setTargetType] = useState<TargetType>("user");
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(() => {
    const init: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) init[f.key] = "edit";
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const initPermissions = useCallback(() => {
    const init: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) init[f.key] = "edit";
    setPermissions(init);
  }, []);

  // 対象タイプ変更時にリストを取得
  useEffect(() => {
    const fetchTargets = async () => {
      setSelectedId("");
      initPermissions();

      const urlMap: Record<TargetType, string> = {
        user: "/api/settings/users",
        position: "/api/positions",
      };

      try {
        const res = await fetch(urlMap[targetType]);
        if (!res.ok) return;
        const data = await res.json();

        let list: Target[] = [];
        if (targetType === "user") {
          list = (data.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }));
        } else if (targetType === "position") {
          const arr = Array.isArray(data) ? data : (data.positions || []);
          list = arr.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
        }
        setTargets(list);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTargets();
  }, [targetType, initPermissions]);

  // 対象選択時に権限を読み込み
  useEffect(() => {
    if (!selectedId) {
      initPermissions();
      return;
    }
    const load = async () => {
      const res = await fetch(`/api/permissions?targetType=${targetType}&targetId=${selectedId}`);
      if (!res.ok) return;
      const { permissions: loaded } = await res.json();

      const perms: Record<string, PermissionLevel> = {};
      for (const f of ALL_FIELDS) perms[f.key] = "edit"; // デフォルト
      for (const p of loaded) perms[p.fieldKey] = p.level as PermissionLevel;
      setPermissions(perms);
    };
    load();
  }, [selectedId, targetType, initPermissions]);

  const setField = (key: string, level: PermissionLevel) =>
    setPermissions((prev) => ({ ...prev, [key]: level }));

  const setGroup = (keys: string[], level: PermissionLevel) =>
    setPermissions((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = level));
      return next;
    });

  const setAll = (level: PermissionLevel) => {
    const next: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) next[f.key] = level;
    setPermissions(next);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const permsArray = Object.entries(permissions).map(([fieldKey, level]) => ({ fieldKey, level }));
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId: selectedId, permissions: permsArray }),
      });
      if (res.ok) {
        setSaveMsg("保存しました");
        setTimeout(() => setSaveMsg(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const levelColor: Record<PermissionLevel, string> = {
    edit: "text-blue-600",
    view: "text-yellow-600",
    hidden: "text-red-500",
  };

  return (
    <div className="space-y-4">
      {/* 対象タイプ選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5" />
            権限設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* タイプ切り替えボタン */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">対象タイプ</Label>
            <div className="flex flex-wrap gap-2">
              {TARGET_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={targetType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetType(type)}
                >
                  {TARGET_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          {/* 対象選択 */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">対象を選択</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 権限テーブル */}
      {selectedId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">フィールド権限</CardTitle>
              {/* 全体一括ボタン */}
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <Button
                    key={level}
                    variant="outline"
                    size="sm"
                    className={levelColor[level]}
                    onClick={() => setAll(level)}
                  >
                    全て{LEVEL_LABELS[level]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {FIELD_GROUPS.map((group) => {
              const groupKeys = group.fields.map((f) => f.key);
              return (
                <div key={group.group}>
                  {/* グループヘッダー + 一括ボタン */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.group}
                    </span>
                    <div className="flex gap-1">
                      {LEVELS.map((level) => (
                        <Button
                          key={level}
                          variant="ghost"
                          size="sm"
                          className={`text-xs h-6 px-2 ${levelColor[level]}`}
                          onClick={() => setGroup(groupKeys, level)}
                        >
                          {LEVEL_LABELS[level]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* フィールド行 */}
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-medium">項目</th>
                          {LEVELS.map((level) => (
                            <th key={level} className={`text-center py-2 px-3 font-medium w-24 ${levelColor[level]}`}>
                              {LEVEL_LABELS[level]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.fields.map((field, i) => (
                          <tr
                            key={field.key}
                            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td className="py-2 px-3">{field.label}</td>
                            {LEVELS.map((level) => (
                              <td key={level} className="text-center py-2 px-3">
                                <input
                                  type="radio"
                                  name={`perm-${field.key}`}
                                  value={level}
                                  checked={permissions[field.key] === level}
                                  onChange={() => setField(field.key, level)}
                                  className="w-4 h-4 cursor-pointer accent-blue-600"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* 保存ボタン */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {saveMsg && <span className="text-green-600 text-sm">{saveMsg}</span>}
              <Button onClick={handleSave} disabled={saving || !selectedId}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
