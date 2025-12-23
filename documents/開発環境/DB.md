# Web アプリを運用するために必要な **データベース**

| DB 名 | 種類 | 主な特徴・用途 | メリット (主) | デメリット (主) |
|-------|------|---------------|--------------|-----------------|
| **PostgreSQL** | RDBMS | 標準 SQL + JSONB、拡張性高い | ・ACID しっかり<br>・豊富なインデックス（GIN, BRIN）<br>・オープンソースで高機能 | ・設定がやや複雑<br>・大量の同時接続ではパフォーマンスに限界 |
| **MySQL / MariaDB** | RDBMS | 世界中に広く使われている、レプリケーション容易 | ・高速な読み取り<br>・コミュニティ版が安定している<br>・多種のストレージエンジン（InnoDB, MyISAM） | ・一部機能は商用版でのみ |  
| **SQLite** | ファイルベース RDBMS | 軽量、単一ファイルで持ち運び可能 | ・設定不要<br>・組み込みアプリに最適 | ・同時書き込みが制限される（1 接続） |
| **Oracle Database** | 商用RDBMS | 大規模取引処理に強く、セキュリティ/監査機能充実 | ・高可用性、クラスタリング容易<br>・データガバナンス機能が豊富 | ・ライセンスコストと学習負荷 |
| **Microsoft SQL Server** | 商用RDBMS | Windows と .NET 環境との親和性抜群 | ・SQL Server Management Studio が強力<br>・統合開発環境に最適 | ・Linux 版は機能が制限されることも |
| **CockroachDB** | New‑Gen RDBMS (SQL + ACID) | 分散型で水平スケールが容易 | ・シームレスなシャーディング<br>・自動フェイルオーバー | ・一部 SQL 機能が限定的、学習コスト |
| **Amazon Aurora** | AWS のマネージド RDBMS（PostgreSQL/MySQL 互換） | 高可用性・スケールアウトをクラウドで簡単に | ・自動バックアップ、レプリケーション<br>・高性能（Aurora Serverless） | ・ベンダーロックイン |
| **Google Cloud Spanner** | 分散 RDBMS | グローバルにスケーラブルな ACID DB | ・水平スケールと高可用性を同時に実現<br>・SQL インターフェースがある | ・価格が高い、学習曲線 |
| **Microsoft Azure SQL Database** | マネージド RDBMS | Windows/SQL Server 互換 | ・自動管理（スケール、パッチ）<br>・統合監視 | ・ベンダーロックイン |
| **MongoDB** | NoSQL (Document) | JSON‑like BSON ドキュメントを扱う | ・柔軟なスキーマ<br>・水平スケーリングとシャーディングが簡単 | ・ACID が限定的、結合処理は難しい |
| **Cassandra** | NoSQL (Wide‑Column) | 大量データの書き込みに強い、分散設計 | ・高可用性・スケールアウトが容易<br>・多くのデータセンターを横断可能 | ・クエリ言語が限定的（CQL）<br>・データモデル設計が難しい |
| **Redis** | キー／バリュー ストア（インメモリ） | 高速キャッシュ、Pub/Sub、ジョブキューに適した | ・極めて低レイテンシ<br>・スクリプトや Lua で処理拡張可 | ・永続化はオプションであり、容量制限がある |
| **Memcached** | キー／バリュー ストア（インメモリ） | 単純なキャッシュ用途に最適 | ・シンプル、スケールアウトが容易 | ・データ永続性はない、機能が限定的 |
| **Neo4j** | グラフ DB | 関係性をノード／エッジで管理 | ・複雑なリレーション検索が高速<br>・Cypher クエリ言語が直感的 | ・スキーマ設計とパフォーマンスチューニングが難しい |
| **Elasticsearch** | 検索エンジン／ドキュメント DB | 高速全文検索、集約に強い | ・分散クラスターで水平スケール<br>・複雑な検索が簡単 | ・データ整合性は弱く、トランザクションはサポート外 |
| **TimescaleDB** | 時系列拡張 Postgres | PostgreSQL で時系列データを高速に扱える | ・SQL をそのまま使用<br>・自動パーティショニングと圧縮 | ・PostgreSQL に比べてリソースが多い |
| **InfluxDB** | 時系列専用 NoSQL | 高速書き込み、クエリ言語 Flux | ・時系列データに最適化<br>・軽量なバイナリ | ・ACID はサポートしていない（トランザクション不可） |
| **Couchbase** | ドキュメント + キー／バリュー | クエリは N1QL (SQL 風) | ・柔軟なデータモデル<br>・キャッシュ機能が内蔵 | ・設定と管理がやや複雑 |
| **Amazon DynamoDB** | Key/Value＋Document | マネージドでスケールアウトに強い | ・自動スケーリング、低レイテンシ<br>・サーバレス | ・クエリ機能は限定的、費用が変動しやすい |
| **Amazon Aurora Serverless** | サーバーレス RDBMS（MySQL / PostgreSQL） | トラフィックに応じて自動起動/停止 | ・コスト効率高い<br>・ゼロダウンタイムでスケール | ・起動遅延がある |
| **Google Cloud Firestore** | Document DB (NoSQL) | スケーラブルでリアルタイム更新に最適 | ・オフラインサポート、モバイル連携が容易 | ・複雑なクエリは非対応 |
| **Azure Cosmos DB** | マルチモデル（Document, Key‑Value, Graph） | グローバルに分散・スケールアウトを簡単に | ・低レイテンシ、マルチAPIサポート<br>・自動バックアップ | ・価格が高い、ベンダーロックイン |

---

# データベース関連 **ツール／モジュール** を網羅した表

| カテゴリ | ツール名 | 主な役割 | メリット (主) | デメリット (主) |
|----------|---------|-----------|--------------|-----------------|
| **データ移行 / マイグレーション** | Flyway, Liquibase, Alembic (Python), Prisma Migrate, Rails migrations | スキーマ変更をコード化してバージョン管理 | ・自動ロールバック、複数 DB で共通利用可<br>・CI 連携が容易 | ・SQL を手書きする必要がある場合が多い |
| **ORM / データアクセス** | Prisma (JS/TS), TypeORM, Sequelize, Hibernate (Java), Entity Framework Core (.NET), Gorm (Go), Diesel (Rust), SQLAlchemy (Python) | アプリケーションコードから DB へ抽象化 | ・型安全／スキーマ自動生成が可能<br>・クエリビルダーで可読性向上 | ・ORM はパフォーマンスオーバヘッドがある |
| **接続プール** | pgbouncer, Pgpool‑II (Postgres), HikariCP (Java), c3p0, MySQL Connector/J, Npgsql (C#) | DB 接続を効率的に再利用 | ・スケーリングとリソース最適化<br>・同時接続数を制御可能 | ・設定ミスでデッドロックが発生 |
| **キャッシュ / メモリストア** | Redis, Memcached, Ehcache (Java), Node‑redis, aioredis | データの高速アクセス、セッション管理 | ・低レイテンシ<br>・簡易クエリやジョブキューにも利用可 | ・永続化はオプション、容量に制限 |
| **検索 / 分析** | Elasticsearch (Elasticsearch DSL), Meilisearch, Typesense, Apache Solr | 高速全文検索、複雑な集計 | ・分散クラスターでスケール<br>・柔軟な検索 API | ・データ同期やインデックス作成に手間 |
| **バックアップ / リカバリ** | pg_dump/pg_restore (Postgres), mysqldump, mongodump, barman (Postgres)、Amazon RDS automated snapshots | データを安全に保管・復旧 | ・定期バックアップが自動化可能<br>・クラウドサービスでスナップショット管理容易 | ・大容量データでは時間がかかる、ストレージコスト |
| **モニタリング / アラート** | Prometheus exporters (pgbouncer_exporter, mysqld_exporter), Grafana dashboards, Datadog Agent, New Relic, pg_stat_statements, slow query log | パフォーマンス把握・問題検出 | ・リアルタイムで可視化<br>・アラート設定が容易 | - |
| **スケーリング / シャーディング** | Vitess (MySQL), Citus (Postgres), Shard-DB, MongoDB sharding、Redis Cluster | データを分散して水平スケール | ・大量データを扱える<br>・可用性が高い | ・設定と管理が複雑 |
| **レプリケーション & 高可用性** | pg_rewind / Barman (Postgres), MySQL Replication, MongoDB Replica Set, Redis Sentinel/Cluster、Cassandra nodetool | データの冗長化・フェイルオーバー | ・データ損失を防げる<br>・ロードバランシングが可能 | ・同期遅延や整合性問題 |
| **セキュリティ** | pgcrypto (Postgres), MySQL TLS, MongoDB Atlas Encryption at Rest、HashiCorp Vault | データ暗号化・認証管理 | ・データ漏えいリスク低減<br>・機密情報の安全管理 | ・設定がやや煩雑 |
| **オーケストレーション / IaC** | Terraform (DB リソース), Ansible, CloudFormation | DB 環境をコード化 | ・環境再現性、バージョン管理 | ・リソースプロビジョニングの学習コスト |

### 選択肢まとめ
| 目的 | 推奨ツール |
|------|-----------|
| **スキーママイグレーション** | Flyway / Liquibase（多言語共通） |
| **ORM (型安全)** | Prisma（JavaScript/TypeScript）、Hibernate（Java）、Gorm（Go） |
| **キャッシュ** | Redis（高速、Pub/Sub も可） |
| **検索機能** | Elasticsearch（全文検索＋集計） |
| **バックアップ** | Cloud プロバイダーの自動スナップショット + pg_dump / mysqldump |
| **モニタリング** | Prometheus + Grafana dashboards (db exporter) |
| **水平スケール** | Vitess（MySQL）、Citus（Postgres） |
| **セキュリティ** | Vault + DB 内蔵暗号化機能 |

この表をベースに、プロジェクトのデータモデル・トラフィックパターン・予算・運用体制に合わせて最適な DB と関連ツール群を選定してください。