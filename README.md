# 用語集アプリ (Glossary App)

## 概要
- **Backend**: NestJS + TypeScript + Prisma  
- **Frontend**: React + Vite + TypeScript  
- **DB**: PostgreSQL (full‑text search, pg_trgm & pgroonga for Japanese)  
- **認証**: Azure AD SSO (MSAL on SPA, passport‑azure‑ad on API)  
- **デプロイ**: Azure App Service for Containers + Azure Files (永続ストレージ)  
- **IaC**: OpenTofu (Terraform互換)

## ローカル開発
```bash
# 1. 環境変数を作成
cp .env.example .env

# 2. Docker Compose 起動
docker compose up -d

# 3. DB マイグレーション & シード
npm run prisma:migrate --workspace=backend
npm run seed --workspace=backend

# 4. フロントエンド起動 (別ターミナル)
npm start --workspace=frontend
