## 前提  
- **OS** : Windows 11 Pro / Enterprise  
- **Docker 実行環境** : Docker Desktop が WSL2 バックエンドで動作している（`docker` コマンドは PowerShell でも WSL の Linux シェルでも使える）  
- **目的** : 同一ホスト上で複数の Web アプリケーションを「ポート番号を覚えさせずに」社内ユーザーが普通に `http://app1.example.com/` / `https://app2.example.com/` とアクセスできるようにしたい  

---

## 1. Docker Desktop（WSL2）でのネットワーク概観

| 項目 | 説明 |
|------|------|
| **Docker の内部ネットワーク** | コンテナは同一ブリッジネットワーク (`docker network create …`) に接続すれば名前解決が可能です。外部（Windows ホスト）からは `localhost`（127.0.0.1）経由でポート公開したものだけにアクセスできます。 |
| **ポート公開** | `-p HOST:CONTAINER`（Compose の `ports:`）でホスト側のポートをバインドします。WSL2 → Windows への転送は Docker Desktop が自動で行いますので、Windows 側のファイアウォールだけが障壁になります。 |
| **Windows Defender Firewall** | 公開したい 80/443（あるいは別途使用するポート）がブロックされている場合は例外ルールを追加してください。 |
| **IIS 等の競合** | Windows に IIS が有効になっていると 80/443 を占有します。社内サーバとして Docker のみで使うなら、`サービス → World Wide Web Publishing Service`（IIS）を停止するかポート変更してください。 |

---

## 2. 複数アプリの構成パターン

| パターン | メリット | デメリット |
|----------|----------|-------------|
| **① 各コンテナを別ポートで直接公開** (`8081`, `8082` …) | 設定がシンプル。Docker Compose だけで完結。 | ユーザーは URL にポート番号を書く必要がある。社内ファイアウォールで非標準ポートが遮断されることも多い。 |
| **② リバースプロキシ（Nginx / Traefik / Caddy）を 1 台だけ公開し、内部は任意ポート** | 外部は常に 80/443 のみで済む。サブドメインやパスベースで自由に振り分け可能。TLS 終端・自動証明書取得も一元管理できる。 | プロキシの設定が必要になる（ただし自動化ツールが多数ある）。 |

**社内利用でも「ポート番号を覚えさせない」ことは UX 向上と保守性の観点から強く推奨されます**。したがって、ここでは **リバースプロキシ方式** を中心に解説します。

---

## 3. 推奨構成例①：Traefik (Docker ラベルで自動設定)

### 3‑1. なぜ Traefik？

- Docker のラベルだけでルーティング・TLS 設定が完結  
- 動的にコンテナの増減を感知し、設定ファイルを書き換える必要がない  
- Let's Encrypt による自動証明書取得（社内で公開サーバなら内部 CA でも可）  

### 3‑2. 必要なもの

| 項目 | 内容 |
|------|------|
| Docker Desktop (WSL2) | インストール済み・`docker compose version` が 2 系以上 |
| `traefik.yml`（静的設定） | エントリポイントや Let's Encrypt の設定を書きます |
| `docker-compose.yml` | アプリと Traefik を同一ネットワークで起動します |
| DNS / hosts ファイル | 社内ドメイン（例: `app1.localtest.me`）を Windows の `hosts` に登録して 127.0.0.1 に向けるか、社内 DNS に A レコードを作成 |

> **ポイント**：`localtest.me` は全てのサブドメインが自動的に 127.0.0.1 を指す便利なドメインです。社外公開しないテスト環境であればこれだけで完結します。

### 3‑3. `traefik.yml`（静的設定）

```yaml
# traefik.yml
log:
  level: INFO

api:
  dashboard: true   # http://localhost:8080/dashboard/ で UI が見える

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false   # 明示的にラベルで公開指定する方が安全

certificatesResolvers:
  myresolver:
    acme:
      email: your-admin@example.com
      storage: acme.json
      httpChallenge:
        entryPoint: web
```

- `acme.json` は Traefik が自動取得した証明書情報を保存するファイルです。**起動前に空ファイルを作り、権限 600 にしておく**こと。

```bash
touch acme.json && chmod 600 acme.json
```

### 3‑4. `docker-compose.yml`（全体構成）

```yaml
version: "3.9"

services:
  traefik:
    image: traefik:v2.11   # 必要に応じて最新版へ
    command:
      - "--configFile=/etc/traefik/traefik.yml"
    ports:
      - "80:80"          # HTTP（外部公開）
      - "443:443"        # HTTPS（外部公開）
      - "8080:8080"      # Dashboard 用 (社内限定で開く)
    volumes:
      - "./traefik.yml:/etc/traefik/traefik.yml:ro"
      - "./acme.json:/acme.json"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    networks:
      - web
    restart: unless-stopped

  app1:
    image: your-org/app1:latest   # 任意のイメージ
    expose:
      - "3000"                    # コンテナ内部だけで公開 (外部からは見えない)
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app1.rule=Host(`app1.localtest.me`)"
      - "traefik.http.routers.app1.entrypoints=websecure"
      - "traefik.http.routers.app1.tls.certresolver=myresolver"
    networks:
      - web
    restart: unless-stopped

  app2:
    image: your-org/app2:latest
    expose:
      - "4000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app2.rule=Host(`app2.localtest.me`)"
      - "traefik.http.routers.app2.entrypoints=websecure"
      - "traefik.http.routers.app2.tls.certresolver=myresolver"
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    driver: bridge
```

#### 補足ポイント

- **`expose`** は外部にポートを公開しないことを示すだけで、同一ネットワーク内からは `http://app1:3000` のように名前解決できます。  
- **Traefik のラベル** で「どのホスト名で受け付けるか」「TLS は自動取得するか」などを指定しています。  
- **HTTPS が必須の場合**は `websecure` エントリポイントだけにすれば、HTTP (80) はリダイレクトや削除でも OKです（例: `traefik.http.routers.app1.middlewares=redirect-to-https` など）。  

### 3‑5. Windows 側の DNS 設定

社内テストであれば **hosts ファイル** に次を追記すれば完了です（管理者権限が必要）:

```
127.0.0.1   app1.localtest.me
127.0.0.1   app2.localtest.me
```

> **※ 注意**：`localtest.me` のサブドメインは自動的に 127.0.0.1 に解決されるので、上記のように個別に書く必要はありませんが、社内 DNS がある場合はその方が管理しやすいです。

### 3‑6. 起動手順

```bash
# プロジェクトディレクトリへ移動
cd C:\path\to\your\project   # PowerShell / CMD でも可
# (WSL2 の Linux シェルからも同じパスでマウントされます)

docker compose up -d    # Docker Desktop が自動的に WSL2 にデプロイ
```

- 起動後、ブラウザで `https://app1.localtest.me/` へアクセス → **Traefik が自動で証明書を取得し**（初回は HTTP‑01 の挑戦が走ります）  
- ダッシュボードは `http://localhost:8080/dashboard/` （認証なしのまま公開されるので社内限定ネットワークだけにしてください）

### 3‑7. よくあるトラブルと対処

| 症状 | 原因例 | 対策 |
|------|--------|------|
| **ブラウザが `ERR_CONNECTION_REFUSED`** | Windows のファイアウォールで 80/443 がブロックされている | 「Windows Defender ファイアウォール」→「受信の規則」で `Docker Desktop` に対しポート 80, 443 を許可 |
| **Traefik Dashboard が表示できない** | `docker compose up -d` 後に `traefik` コンテナが落ちている | `docker logs traefik` でエラーログ確認。`acme.json` の権限や `traefik.yml` の構文ミスが多い |
| **HTTPS が自己署名証明書になる** | Let's Encrypt の HTTP‑01 チャレンジが外部から届かない（社内だけで閉じたネットワーク） | 社内 CA で発行した証明書を `traefik.yml` に `tls.certificates` として直接設定、または `insecureSkipVerify` を一時的に有効化 |
| **app1 が 404** | アプリ側がコンテナ内部のルート (`/`) でなく `/api` 等を期待している | Nginx や Traefik の `PathPrefixStrip` ミドルウェアでベースパスを除去するか、アプリ側で **コンテキストルート** を変更（例: Spring Boot の `server.servlet.context-path=/app1`） |
| **ポート競合 (80/443) が発生** | Windows に IIS や別のプロキシがバインドしている | `services.msc` → 「World Wide Web Publishing Service」(IIS) を停止、または Docker のポートマッピングを変更（例: `"8080:80"`） |

---

## 4. 推奨構成例②：Nginx + docker‑gen (自動設定)

Traefik が好みでなければ、**Nginx** と **docker-gen** の組み合わせでも同様に「ラベルで自動リバースプロキシ」実装が可能です。

### 4‑1. 構成イメージ

```
[Windows Host] <--(localhost:80/443)--> [Docker Desktop]
   |
   +-- nginx (ポート公開)
         |
         +-- docker-gen が /etc/nginx/conf.d/*.conf を自動生成
         +-- 各アプリコンテナ (内部任意ポート) ← 同一 bridge ネットワーク
```

### 4‑2. `docker-compose.yml`（Nginx 系）

```yaml
version: "3.9"

services:
  nginx-proxy:
    image: jwilder/nginx-proxy:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/tmp/docker.sock:ro"
      - "./certs:/etc/nginx/certs:ro"   # 手動で入れた証明書（社内 CA など）
    networks:
      - web
    restart: unless-stopped

  app1:
    image: your-org/app1:latest
    expose:
      - "3000"
    environment:
      - VIRTUAL_HOST=app1.localtest.me   # nginx-proxy が参照する env var
      - LETSENCRYPT_HOST=app1.localtest.me   # (自動取得したい場合)
      - LETSENCRYPT_EMAIL=admin@example.com
    networks:
      - web
    restart: unless-stopped

  app2:
    image: your-org/app2:latest
    expose:
      - "4000"
    environment:
      - VIRTUAL_HOST=app2.localtest.me
      - LETSENCRYPT_HOST=app2.localtest.me
      - LETSENCRYPT_EMAIL=admin@example.com
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    driver: bridge
```

- **`VIRTUAL_HOST`** 環境変数で Nginx が自動的に `server_name` を生成。  
- **LetsEncrypt の自動取得** は同じイメージに含まれる `jrcs/letsencrypt-nginx-proxy-companion` を追加すれば可能です（ただし外部から 80 にアクセスできる環境が前提）。社内だけで完結させたい場合は手動で証明書を作成して `certs/` ディレクトリに配置します。  

### 4‑3. Windows 側の DNS 設定

先ほどと同様、`hosts` に以下を書き込むか社内 DNS を利用：

```
127.0.0.1   app1.localtest.me
127.0.0.1   app2.localtest.me
```

### 4‑4. 起動手順

```bash
docker compose up -d
```

Nginx の設定は `docker-gen` が Docker ソケットを監視し、コンテナが起動/停止するたびに自動でリロードします。  

> **メリット**：構成がシンプル（環境変数だけ）  
> **デメリット**：Traefik に比べて機能が限定的（SNI ベースの複数証明書、ミドルウェアなどは自前で拡張必要）

---

## 5. 推奨構成例③：Caddy (最もシンプルに HTTPS 自動取得)

Caddy は **「設定ファイルがなくても環境変数だけ」** でも動作し、TLS の自動取得がデフォルトで有効です。

### 5‑1. `docker-compose.yml`

```yaml
version: "3.9"

services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "./Caddyfile:/etc/caddy/Caddyfile"
      - "caddy_data:/data"   # TLS データ保存用ボリューム
    networks:
      - web

  app1:
    image: your-org/app1:latest
    expose:
      - "3000"
    labels:
      - "caddy=app1.localtest.me"
      - "caddy.reverse_proxy={{upstreams 127.0.0.1:3000}}"
    networks:
      - web

  app2:
    image: your-org/app2:latest
    expose:
      - "4000"
    labels:
      - "caddy=app2.localtest.me"
      - "caddy.reverse_proxy={{upstreams 127.0.0.1:4000}}"
    networks:
      - web

volumes:
  caddy_data:

networks:
  web:
    driver: bridge
```

### 5‑2. `Caddyfile`（最小構成）

```caddy
{
    # デバッグモードやログレベルは必要に応じて設定
    debug
}

# ここでは何も書かなくても、ラベルで自動的にサーバが生成されます。
```

- Caddy は **Docker ラベル** (`caddy=` と `caddy.reverse_proxy`) を読んで自動的に仮想ホストとリバースプロキシ設定を作ります。  
- TLS は Let's Encrypt が自動取得し、`caddy_data` ボリュームに保存されます（社内ネットワークだけなら自己署名でも可）。  

### 5‑3. Windows 側 DNS

同様に `hosts` にサブドメインを追加すれば OK。

---

## 6. まとめ：Windows 11 + Docker Desktop (WSL2) でのベストプラクティス

| 項目 | 推奨設定 |
|------|----------|
| **外部に公開するポート** | 80（HTTP） と 443（HTTPS）のみ。内部アプリは `expose` のみで外部に見せない |
| **リバースプロキシ** | Traefik が最も柔軟かつ Docker ラベルだけで完結できるのでおすすめ。ただし社内で簡易に済ませたいなら Caddy でも OK |
| **TLS 証明書** | 公開サーバなら Let's Encrypt（Traefik / Caddy が自動取得）<br>社内だけの場合は内部 CA の証明書を `caddy`/`nginx` にマウントするか、自己署名で運用 |
| **DNS / ホスト名** | 社内 DNS で `app1.example.local` → Windows マシン IP、もしくはテストだけなら `localtest.me`（全サブドメインが 127.0.0.1）を利用 |
| **ファイアウォール** | Windows Defender の「受信規則」に `Docker Desktop (TCP) 80,443` を許可。IIS が動いている場合は停止かポート変更 |
| **コンテナ間通信** | 同一ブリッジネットワーク（例: `web`）に所属させ、名前解決はサービス名で行う (`app1`, `app2`) |
| **運用上の注意** | - `docker compose up -d` 後は `docker ps` でコンテナがすべて **Running** か確認<br>- `docker logs <container>` でエラーログを随時チェック<br>- 証明書更新は自動（Traefik/Caddy）だが、手動証明書の場合は期限切れに注意 |
| **トラブルシューティング** | - **ポート競合** → IIS/他サービス停止 <br> - **HTTPS が自己署名** → Let's Encrypt のチャレンジが外部から届かない場合は社内 DNS に `*.example.local` を指すようにし、内部 CA で証明書を発行<br> - **リバースプロキシが 502/504** → アプリ側のポート・コンテナ起動順序（`depends_on`）やヘルスチェック設定を確認 |

---

## 7. 実際に手を動かすまでのステップバイステップ

1. **Docker Desktop のインストール & WSL2 有効化**  
   - Windows の「設定」→「アプリと機能」→「Optional Features」で `Virtual Machine Platform` と `Windows Subsystem for Linux` を有効にし、再起動。  
   - Docker Desktop を公式サイトからダウンロードし、インストール時に **WSL2 backend** を選択。

2. **プロジェクトディレクトリ作成**（例: `C:\dev\multi-web`）  

3. **構成ファイルを配置**  
   - `docker-compose.yml`（上記 Traefik 版か Caddy 版）  
   - `traefik.yml`（Traefik 使用時）または `Caddyfile`（Caddy 使用時）  
   - （必要なら）`acme.json`（権限 600 に chmod）

4. **Windows の hosts 設定**（管理者でメモ帳を開き `C:\Windows\System32\drivers\etc\hosts` を編集）  

```
127.0.0.1   app1.localtest.me
127.0.0.1   app2.localtest.me
```

5. **起動**  

```powershell
cd C:\dev\multi-web
docker compose up -d
```

6. **確認**  
   - ブラウザで `https://app1.localtest.me/` → アプリが表示されるか。  
   - `http://localhost:8080/dashboard/`（Traefik）または `http://localhost:80`（Nginx）でリバースプロキシのステータスを確認。

7. **トラブル時**  

```powershell
docker compose logs traefik      # Traefik のログ
docker compose logs app1        # アプリ側のログ
```

---

## 8. 参考リンク（公式ドキュメント）

| ツール | URL |
|--------|-----|
| Docker Desktop (WSL2) | https://docs.docker.com/desktop/windows/wsl/ |
| Traefik v2 | https://doc.traefik.io/traefik/ |
| jwilder/nginx‑proxy | https://github.com/jwilder/nginx-proxy |
| Caddy 2 | https://caddyserver.com/docs/ |
| Let's Encrypt | https://letsencrypt.org/getting-started/ |
| localtest.me (便利なテストドメイン) | http://localtest.me/ |

---

### 最後に

- **「ポートを増やす」** だけでも動作はしますが、社内・外部ユーザーの利便性とファイアウォール対策から **リバースプロキシで 80/443 のみ公開** する構成が最も現実的です。  
- Windows 11 + Docker Desktop (WSL2) は Linux コンテナと同様に `docker compose` がそのまま使えるので、上記の `docker-compose.yml` をコピーして **すぐに試せます**。  
- 実際に運用を始めたら「証明書更新」「コンテナのロールバック」などの運用手順も併せて整備すると、トラブルが起きてもスムーズに復旧できます。

何か **特定のアプリ（例: Spring Boot, Node.js, PHP など）** の Dockerfile やコンテナ内部でのベースパス設定について質問があれば、遠慮なく聞いてください！ Happy Dockering 🚀