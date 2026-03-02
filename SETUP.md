# HR Management System - セットアップ手順

## 全体の流れ

```
1. Supabase でデータベース作成（無料）
2. .env に接続情報を設定
3. npm install → DBセットアップ → 動作確認
4. GitHub にプッシュ
5. Vercel でデプロイ
```

---

## STEP 1: Supabase プロジェクト作成

1. https://supabase.com にアクセスしてアカウント作成（GitHub連携可）
2. 「New Project」をクリック
3. 以下を設定:
   - **Project name**: `hr-management`
   - **Database Password**: 任意のパスワード（必ずメモ！）
   - **Region**: `Northeast Asia (Tokyo)` を選択
4. 「Create new project」をクリックして待つ（1-2分）

### 接続情報の取得

1. 左メニュー「Settings」→「Database」をクリック
2. 「Connection string」セクションで:
   - **URI** タブを選択
   - 「Transaction pooler」の接続文字列をコピー → `DATABASE_URL` に使用
   - 「Session pooler」または「Direct」の接続文字列をコピー → `DIRECT_URL` に使用
3. `[YOUR-PASSWORD]` 部分を、プロジェクト作成時に設定したパスワードに置き換え

---

## STEP 2: .env ファイルの設定

プロジェクトのルートにある `.env` ファイルを開き、接続情報を貼り付け:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="hr-management-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

---

## STEP 3: ローカル起動

```bash
# 1. 依存パッケージをインストール
npm install

# 2. データベースにテーブルを作成
npx prisma db push

# 3. 初期データ（社員21名分など）を投入
npx tsx prisma/seed.ts

# 4. 開発サーバー起動
npm run dev
```

→ http://localhost:3000 でアクセス

### ログインアカウント
| ロール       | メール                  | パスワード  |
|-------------|------------------------|------------|
| 管理者       | admin@example.com      | admin123   |
| マネージャー  | manager@example.com    | manager123 |
| 一般         | user@example.com       | user123    |

---

## STEP 4: GitHub にプッシュ

```bash
# GitHubで新しいリポジトリを作成後:
git add .
git commit -m "Initial commit: HR Management System"
git branch -M main
git remote add origin https://github.com/[USERNAME]/[REPO-NAME].git
git push -u origin main
```

---

## STEP 5: Vercel にデプロイ

1. https://vercel.com にアクセス（GitHub連携でログイン）
2. 「Add New Project」→ GitHub リポジトリを選択
3. 「Environment Variables」に以下を追加:

   | Key              | Value                                    |
   |-----------------|------------------------------------------|
   | `DATABASE_URL`   | Supabaseの Transaction pooler 接続文字列   |
   | `DIRECT_URL`     | Supabaseの Direct 接続文字列              |
   | `NEXTAUTH_SECRET`| 任意の長いランダム文字列                    |
   | `NEXTAUTH_URL`   | デプロイ後のVercel URL（例: https://hr-management.vercel.app）|

4. 「Deploy」をクリック
5. デプロイ完了後、URLにアクセスして動作確認

### 注意: NEXTAUTH_URL の更新
デプロイ後にVercelが発行するURL（例: `https://hr-management-xxx.vercel.app`）を
Vercelの「Settings」→「Environment Variables」で `NEXTAUTH_URL` に設定してください。

---

## トラブルシューティング

### DBに接続できない
- `.env` のパスワード部分に特殊文字がある場合、URLエンコードが必要
- Supabaseダッシュボードで「Database」→「Connection info」を再確認

### ビルドエラー
```bash
npx prisma generate   # Prisma Clientを再生成
npm run build         # ビルド確認
```

### データをリセットしたい
```bash
npx prisma db push --force-reset   # テーブル全削除＆再作成
npx tsx prisma/seed.ts              # シードデータ再投入
```
