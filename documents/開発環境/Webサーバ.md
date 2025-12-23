# Web アプリを「運用」するために必要な **Web サーバ**（網羅）

| サーバ名 | 主な特徴・用途 | メリット (主) | デメリット (主) |
|----------|---------------|--------------|-----------------|
| **Nginx** | 高速で低リソース、リバースプロキシ＆ロードバランサーとしても使用可能 | ・非同期イベント駆動で高スループット<br>・設定ファイルが単純かつ柔軟<br>・大量の同時接続に強い | ・構文はやや学習コストがある（`try_files`, `proxy_pass` 等） |
| **Apache HTTP Server** | 長年にわたる安定性と拡張性、モジュール体系が豊富 | ・mod_rewrite, mod_ssl など多彩な機能<br>・マルチプラットフォームでのサポート実績 | ・プロセスベース（WSGI/CGI）ではリソース消費が大きい |
| **Caddy** | 自動 HTTPS (Let's Encrypt) が標準、Go でビルドされた軽量サーバ | ・設定が非常にシンプル（`caddyfile`）<br>・自動 TLS 更新と HTTP/2 / QUIC をデフォルト搭載 | ・エコシステムは Nginx より小さい |
| **Envoy** | 高機能サービスメッシュ／プロキシ、マイクロサービス向け | ・HTTP/3, gRPC, トレーシング（OpenTelemetry）に最適<br>・動的設定でクラウドネイティブ環境へ統合容易 | ・設定が複雑（YAML で多層構造） |
| **Traefik** | コンテナ/サービス発見に強いリバースプロキシ／ロードバランサー | ・Docker/Kubernetes と自動連携<br>・Let's Encrypt 自動 TLS、ダイナミック設定 | ・機能が多すぎて初期設定が煩雑になることも |
| **HAProxy** | TCP/HTTP の高可用性負荷分散器 | ・低レイテンシでスケールアウトに最適<br>・ヘルスチェックとロードバランシングを高度にカスタマイズ可能 | ・設定ファイルが長くなることがある |
| **Lighttpd** | 軽量でリソース消費が極めて小さい | ・高速で低メモリ占有<br>・静的コンテンツ配信に最適 | ・拡張性（mod）に制限がある |
| **IIS** (Windows) | Microsoft の Web サーバ、ASP.NET と統合 | ・Windows 環境と親和性高い<br>・GUI での管理が可能 | ・Linux 系では利用不可<br>・設定ファイル（web.config）が冗長 |
| **Go net/http** | Go 標準ライブラリに組み込まれた HTTP サーバ | ・簡単なコードで即稼働、デフォルトで TLS/HTTP2 対応 | ・機能拡張には自前実装が必要 |
| **Node.js built‑in server** (http, https) | シンプルな API でサーバを構築可能 | ・JavaScript だけでフロント・バック両方開発できる<br>・非同期 I/O の恩恵 | ・スケールアウトのためにクラスタリングが必要 |
| **Deno serve** | Deno 標準サーバ、TypeScript サポート内蔵 | ・安全な実行環境と簡易構成<br>・モジュールは URL で直接インポート可 | ・エコシステムは Node.js より小さい |
| **Tomcat / Jetty** (Java) | Java EE/WebSocket 実装が充実 | ・Java アプリケーションに統合しやすい<br>・プラグイン（JMX, JNDI）で拡張可能 | ・メモリ使用量が大きい場合がある |
| **NGINX Amplify / Apache ZooKeeper** | 監視ツールとして Web サーバのヘルスチェックや統計を取得 | ・リアルタイムに性能を把握、アラート設定が可能 | ・追加インストールが必要 |

> **選択肢まとめ**  
> - **高パフォーマンス＋簡易構成**: Nginx + Caddy（自動 TLS）  
> - **マイクロサービスやクラウドネイティブ**: Envoy / Traefik (Docker/K8s 連携)  
> - **Windows 環境**: IIS （既存 ASP.NET アプリに最適）  
> - **Go/Node の軽量サーバ**: net/http, Deno serve（小規模・開発用）  

---

# Web サーバ関連の **ツール／モジュール** を網羅した表

| カテゴリ | ツール名 | 主な役割 | メリット (主) | デメリット (主) |
|----------|---------|-----------|--------------|-----------------|
| **TLS / 自動証明書取得** | Let’s Encrypt + Certbot, Caddy 内蔵、Traefik の ACME | HTTPS 証明書の自動発行・更新 | ・無料で自動化しやすい<br>・HTTP‑01/ DNS‑01 認証対応 | ・DNS アクセスが必要（DNS-01 でなくても可） |
| **ロードバランサー／プロキシ** | Nginx, HAProxy, Envoy, Traefik, Caddy | トラフィック分散、リクエストルーティング | ・高パフォーマンス<br>・多機能（ヘルスチェック、TLS） | ・設定がやや複雑な場合も |
| **CDN / エッジ** | Cloudflare Workers, Fastly, Amazon CloudFront | 静的/動的コンテンツの高速配信 | ・低レイテンシ<br>・トラフィックを分散して負荷軽減 | ・価格が変動しやすい |
| **モニタリング** | Prometheus node_exporter, Grafana, Datadog Agent, New Relic | サーバのメトリクス収集と可視化 | ・リアルタイムでパフォーマンス把握<br>・アラート設定が可能 | ・導入コストや学習曲線 |
| **ログ管理** | Loki / Grafana, ELK Stack (Elasticsearch+Logstash+Kibana), Fluentd | ログ収集・検索・可視化 | ・大規模データの高速検索<br>・多様な入力ソース対応 | ・構築が複雑、ストレージコスト |
| **設定管理／自動化** | Ansible, Chef, Puppet, Terraform (infrastructure as code) | サーバ構成をコードで管理し、再現性あるデプロイ | ・環境差異を排除<br>・CI 連携が容易 | ・学習コストと運用の複雑さ |
| **パフォーマンス最適化** | Varnish Cache, Squid, Redis (reverse cache), FastCGI | キャッシュ、負荷低減 | ・レスポンスタイムを大幅に短縮<br>・スケールアウトが容易 | ・キャッシュ不整合のリスク |
| **セキュリティ** | ModSecurity (Apache/Nginx), Fail2Ban, Rate‑Limit modules | WAF、IP ブロック、レート制限 | ・攻撃から保護<br>・ルールを簡単に追加可 | ・設定ミスで正規トラフィックがブロック |
| **API 管理** | Kong, API Umbrella, Tyk | API の認証・レートリミット、ドキュメント化 | ・統一的な API 管理<br>・プラグインで機能拡張 | ・オーバーヘッドが増えることも |
| **ロードテスト** | k6, locust, Artillery, Apache JMeter | 実際のリクエストを模擬して負荷試験 | ・高速に大量リクエスト生成<br>・スクリプトでテスト再利用可 | - |

### 選択肢まとめ
| 目的 | 推奨ツール |
|------|-----------|
| **HTTPS 自動化** | Caddy（組み込み） / Traefik (ACME) / Certbot + Nginx |
| **リバースプロキシ＋ロードバランサ** | Nginx + HAProxy（単体）、Envoy/Traefik（クラウドネイティブ） |
| **モニタリング・可視化** | Prometheus + Grafana、Datadog、New Relic |
| **ログ収集** | Loki (Grafana) が軽量、ELK Stack が検索性能高い |
| **インフラ IaC** | Terraform + Ansible（構成管理） |

これらのテーブルをベースに、プロジェクト規模・要件・運用体制に合わせて最適な Web サーバとサポートツール群を選定していただければと思います。