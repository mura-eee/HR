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

// 通常モード: user / company / position
// 複合モード: user_company / user_department
type Mode = TargetType;

const MODES: Mode[] = ["user", "company", "position", "user_company", "user_department"];
const LEVELS: PermissionLevel[] = ["edit", "view", "hidden"];

const COMPOSITE_MODES: Mode[] = ["user_company", "user_department"];

function initPerms(): Record<string, PermissionLevel> {
  const init: Record<string, PermissionLevel> = {};
  for (const f of ALL_FIELDS) init[f.key] = "edit";
  return init;
}

interface PermissionsTabProps {
  initialUserId?: string;
  initialMode?: Mode;
}

export function PermissionsTab({ initialUserId, initialMode }: PermissionsTabProps = {}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? "user");

  // 通常モード用
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedId, setSelectedId] = useState<string>(
    (!initialMode || initialMode === "user") && initialUserId ? initialUserId : ""
  );

  // 複合モード共通: ユーザーリスト
  const [users, setUsers] = useState<Target[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    COMPOSITE_MODES.includes(initialMode as Mode) && initialUserId ? initialUserId : ""
  );

  // user_company モード用
  const [companies, setCompanies] = useState<Target[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // user_department モード用
  const [departments, setDepartments] = useState<Target[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(initPerms);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 外部から initialUserId が変わった場合に反映
  useEffect(() => {
    if (!initialUserId) return;
    const newMode = initialMode ?? "user";
    setMode(newMode);
    if (!initialMode || initialMode === "user") {
      setSelectedId(initialUserId);
    } else if (COMPOSITE_MODES.includes(newMode)) {
      setSelectedUserId(initialUserId);
      setSelectedCompanyId("");
      setSelectedDepartmentId("");
    }
  }, [initialUserId, initialMode]);

  // 現在の targetType と targetId を算出
  const currentTargetType: string = mode;
  const currentTargetId: string = (() => {
    if (mode === "user_company") {
      return selectedUserId && selectedCompanyId ? `${selectedUserId}:${selectedCompanyId}` : "";
    }
    if (mode === "user_department") {
      return selectedUserId && selectedDepartmentId ? `${selectedUserId}:${selectedDepartmentId}` : "";
    }
    return selectedId;
  })();

  // 通常モード: 対象タイプ変更時にリストを取得
  useEffect(() => {
    if (COMPOSITE_MODES.includes(mode)) return;
    const fetch_ = async () => {
      setSelectedId("");
      setPermissions(initPerms());

      const urlMap: Record<string, string> = {
        user: "/api/settings/users",
        company: "/api/companies",
        position: "/api/positions",
      };

      try {
        const res = await fetch(urlMap[mode]);
        if (!res.ok) return;
        const data = await res.json();

        let list: Target[] = [];
        if (mode === "user") {
          list = (data.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }));
        } else if (mode === "company") {
          const arr = Array.isArray(data) ? data : (data.companies || []);
          list = arr.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        } else if (mode === "position") {
          const arr = Array.isArray(data) ? data : (data.positions || []);
          list = arr.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
        }
        setTargets(list);
      } catch (e) {
        console.error(e);
      }
    };
    fetch_();
  }, [mode]);

  // 複合モード: ユーザーリストを取得（user_company / user_department 共通）
  useEffect(() => {
    if (!COMPOSITE_MODES.includes(mode)) return;
    const fetch_ = async () => {
      setSelectedUserId("");
      setSelectedCompanyId("");
      setSelectedDepartmentId("");
      setPermissions(initPerms());
      try {
        const res = await fetch("/api/settings/users");
        if (res.ok) {
          const data = await res.json();
          setUsers((data.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetch_();
  }, [mode]);

  // user_company モード: 会社リストを取得
  useEffect(() => {
    if (mode !== "user_company") return;
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : (data.companies || []);
          setCompanies(arr.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetch_();
  }, [mode]);

  // user_department モード: 部署リストを取得
  useEffect(() => {
    if (mode !== "user_department") return;
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/departments");
        if (res.ok) {
          const data = await res.json();
          const arr = data.departments || [];
          setDepartments(arr.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetch_();
  }, [mode]);

  // 通常モード: 対象選択時に権限を読み込み
  useEffect(() => {
    if (COMPOSITE_MODES.includes(mode)) return;
    if (!selectedId) {
      setPermissions(initPerms());
      return;
    }
    const load = async () => {
      const res = await fetch(`/api/permissions?targetType=${mode}&targetId=${selectedId}`);
      if (!res.ok) return;
      const { permissions: loaded } = await res.json();
      const perms = initPerms();
      for (const p of loaded) perms[p.fieldKey] = p.level as PermissionLevel;
      setPermissions(perms);
    };
    load();
  }, [selectedId, mode]);

  // 複合モード: 両方選択時に権限を読み込み
  const loadCompositePerms = useCallback(async () => {
    if (!currentTargetId) {
      setPermissions(initPerms());
      return;
    }
    const res = await fetch(
      `/api/permissions?targetType=${currentTargetType}&targetId=${encodeURIComponent(currentTargetId)}`
    );
    if (!res.ok) return;
    const { permissions: loaded } = await res.json();
    const perms = initPerms();
    for (const p of loaded) perms[p.fieldKey] = p.level as PermissionLevel;
    setPermissions(perms);
  }, [currentTargetId, currentTargetType]);

  useEffect(() => {
    if (!COMPOSITE_MODES.includes(mode)) return;
    loadCompositePerms();
  }, [mode, loadCompositePerms]);

  const setField = (key: string, level: PermissionLevel) =>
    setPermissions((prev) => ({ ...prev, [key]: level }));

  const setGroup = (keys: string[], level: PermissionLevel) =>
    setPermissions((prev) => {
      const next = { ...prev };
      keys.forEach((k) => (next[k] = level));
      return next;
    });

  const setAll = (level: PermissionLevel) => setPermissions(
    Object.fromEntries(ALL_FIELDS.map((f) => [f.key, level])) as Record<string, PermissionLevel>
  );

  const handleSave = async () => {
    if (!currentTargetId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const permsArray = Object.entries(permissions).map(([fieldKey, level]) => ({ fieldKey, level }));
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: currentTargetType,
          targetId: currentTargetId,
          permissions: permsArray,
        }),
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

  const isReadyToEdit = !!currentTargetId;

  return (
    <div className="space-y-4">
      {/* モード選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5" />
            権限設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* モード切り替えボタン */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">設定対象</Label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m)}
                >
                  {TARGET_TYPE_LABELS[m]}
                </Button>
              ))}
            </div>
          </div>

          {/* 通常モード: 対象選択 */}
          {!COMPOSITE_MODES.includes(mode) && (
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
          )}

          {/* user_company モード: ユーザー + 会社の2つのドロップダウン */}
          {mode === "user_company" && (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-1 block">ユーザーを選択</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ユーザーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-1 block">会社を選択</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="会社を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* user_department モード: ユーザー + 部署の2つのドロップダウン */}
          {mode === "user_department" && (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-1 block">ユーザーを選択</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ユーザーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-1 block">部署を選択</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="部署を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 権限テーブル */}
      {isReadyToEdit && (
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
              <Button onClick={handleSave} disabled={saving || !isReadyToEdit}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
