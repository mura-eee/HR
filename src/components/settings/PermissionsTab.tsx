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
import { Shield, Copy, ChevronDown, ChevronUp } from "lucide-react";

interface Target {
  id: string;
  name: string;
}

type Mode = TargetType;

const MODES: Mode[] = ["user", "company", "position", "user_company", "user_department", "user_company_department"];
const LEVELS: PermissionLevel[] = ["edit", "view", "hidden"];
// ユーザーIDを含む複合モード
const COMPOSITE_MODES: Mode[] = ["user_company", "user_department", "user_company_department"];

function initPerms(): Record<string, PermissionLevel> {
  const init: Record<string, PermissionLevel> = {};
  for (const f of ALL_FIELDS) init[f.key] = "edit";
  return init;
}

// 複合モードのcompositeTargetIdを計算
function calcTargetId(
  mode: Mode,
  selectedId: string,
  selectedUserId: string,
  selectedCompanyId: string,
  selectedDepartmentId: string
): string {
  if (mode === "user_company") return selectedUserId && selectedCompanyId ? `${selectedUserId}:${selectedCompanyId}` : "";
  if (mode === "user_department") return selectedUserId && selectedDepartmentId ? `${selectedUserId}:${selectedDepartmentId}` : "";
  if (mode === "user_company_department") return selectedUserId && selectedCompanyId && selectedDepartmentId ? `${selectedUserId}:${selectedCompanyId}:${selectedDepartmentId}` : "";
  return selectedId;
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

  // 複合モード共通
  const [users, setUsers] = useState<Target[]>([]);
  const [companies, setCompanies] = useState<Target[]>([]);
  const [departments, setDepartments] = useState<Target[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    COMPOSITE_MODES.includes(initialMode as Mode) && initialUserId ? initialUserId : ""
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(initPerms);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ===== コピー機能 =====
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copyMode, setCopyMode] = useState<Mode>("user");
  const [copyTargets, setCopyTargets] = useState<Target[]>([]);
  const [copySelectedId, setCopySelectedId] = useState<string>("");
  const [copySelectedUserId, setCopySelectedUserId] = useState<string>("");
  const [copySelectedCompanyId, setCopySelectedCompanyId] = useState<string>("");
  const [copySelectedDepartmentId, setCopySelectedDepartmentId] = useState<string>("");
  const [loadingCopy, setLoadingCopy] = useState(false);

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

  // 現在のtargetId
  const currentTargetId = calcTargetId(mode, selectedId, selectedUserId, selectedCompanyId, selectedDepartmentId);
  const currentTargetType: string = mode;

  // 通常モード: リスト取得
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
        if (mode === "user") list = (data.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }));
        else if (mode === "company") { const arr = Array.isArray(data) ? data : (data.companies || []); list = arr.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })); }
        else if (mode === "position") { const arr = Array.isArray(data) ? data : (data.positions || []); list = arr.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })); }
        setTargets(list);
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, [mode]);

  // 複合モード: ユーザー・会社・部署リスト取得
  useEffect(() => {
    if (!COMPOSITE_MODES.includes(mode)) return;
    const fetch_ = async () => {
      setSelectedUserId("");
      setSelectedCompanyId("");
      setSelectedDepartmentId("");
      setPermissions(initPerms());
      try {
        const [uRes, cRes, dRes] = await Promise.all([
          fetch("/api/settings/users"),
          fetch("/api/companies"),
          fetch("/api/departments"),
        ]);
        if (uRes.ok) { const d = await uRes.json(); setUsers((d.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))); }
        if (cRes.ok) { const d = await cRes.json(); const arr = Array.isArray(d) ? d : (d.companies || []); setCompanies(arr.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))); }
        if (dRes.ok) { const d = await dRes.json(); setDepartments((d.departments || []).map((dep: { id: string; name: string }) => ({ id: dep.id, name: dep.name }))); }
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, [mode]);

  // 通常モード: 選択時に権限読み込み
  useEffect(() => {
    if (COMPOSITE_MODES.includes(mode)) return;
    if (!selectedId) { setPermissions(initPerms()); return; }
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

  // 複合モード: 全選択時に権限読み込み
  const loadCompositePerms = useCallback(async () => {
    if (!currentTargetId) { setPermissions(initPerms()); return; }
    const res = await fetch(`/api/permissions?targetType=${currentTargetType}&targetId=${encodeURIComponent(currentTargetId)}`);
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

  // コピー元のtargetId
  const copyTargetId = calcTargetId(copyMode, copySelectedId, copySelectedUserId, copySelectedCompanyId, copySelectedDepartmentId);

  // コピー元モード変更時: 対象リスト取得
  useEffect(() => {
    if (COMPOSITE_MODES.includes(copyMode)) return;
    const fetch_ = async () => {
      setCopySelectedId("");
      const urlMap: Record<string, string> = {
        user: "/api/settings/users",
        company: "/api/companies",
        position: "/api/positions",
      };
      try {
        const res = await fetch(urlMap[copyMode]);
        if (!res.ok) return;
        const data = await res.json();
        let list: Target[] = [];
        if (copyMode === "user") list = (data.users || []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }));
        else if (copyMode === "company") { const arr = Array.isArray(data) ? data : (data.companies || []); list = arr.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })); }
        else if (copyMode === "position") { const arr = Array.isArray(data) ? data : (data.positions || []); list = arr.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })); }
        setCopyTargets(list);
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, [copyMode]);

  // コピー実行
  const handleCopyLoad = async () => {
    if (!copyTargetId) return;
    setLoadingCopy(true);
    try {
      const res = await fetch(`/api/permissions?targetType=${copyMode}&targetId=${encodeURIComponent(copyTargetId)}`);
      if (!res.ok) return;
      const { permissions: loaded } = await res.json();
      const perms = initPerms();
      for (const p of loaded) perms[p.fieldKey] = p.level as PermissionLevel;
      setPermissions(perms);
      setShowCopyPanel(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCopy(false);
    }
  };

  const setField = (key: string, level: PermissionLevel) =>
    setPermissions((prev) => ({ ...prev, [key]: level }));

  const setGroup = (keys: string[], level: PermissionLevel) =>
    setPermissions((prev) => { const next = { ...prev }; keys.forEach((k) => (next[k] = level)); return next; });

  const setAll = (level: PermissionLevel) =>
    setPermissions(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, level])) as Record<string, PermissionLevel>);

  const handleSave = async () => {
    if (!currentTargetId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const permsArray = Object.entries(permissions).map(([fieldKey, level]) => ({ fieldKey, level }));
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: currentTargetType, targetId: currentTargetId, permissions: permsArray }),
      });
      if (res.ok) { setSaveMsg("保存しました"); setTimeout(() => setSaveMsg(""), 3000); }
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

  // コピー元選択UIのレンダリング
  const renderCopySelectors = () => {
    if (!COMPOSITE_MODES.includes(copyMode)) {
      return (
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">コピー元を選択</Label>
          <Select value={copySelectedId} onValueChange={setCopySelectedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {copyTargets.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 block">ユーザー</Label>
          <Select value={copySelectedUserId} onValueChange={setCopySelectedUserId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="ユーザーを選択" /></SelectTrigger>
            <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {(copyMode === "user_company" || copyMode === "user_company_department") && (
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">所属</Label>
            <Select value={copySelectedCompanyId} onValueChange={setCopySelectedCompanyId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="会社を選択" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {(copyMode === "user_department" || copyMode === "user_company_department") && (
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">部署</Label>
            <Select value={copySelectedDepartmentId} onValueChange={setCopySelectedDepartmentId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="部署を選択" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

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
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">設定対象</Label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
                  {TARGET_TYPE_LABELS[m]}
                </Button>
              ))}
            </div>
          </div>

          {/* 通常モード */}
          {!COMPOSITE_MODES.includes(mode) && (
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">対象を選択</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent>{targets.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {/* 複合モード: ユーザー選択（共通） */}
          {COMPOSITE_MODES.includes(mode) && (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-1 block">ユーザーを選択</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="ユーザーを選択" /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(mode === "user_company" || mode === "user_company_department") && (
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm text-muted-foreground mb-1 block">所属を選択</Label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="会社を選択" /></SelectTrigger>
                    <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {(mode === "user_department" || mode === "user_company_department") && (
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm text-muted-foreground mb-1 block">部署を選択</Label>
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="部署を選択" /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
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
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <Button key={level} variant="outline" size="sm" className={levelColor[level]} onClick={() => setAll(level)}>
                    全て{LEVEL_LABELS[level]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* コピーパネル */}
            <div className="border rounded-md">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50 rounded-md"
                onClick={() => setShowCopyPanel((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  他の設定からコピーして読み込む
                </span>
                {showCopyPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showCopyPanel && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">コピー元のタイプ</Label>
                    <div className="flex flex-wrap gap-1">
                      {MODES.map((m) => (
                        <Button key={m} variant={copyMode === m ? "default" : "outline"} size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setCopyMode(m); setCopySelectedId(""); setCopySelectedUserId(""); setCopySelectedCompanyId(""); setCopySelectedDepartmentId(""); }}>
                          {TARGET_TYPE_LABELS[m]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {renderCopySelectors()}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!copyTargetId || loadingCopy}
                    onClick={handleCopyLoad}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    {loadingCopy ? "読み込み中..." : "コピーして読み込む"}
                  </Button>
                  <p className="text-xs text-muted-foreground">※ 読み込み後、保存ボタンで確定してください</p>
                </div>
              )}
            </div>

            {/* フィールドグループ */}
            {FIELD_GROUPS.map((group) => {
              const groupKeys = group.fields.map((f) => f.key);
              return (
                <div key={group.group}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{group.group}</span>
                    <div className="flex gap-1">
                      {LEVELS.map((level) => (
                        <Button key={level} variant="ghost" size="sm"
                          className={`text-xs h-6 px-2 ${levelColor[level]}`}
                          onClick={() => setGroup(groupKeys, level)}>
                          {LEVEL_LABELS[level]}
                        </Button>
                      ))}
                    </div>
                  </div>
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
                          <tr key={field.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="py-2 px-3">{field.label}</td>
                            {LEVELS.map((level) => (
                              <td key={level} className="text-center py-2 px-3">
                                <input type="radio" name={`perm-${field.key}`} value={level}
                                  checked={permissions[field.key] === level}
                                  onChange={() => setField(field.key, level)}
                                  className="w-4 h-4 cursor-pointer accent-blue-600" />
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
