"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Database, Download, Trash2, RotateCcw, Upload, RefreshCw } from "lucide-react";

interface BackupMeta {
  id: string;
  name: string;
  type: string;
  note: string | null;
  sizeBytes: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function BackupTab() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadRestoring, setUploadRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup");
      if (res.ok) {
        const { backups: data } = await res.json();
        setBackups(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  // 手動バックアップ作成
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "manual" }),
      });
      if (res.ok) await fetchBackups();
    } finally {
      setCreating(false);
    }
  };

  // ダウンロード
  const handleDownload = (id: string, name: string) => {
    const a = document.createElement("a");
    a.href = `/api/admin/backup/${id}`;
    a.download = `hr-backup-${name.replace(/[:/\s]/g, "-")}.json`;
    a.click();
  };

  // DBから復元
  const handleRestore = async () => {
    if (!restoreTargetId) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId: restoreTargetId }),
      });
      if (res.ok) {
        alert("復元が完了しました。ページを再読み込みしてください。");
      } else {
        const d = await res.json();
        alert(d.error || "復元に失敗しました");
      }
    } finally {
      setRestoring(false);
      setRestoreTargetId(null);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/backup/${deleteTargetId}`, { method: "DELETE" });
      await fetchBackups();
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  // ファイルアップロードから復元
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.version) { alert("無効なバックアップファイルです"); return; }
      if (!confirm(`「${file.name}」からデータを復元します。\n現在のすべてのデータが上書きされます。よろしいですか？`)) return;
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        alert("復元が完了しました。ページを再読み込みしてください。");
      } else {
        const d = await res.json();
        alert(d.error || "復元に失敗しました");
      }
    } catch {
      alert("ファイルの読み込みに失敗しました");
    } finally {
      setUploadRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* 操作カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            バックアップ・復元
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleCreate} disabled={creating}>
            <Database className="w-4 h-4 mr-1.5" />
            {creating ? "バックアップ中..." : "今すぐバックアップ"}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadRestoring}>
            <Upload className="w-4 h-4 mr-1.5" />
            {uploadRestoring ? "復元中..." : "ファイルから復元"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileRestore} />
          <Button variant="ghost" size="icon" onClick={fetchBackups} title="更新">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* バックアップ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">バックアップ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-gray-200 rounded" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">バックアップがありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時・名称</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>サイズ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{formatDate(b.createdAt)}</div>
                      {b.note && <div className="text-xs text-muted-foreground">{b.note}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.type === "auto" ? "secondary" : "default"}>
                        {b.type === "auto" ? "自動" : "手動"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatBytes(b.sizeBytes)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="ダウンロード"
                          onClick={() => handleDownload(b.id, b.name)}>
                          <Download className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" title="このバックアップから復元"
                          onClick={() => setRestoreTargetId(b.id)}>
                          <RotateCcw className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="削除"
                          onClick={() => setDeleteTargetId(b.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 復元確認ダイアログ */}
      <Dialog open={!!restoreTargetId} onOpenChange={(o) => { if (!o) setRestoreTargetId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>データを復元しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            選択したバックアップから復元します。<br />
            <span className="text-destructive font-medium">現在のすべてのデータが上書きされます。</span><br />
            この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTargetId(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleRestore} disabled={restoring}>
              {restoring ? "復元中..." : "復元する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTargetId} onOpenChange={(o) => { if (!o) setDeleteTargetId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バックアップを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">このバックアップデータを削除します。この操作は取り消せません。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
