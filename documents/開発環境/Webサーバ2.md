# 📡 Web サーバ（HTTP / Reverse‑Proxy / アプリケーションサーバ）を **網羅的にまとめた一覧**  
（2024‑12 時点の主流・実務でよく目にする製品・ライブラリを対象）

> **ポイント**  
> - 「Web サーバ」＝「静的コンテンツやプロキシだけを提供する HTTP デーモン」＋「アプリケーションコード（言語ランタイム）を直接組み込んだサーバ」の 2 大系に分けて整理。  
> - 各製品の **メリット / デメリット**、**主な利用シーン**、**性能指標（TechEmpower Benchmark の参考値）** を併記。  
> - コンテナ／Kubernetes 環境でのデプロイやマネージドロードバランサ・エッジサーバまでカバーし、選定チェックリストを最後にまとめます。

---

## 1️⃣ Web サーバの大分類

| カテゴリ | 主な製品・ライブラリ例 | 主な役割 |
|----------|-----------------------|-----------|
| **スタンドアロン HTTP/Reverse‑Proxy** | Apache httpd、Nginx、Caddy、Lighttpd、H2O、OpenLiteSpeed、Caddy など | 静的ファイル配信、TLS 終端、リバースプロキシ／ロードバランシング |
| **言語ランタイム内蔵のアプリケーションサーバ** | Node.js (`http`/Express/Fastify)、Deno std/http、Go net/http（Gin/Echo など）、Rust hyper/actix‑web/axum/tide、Java (Tomcat / Jetty / Undertow / WildFly) 、.NET Kestrel + IIS、PHP‑FPM、Python Gunicorn/uWSGI/Daphne | アプリケーションコードを直接実行し、HTTP リクエストを処理 |
| **高性能リバースプロキシ／Service Mesh 代理** | HAProxy、Envoy Proxy、Traefik、NGINX Unit、Kong (API‑Gateway) | L7 ロードバランシング、トラフィック分割、mTLS・Observability 等の高度機能 |
| **マネージドロードバランサ／CDN** | AWS ALB/NLB/ELB、GCP Cloud Load Balancer、Azure Front Door / Application Gateway、Cloudflare Load Balancing | 完全マネージドでスケーラブルなエントリーポイント |
| **エッジ・サーバーレス HTTP フロント** | Cloudflare Workers、Fastly Compute@Edge、Vercel Edge Functions、Netlify Edge Handlers、AWS Lambda@Edge | リクエストをエッジで即座に処理し、低レイテンシと自動スケールを実現 |

---

## 2️⃣ スタンドアロン HTTP / Reverse‑Proxy 系（静的配信・TLS 終端）

| 製品 | 実装言語 / ライセンス | 同時接続モデル | 対応 HTTP バージョン | TLS / HTTP/3 | 設定方式 | 主な利用シーン | **メリット** | **デメリット** |
|------|------------------------|---------------|--------------------|--------------|----------|----------------|------------|----------------|
| **Apache httpd** | C (Apache License 2.0) | スレッド/プロセス（`mpm_event` がイベント駆動） | HTTP/1.1, HTTP/2 (mod_http2), HTTP/3 (experimental) | OpenSSL / mod_ssl、TLS 1.3 対応 | `.conf` テキストベース、モジュールで拡張 | 伝統的な LAMP 環境、.htaccess によるディレクトリ単位設定 | - 豊富なモジュール（mod_rewrite, mod_proxy, auth 等）<br>- 大規模コミュニティ・ドキュメント | - 設定が冗長になりやすい<br>- パフォーマンスは Nginx に劣るケース多数 |
| **Nginx** (Open‑Source) | C (2‑clause BSD) | イベント駆動（epoll/kqueue） | HTTP/1.1, HTTP/2, HTTP/3 (QUIC) | TLS 1.3 + OCSP Stapling 標準装備 | `nginx.conf` → 直感的な階層構造 | 静的ファイル配信、リバースプロキシ、ロードバランサ | - 高スループット・低レイテンシ（数十万 RPS) <br>- メモリフットプリントが小さい<br>- `stream` モジュールで TCP/UDP も扱える | - 動的コンフィグは外部ツールが必要（NGINX Plus, NGINX Unit） |
| **Caddy** (v2) | Go (Apache‑2.0) | イベント駆動 + goroutine プーリング | HTTP/1.1, HTTP/2, HTTP/3 (QUIC) | 自動 TLS (Let's Encrypt) + TLS 1.3 | `Caddyfile`（シンプル DSL）／JSON API | 開発者向けの「Zero‑Config」サーバ、HTTPS が必須のサイト | - **自動 HTTPS** がデフォルトで設定不要 <br>- プラグインエコシステムが成長中 <br>- Go の軽量ランタイム | - カスタマイズ性は Nginx に比べ劣る（高度なリバースプロキシ設定は JSON API が必要） |
| **Lighttpd** | C (BSD) | イベント駆動 (select/epoll/kqueue) | HTTP/1.1, HTTP/2 (mod\_http2) | TLS via OpenSSL / GnuTLS | `lighttpd.conf`（シンプル） | 小規模・低リソース環境、IoT ゲートウェイ | - 非常に軽量（数 MB のメモリ）<br>- FastCGI が標準で組み込み | - 開発が停滞気味<br>- モジュールが少なく、HTTP/3 未対応 |
| **H2O** | C (MIT) | イベント駆動 + HTTP/2 に最適化 | HTTP/1.1, **HTTP/2 only**, HTTP/3 (experimental) | TLS 1.3 標準装備（OpenSSL/BoringSSL） | `h2o.conf`（YAML ライク） | 高速 HTTP/2 サーバ、CDN のエッジノード | - HTTP/2 に特化し最小レイテンシ <br>- TLS 終端が高速 | - HTTP/1.1 のサポートは限定的<br>- エコシステムが小さい |
| **OpenLiteSpeed / LiteSpeed Enterprise** | C++ (GPLv3 / 商用) | イベント駆動 + スレッドプール | HTTP/1.1, HTTP/2, QUIC (Enterprise) | TLS 1.3、OCSP Stapling | `httpd_config.conf`（Apache 互換） | 高トラフィックサイト、cPanel / WHM 環境 | - 商用版はキャッシュ・WAF が強力<br>- 同等の Apache 設定が流用できる | - 無料版は機能制限あり <br>- Enterprise は有償 |
| **Caddy + Caddy‑Proxy** (モジュール) | Go | イベント駆動 + goroutine | HTTP/1.1,2,3 | 自動 TLS | `Caddyfile` | エッジプロキシ、マイクロサービス間の簡易 L7 ルーティング | - 設定が最もシンプル <br>- プラグインで機能拡張可能 | - 大規模カスタムリバースプロキシはコードベースになる |

> **TechEmpower Benchmark（Round‑Robin）参考値**  
> （2024 年 2Q、`wrk` による単純 GET の RPS。実測環境は同一 CPU・RAM 条件）  

| 製品 (スタンドアロン) | RPS（≈） |
|----------------------|----------|
| Nginx (`ngx_http_static_module`) | 1 200 000+ |
| Caddy (static) | 800 000–900 000 |
| Apache httpd (prefork) | 300 000–400 000 |
| Lighttpd | 500 000–600 000 |
| H2O (HTTP/2) | 1 100 000+ |

※実際のアプリケーション層が入ると数十％程度減衰します。  

---

## 3️⃣ 言語ランタイム内蔵型 **アプリケーションサーバ**（フレームワーク＋ HTTP デーモン）

| 製品 / ライブラリ | 実装言語・プラットフォーム | 同時接続モデル | HTTP バージョン | TLS 終端 | 主な利用シーン | **メリット** | **デメリット** |
|-------------------|----------------------------|---------------|-----------------|----------|----------------|--------------|----------------|
| **Node.js `http` / Express / Fastify** | V8 (C++) + libuv（イベント駆動） | シングルスレッド＋非同期 I/O (worker threads optional) | HTTP/1.1, HTTP/2 (`http2` モジュール), HTTP/3 (experimental) | TLS via `https` module / 外部リバースプロキシが一般的 | API サーバ、リアルタイム（WebSocket） | - エコシステム最大<br>- 非同期コードが書きやすい <br>- npm パッケージが豊富 | - シングルスレッドで CPU バウンドに弱い<br>- メモリ使用量が高め |
| **Deno std/http** | Rust + V8 (TypeScript/JS) | 非同期（Tokio） | HTTP/1.1, HTTP/2 (experimental), HTTP/3 (experimental) | TLS via native Rust crates | サーバレス・Edge での軽量 API | - 標準ライブラリが安全かつモジュール化<br>- TypeScript がデフォルト | - エコシステムは Node に比べ小規模 |
| **Go `net/http`** (標準) / Gin / Echo / Fiber | Go (goroutine + netpoll) | 多数の軽量 goroutine → 1:1 コネクションモデル | HTTP/1.1, HTTP/2 (自動), HTTP/3 (experimental via `quic-go`) | TLS via `crypto/tls`（標準） | 高トラフィック API、マイクロサービス | - ビルドが単一バイナリ、デプロイ容易<br>- GC が低遅延 | - 標準 `net/http` はミドルウェア機能が少ない（フレームワークで補完） |
| **Rust hyper / actix‑web / axum / tide** | Rust (async/await + Tokio or async-std) | 非同期、タスクベース（軽量スレッド） | HTTP/1.1, HTTP/2 (`hyper`), HTTP/3 (via `quinn`) | TLS via `rustls` または OpenSSL | 高性能 API、低レイテンシマイクロサービス | - コンパイル時に安全性が保証<br>- 0‑copy I/O が高速 | - 学習コストとビルド時間が長い |
| **Java Servlet Containers** (Tomcat / Jetty / Undertow) | Java (JVM) | スレッドプール（NIO/非ブロッキング） | HTTP/1.1, HTTP/2 (Tomcat 9+, Jetty 10+) | TLS via `JSSE` | エンタープライズ Web アプリ、Spring Boot の埋め込みサーバ | - 成熟したエコシステム・ツールチェーン<br>- JMX や APM が豊富 | - JVM 起動が遅くメモリ消費大 |
| **Undertow** (WildFly) | Java (NIO + XNIO) | 非同期 I/O、軽量スレッドプール | HTTP/1.1, HTTP/2 | TLS via `JSSE` | 高性能非同期サーブレット、マイクロサービス（Quarkus） | - 非常に高速・低オーバーヘッド<br>- Undertow の「handler」チェーンが柔軟 | - ドキュメントは限定的 |
| **.NET Kestrel** (ASP.NET Core) | .NET 7+ (C#) | ソケットベース、スレッドプール + I/O 完成度高い | HTTP/1.1, HTTP/2, HTTP/3 (preview) | TLS via `SslStream` | クロスプラットフォーム API、マイクロサービス | - 高速かつシンプルな設定（`appsettings.json`）<br>- Windows/IIS との統合が容易 | - .NET ランタイムのサイズはやや大きい |
| **IIS** (Windows) + ASP.NET Core Module | C++/C# (Windows) | スレッドプール、IOCP（I/O Completion Ports） | HTTP/1.1, HTTP/2 (Win10+) | TLS via Windows Cert Store | 企業の Windows 環境での .NET アプリ | - Windows 管理ツールが充実<br>- 統合認証が簡単 | - Linux 非対応、クラウド環境ではあまり使わない |
| **PHP‑FPM + Nginx/Apache** | PHP (Zend Engine) + FastCGI | プロセスプール（`pm.max_children`） | HTTP/1.1, HTTP/2 (NGINX) | TLS はフロントエンドが担当 | WordPress、Laravel 等の LAMP 系 | - 既存 CMS が多数対応<br>- PHP‑FPM のプロセスマネジメントが成熟 | - プロセス起動コストとメモリ使用量が大きい |
| **Python Gunicorn / uWSGI** | CPython (C extensions) + pre‑fork/async workers | ワーカーごとのプロセスまたは greenlet（gevent） | HTTP/1.1, HTTP/2 (Gunicorn + `uvicorn` for ASGI) | TLS via reverse proxy (Nginx) が一般的 | Flask/Django/FastAPI のデプロイ | - シンプルな設定ファイル<br>- 多様なワーカーモデル（sync/async） | - 標準は sync → 高負荷時にスレッド数がボトルネック |
| **Python ASGI (Daphne / Uvicorn / Hypercorn)** | Python async (asyncio) | 非同期イベントループ | HTTP/1.1, HTTP/2 (Uvicorn), HTTP/3 (experimental) | TLS via `ssl` モジュール or reverse proxy | FastAPI、Starlette、Quart 等の非同期フレームワーク | - 高い同時接続数が可能（asyncio）<br>- WebSocket が標準サポート | - async デバッグがやや難しい |
| **Ruby Puma / Unicorn** | Ruby MRI (C) | 多プロセス（Unicorn）またはマルチスレッド（Puma） | HTTP/1.1, HTTP/2 (Puma ≥ 5) | TLS via reverse proxy (NGINX) が推奨 | Rails、Sinatra アプリ | - デフォルトでシンプルな設定<br>- Puma はスレッド安全で高性能 | - Ruby の GIL により CPU バウンドに制限 |
| **Elixir Phoenix / Cowboy** | Erlang/OTP (BEAM) | 軽量プロセス（数十万単位） | HTTP/1.1, HTTP/2 (Phoenix 1.7+), HTTP/3 (experimental) | TLS via `:ssl` アプリケーション | 高同時接続が必要なチャット、リアルタイム API | - 「Let it crash」哲学で高可用性<br>- Channels が WebSocket を簡単に提供 | - 学習コストは Erlang/Elixir に依存 |
| **C++ 自作サーバ (Boost.Beast, Crow, Drogon)** | C++17/20 | 非同期 I/O（`epoll`/`IOCP`） | HTTP/1.1, HTTP/2 (Boost.Beast) | TLS via OpenSSL/BoringSSL | 超低レイテンシ・ハイパフォーマンス取引所等 | - ネイティブ速度、メモリフットプリント最小 | - 開発コストが高く、バグリスク大 |

> **TechEmpower Benchmark（Framework Benchmarks）** の「Round‑Robin」セクションで代表的な言語ランタイム＋サーバの RPS を抜粋  

| 言語/フレームワーク | 参考 RPS (GET) |
|---------------------|---------------|
| Go `net/http` (plain) | **1 300 000+** |
| Rust actix‑web | **2 200 000+** |
| Java Spring Boot (Undertow) | **800 000–900 000** |
| Node.js Fastify | **600 000–700 000** |
| .NET Core Kestrel | **1 100 000+** |
| Python `uvicorn` (ASGI) | **300 000–400 000** |
| Ruby Puma | **200 000–250 000** |

※上記は「単純 JSON 応答」ベンチマークで、実アプリケーションでは 30‑70% 程度が目安です。

---

## 4️⃣ 高性能リバースプロキシ / Service Mesh 代理

| 製品 | 実装言語・ライセンス | 同時接続モデル | HTTP/2 & HTTP/3 | mTLS / セキュリティ | Observability (metrics) | 主な利用ケース | **メリット** | **デメリット** |
|------|-----------------------|---------------|-----------------|-------------------|------------------------|----------------|--------------|----------------|
| **HAProxy** (Community) | C (GPLv2) | イベント駆動（epoll/kqueue） | HTTP/1.1, HTTP/2, **HTTP/3** (2024‑Q3 から実装) | TLS termination + mTLS via OpenSSL/BoringSSL | 高可用性 L4/L7 ロードバランサ、DDoS 防御 | - 業界最速のスループット（>10 M RPS)<br>- 設定がテキストベースで高速解析<br>- 低レイテンシ・ヘルスチェックが豊富 | - 設定構文は独特で学習コストあり |
| **Envoy Proxy** (C++) | Apache‑2.0 | 非同期 I/O + スレッドプール（worker threads） | HTTP/1.1, HTTP/2, **HTTP/3** (QUIC) | TLS termination & mTLS、SPIFFE / cert rotation 自動化 | Service Mesh データプレーン、API ゲートウェイ | - 動的構成 (xDS API) が強力<br>- Observability（statsd, Prometheus）<br>- L7 フィルタリングがプラグインで拡張可能 | - 設定が JSON/YAML で冗長になることがある |
| **Traefik** (v2) | Go (MIT) | イベント駆動 + goroutine | HTTP/1.1, HTTP/2, HTTP/3 (preview) | TLS via ACME (Let's Encrypt) + mTLS | Metrics → Prometheus / Grafana, Dashboard UI | Kubernetes Ingress、Docker Swarm の自動リバースプロキシ | - **Auto‑discovery**（K8s, Docker, Consul）で設定不要<br>- ダッシュボードが直感的 | - 高負荷時のスループットは HAProxy に劣る |
| **NGINX Unit** | C (2‑clause BSD) | イベント駆動 + プロセスワーカー | HTTP/1.1, HTTP/2 | TLS termination via OpenSSL | JSON API でリアルタイム設定変更、Prometheus exporter | 多言語（PHP, Python, Go, Ruby）を同一プロキシでホスト | - ランタイムに言語別アプリを直接デプロイ可能<br>- 設定が RESTful API → 動的更新が容易 | - HTTP/3 未対応、コミュニティは限定的 |
| **Kong (Community / Enterprise)** | Lua + Nginx OpenResty | Nginx ベースのイベント駆動 | HTTP/1.1, HTTP/2, HTTP/3 (Enterprise) | TLS termination, OAuth2, JWT, mTLS プラグイン | Prometheus plugin、Kong Manager UI | API ゲートウェイ、マイクロサービス認可 | - 豊富なプラグインエコシステム（Rate‑limit, ACL, Auth）<br>- Declarative Config (DB‑less) が可能 | - 基盤が Nginx のため設定はやや冗長<br>- Enterprise 機能は有償 |
| **Istio (Envoy + Pilot)** | Go / C++ | Envoy データプレーン＋Pilot コントロールプレーン | HTTP/1.1, HTTP/2, HTTP/3 (experimental) | mTLS がデフォルトで自動ローテーション | Telemetry → Prometheus, Grafana, Jaeger | Service Mesh 全体のトラフィック管理・ポリシー | - 体系的な L7 ポリシー、可観測性が標準装備 | - 複雑さとリソース消費が大きい（小規模クラスターでは過剰） |

> **パフォーマンス例**（TechEmpower の「Proxy」ベンチマーク）  
> - HAProxy: 10 M RPS (TCP) / 5 M RPS (HTTP/1.1)  
> - Envoy: 3–4 M RPS (HTTP/2)  
> - Traefik: 1‑2 M RPS (HTTP/1.1)

---

## 5️⃣ マネージドロードバランサ / CDN エッジ

| サービス | 提供元 | 主な機能 | HTTP バージョン | TLS 終端 | スケーラビリティ | Observability | メリット | デメリット |
|----------|--------|-----------|------------------|----------|-------------------|--------------|----------|------------|
| **AWS Application Load Balancer (ALB)** | Amazon Web Services | L7 ルーティング、ホスト/パスベース、WebSocket, HTTP/2 | HTTP/1.1, HTTP/2 | ACM による自動 TLS | Auto‑Scaling（数千〜数十万 RPS） | CloudWatch メトリクス、アクセスログ | - 完全マネージド、VPC 内でプライベート LB も作成可<br>- 複数 AZ にまたがる高可用性 | - カスタムヘッダーや高度なリクエスト改変は限定的 |
| **AWS Network Load Balancer (NLB)** | AWS | L4（TCP/UDP）ロードバランシング、IP アドレス保持 | N/A | TLS パススルーまたは TLS 終端（TLS Listener） | 超高スループット（> 100 Mpps) | CloudWatch, VPC Flow Logs | - 超低レイテンシ・大規模トラフィックに最適 | - L7 機能が無い |
| **GCP Cloud Load Balancing (HTTP(S), TCP/SSL)** | Google Cloud | グローバル分散 L7/L4、Cloud CDN 統合 | HTTP/1.1, HTTP/2, gRPC | Managed SSL/TLS（Google Managed Cert） | 世界規模の自動スケール | Stackdriver Monitoring & Logging | - エッジで終端し DNS ラウンドロビンが不要 | - 設定 UI がやや複雑 |
| **Azure Front Door / Application Gateway** | Microsoft Azure | L7 ルーティング、WAF、WebSocket, HTTP/2 | HTTP/1.1, HTTP/2, gRPC | Azure Managed Certs | グローバルスケール（Front Door）/リージョン単位（App GW） | Azure Monitor + Log Analytics | - Azure の他サービスとシームレス連携 | - 価格がやや高め、カスタムヘッダーは制限 |
| **Cloudflare Load Balancing** | Cloudflare | DNS‑レベルのロードバランサ＋Health Checks, Geo‑Steering | HTTP/1.1, HTTP/2, HTTP/3 (QUIC) | Universal SSL (自動) | エッジでミリ秒単位の応答 | Analytics Dashboard, Workers 連携 | - 世界中にエッジがあるため遅延最小化 | - 高度な L7 カスタマイズは Workers に委託必要 |
| **Fastly Edge Compute** | Fastly | CDN + エッジコンピューティング（VCL / WASM） | HTTP/1.1, HTTP/2, HTTP/3 | TLS termination (Managed) | 超高速キャッシュ、瞬時のスケールアウト | Real‑time logs, Grafana integration | - VCL が柔軟でリクエスト改変が得意 | - VCL 学習コスト、WASM のデバッグはやや難しい |

---

## 6️⃣ エッジ・サーバーレス HTTP（「コードをエッジに直接置く」）

| プラットフォーム | 実装言語 / ランタイム | HTTP/2 & HTTP/3 | TLS 終端 | デプロイ方法 | 主な利用シーン | **メリット** | **デメリット** |
|------------------|-----------------------|-----------------|----------|--------------|----------------|--------------|----------------|
| **Cloudflare Workers** | JavaScript (V8 isolates) / Rust/Wasm | HTTP/2, **HTTP/3 (QUIC)** | Cloudflare Managed TLS | `wrangler` CLI → KV、Durable Objects へデプロイ | CDN レベルのリクエスト改変、A/B テスト、認証 | - ミリ秒単位のレイテンシ<br>- グローバルに自動スケール<br>- KV/DO が組み込み | - ランタイムは V8 に限定（Node API の一部未実装）<br>- 実行時間上限 50 ms (Free) |
| **Fastly Compute@Edge** | Rust / C++ / JavaScript (Wasm) | HTTP/2, HTTP/3 (experimental) | Managed TLS | `fastly compute` CLI → Wasm バイナリ | 高度なキャッシュ制御、画像最適化、A/B テスト | - ネイティブ Rust が高速<br>- 低レイテンシでデータ処理が可能 | - 開発フローが Wasm ビルドに依存 |
| **Vercel Edge Functions** | Node.js (Next.js) + WebAssembly | HTTP/2, HTTP/3 (Beta) | Managed TLS | Git デプロイ → 自動ビルド | Next.js アプリの SSR/ISR、API Routes | - Vercel のデプロイフローと統合<br>- Serverless と Edge が混在可能 | - 実行時間は 5 s 程度に制限 |
| **Netlify Edge Handlers** | JavaScript (Deno) | HTTP/2, HTTP/3 (Beta) | Managed TLS | Netlify UI / Git デプロイ | 静的サイトのカスタムヘッダー、認証 | - Deno のモダン API が使用可能<br>- ビルドと同時にデプロイ | - 機能はまだ限定的 |
| **AWS Lambda@Edge** | Node.js / Python (Lambda) | HTTP/1.1, HTTP/2 (CloudFront) | CloudFront Managed TLS | AWS コンソール → CloudFront ディストリビューションへアタッチ | CDN での画像変換、認証、ヘッダー操作 | - 大規模な CloudFront ネットワークに直接組み込める | - 起動レイテンシがやや高い（Cold start）<br>- デバッグが難しい |

---

## 7️⃣ 選定チェックリスト

| 判定項目 | 質問例 | 推奨候補 |
|----------|--------|-----------|
| **トラフィック規模** (RPS, 同時接続) | 1 k〜10 k / 100 k+ ? | 小規模 → Nginx/Caddy/Apache<br>大規模 → HAProxy、Envoy、K8s + Ingress（Traefik/NGINX‑Ingress） |
| **TLS 終端の自動化** | 証明書取得・ローテーションは自動が必要か？ | 自動 ACME が欲しい → Caddy, Traefik, Cloudflare Workers (Edge) |
| **HTTP バージョン要件** | HTTP/2、HTTP/3 必須か？ | HTTP/3 必須 → Nginx ≥ 1.25, HAProxy ≥ 2.9, Envoy, Cloudflare Workers |
| **アプリケーション言語** | Node / Go / Rust / Java etc.? | 言語ランタイム内蔵が欲しい → Node の `http`、Go `net/http`、Rust actix‑web |
| **マイクロサービス間通信** | mTLS・サービスディスカバリが必要か？ | Service Mesh が必要 → Envoy + Istio, Linkerd |
| **Observability 必須度** | Prometheus / Grafana でメトリクス取得したいか？ | HAProxy、Envoy、Traefik は標準 exporter<br>Apache/Nginx はサードパーティモジュールが必要 |
| **運用体制** | 自前でインフラ管理できるか？ | 完全マネージド → AWS ALB, GCP Cloud Load Balancing, Azure Front Door |
| **エッジ低レイテンシ** | 世界中に分散したユーザー向けか？ | エッジサーバーレス → Cloudflare Workers、Fastly Compute@Edge |
| **静的コンテンツ配信** | CDN と併用したいか？ | Nginx + CDN、Caddy (自動 TLS) 、CDN の Edge Functions でキャッシュ制御 |
| **ライセンス・コスト** | OSS が必須か、商用サポートが必要か？ | OSS → Nginx, HAProxy, Envoy, Caddy<br>商用サポート → F5 BIG‑IP (プロプライエタリ), LiteSpeed Enterprise |

---

## 8️⃣ まとめ（選び方のフローチャート）

1. **「TLS が自動で欲しい」** → **Caddy** または **Traefik**。  
2. **「極限スループット／数十万 RPS」** → **HAProxy**（L4/L7）か **Envoy**（Service Mesh 必要なら）。  
3. **「言語ランタイムが統合されたサーバが欲しい」** → 言語別に選択：  
   - Node.js → `http`/Fastify (単体) + Nginx 前段で TLS<br>
   - Go → 単一バイナリ (`net/http`) + Caddy/NGINX でリバースプロキシ<br>
   - Rust → actix‑web / axum（高速）+ Envoy 前段で mTLS  
4. **「Kubernetes 上で自動ディスカバリ」** → **Ingress Controller**：Traefik (CRD) または NGINX‑Ingress。  
5. **「マイクロサービス間の高度なトラフィック制御・ポリシー」** → **Istio（Envoy）**、もしくは **Kong Enterprise**。  
6. **「エッジでコードを走らせてレイテンシ削減」** → **Cloudflare Workers** / **Fastly Compute@Edge**。  

---

## 参考リンク（2024‑12 時点）

| カテゴリ | URL |
|----------|-----|
| Nginx (公式) | https://nginx.org/ |
| Caddy (公式) | https://caddyserver.com/ |
| HAProxy (公式) | https://www.haproxy.org/ |
| Envoy Proxy | https://www.envoyproxy.io/ |
| Traefik | https://traefik.io/ |
| Kong Gateway | https://konghq.com/kong/ |
| TechEmpower Framework Benchmarks | https://www.techempower.com/benchmarks/ |
| AWS ALB / NLB | https://aws.amazon.com/elasticloadbalancing/ |
| GCP Cloud Load Balancing | https://cloud.google.com/load-balancing |
| Azure Front Door | https://azure.microsoft.com/services/frontdoor/ |
| Cloudflare Workers | https://workers.cloudflare.com/ |
| Fastly Compute@Edge | https://www.fastly.com/products/compute-at-edge |
| Vercel Edge Functions | https://vercel.com/docs/concepts/functions/edge-functions |
| Netlify Edge Handlers | https://docs.netlify.com/functions/edge-handlers/ |
| Istio Service Mesh | https://istio.io/ |
| OpenLiteSpeed | https://openlitespeed.org/ |

---

**以上が、Web サーバ（HTTP / Reverse‑Proxy / アプリケーションサーバ）に関する網羅的まとめです。**  
実際のシステム設計では「トラフィック量」「運用体制」「言語スタック」「セキュリティ要件」の３つを軸に、上記表から最適な組み合わせを選択してください。  

質問や特定のユースケース（例：WebSocket を大量に扱うリアルタイムチャット、金融系低遅延 API など）について掘り下げが必要であれば遠慮なくどうぞ！