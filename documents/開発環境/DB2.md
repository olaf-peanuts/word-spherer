# 📚 データベース（DB）技術を **網羅的にまとめた一覧**  
（2024‑12 時点で実務・プロダクション環境で広く採用されている製品／サービスを対象）

> 本稿は「**データストレージの種類**」→「**代表的な製品**」→「**メリット / デメリット / 主な利用シーン**」という構成で、  
> さらに **スケーラビリティ・整合性モデル・ライセンス形態・ベンチマーク指標** を併記しています。  
> 最後に選定チェックリストと比較チャートを掲載します。

---

## 1️⃣ データベースの大分類

| カテゴリ | 主な代表製品例（OSS／商用） |
|----------|----------------------------|
| **RDBMS（リレーショナル DB）** | PostgreSQL、MySQL / MariaDB、Oracle Database、Microsoft SQL Server、SQLite、Amazon Aurora (Postgres/MySQL 互換)、Google Cloud Spanner、CockroachDB、YugabyteDB、TiDB |
| **NewSQL（水平スケール + ACID）** | CockroachDB、YugabyteDB、TiDB、SingleStore（旧 MemSQL）、FaunaDB、Materialize、Google Cloud Spanner |
| **ドキュメント指向 NoSQL** | MongoDB、Couchbase、Amazon DocumentDB、Azure Cosmos DB (Mongo API) |
| **キー・バリュー型** | Redis、Memcached、Amazon DynamoDB、Aerospike、Scylla‑KV、FoundationDB（Key‑Value 層） |
| **カラム指向 / ワイドカラム** | Apache Cassandra、ScyllaDB、Apache HBase、ClickHouse、Google Bigtable |
| **グラフ DB** | Neo4j、JanusGraph、Amazon Neptune、Dgraph、TigerGraph |
| **全文検索 / 分散分析エンジン** | Elasticsearch、OpenSearch、Apache Solr、Meilisearch |
| **時系列 DB** | InfluxDB、TimescaleDB (PostgreSQL 拡張)、Prometheus TSDB、VictoriaMetrics、QuestDB |
| **マルチモデル DB** | ArangoDB（ドキュメント＋グラフ）、OrientDB、Azure Cosmos DB（API 複数） |
| **組み込み・ローカルストレージ** | SQLite、RocksDB、LevelDB、LMDB、Berkeley DB |
| **データウェアハウス / 大規模分析基盤** | Snowflake、Amazon Redshift、Google BigQuery、Azure Synapse, ClickHouse (OLAP), Apache Druid, Presto/Trino |
| **マネージドクラウドサービス（DBaaS）** | Amazon RDS/Aurora、Google Cloud SQL / Spanner、Azure Database for PostgreSQL/MySQL/SQL、MongoDB Atlas、Cassandra‑as‑a‑Service (DataStax Astra) |

---

## 2️⃣ 各カテゴリ別 代表製品と **メリット／デメリット**（テーブル形式）

> ※「スケーラビリティ」欄は **垂直スケール(V)**、**水平シャーディング(H)**、**マルチリージョン(MR)** の有無を示す。  
> 「CAP」 は **C**onsistency（強い／最終的）、**A**vailability、**P**artition tolerance を簡易記号で表記。

### 2‑1️⃣ Relational DBMS (SQL)

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴・拡張機能 | **メリット** | **デメリット** | 主な利用シーン |
|------|----------------------|-----------------|-----|-------------------|------------|--------------|---------------|
| **PostgreSQL** | PostgreSQL License (BSD系) – OSS / 各クラウドでマネージド (RDS, Cloud SQL) | V + H（logical replication, pglogical, BDR） | C‑A‑P | - 高度な ACID、MVCC<br>- JSONB、PostGIS、全文検索 (GIN)、パーティショニング<br>- 拡張性が高く PL/pgSQL / PL/Python など多言語サポート | - 完全な SQL 準拠、豊富な機能・エコシステム<br>- 大規模 OLTP と OLAP のハイブリッドに強い | - 大規模データベースでの運用経験が必要<br>- デフォルト設定はパフォーマンス最適化が不十分になることも | Web アプリケーション、GIS・ロジック集約システム、マイクロサービス間のトランザクション |
| **MySQL 8.0** / **MariaDB 10.11** | GPL（MySQL）/ LGPL（MariaDB） – OSS + 商用 (Oracle MySQL Enterprise) | V + H（Group Replication, Galera、XtraDB Cluster） | C‑A‑P | - InnoDB のトランザクション<br>- Window Functions・CTE（MySQL 8）<br>- JSON カラム、GIS 拡張 | - デプロイが簡単、広範なホスティングサポート<br>- 大規模コミュニティとツール (phpMyAdmin, MySQL Workbench) | - ACID が PostgreSQL に比べやや劣る（デフォルトの isolation level）<br>- 複雑なクエリ最適化が苦手 | LAMP / WordPress 系、E‑コマース、レガシーアプリ |
| **Oracle Database 21c** | 商用 (Enterprise) + Free Tier (Express Edition) | V + H（Real Application Clusters, Sharding） | C‑A‑P | - パーティショニング・インデックスオプティマイザが最先端<br>- PL/SQL、Advanced Queuing、Data Guard | - 大規模トランザクションとミッションクリティカルに実績あり<br>- 高可用性機能が豊富 | - ライセンス費用が高額<br>- ベンダーロックインのリスク | 金融・保険システム、ERP、官公庁基幹 |
| **Microsoft SQL Server 2022** | 商用 (Standard/Enterprise) + Developer / Express 無料版 | V + H（Always On Availability Groups, Distributed Replay） | C‑A‑P | - T‑SQL、Columnstore Index、Graph Extensions<br>- Azure Synapse と統合しやすい | - Windows エコシステムと深く統合、BI ツールが充実 (Power BI) | - Linux 版は機能差がある場合あり<br>- ライセンス費用が高め | 大企業の業務系アプリ、データウェアハウス |
| **SQLite** | Public Domain – OSS（組み込み） | V only (単一ファイル) | C‑A‑P (ローカル) | - ファイルベース、トランザクションは ACID<br>- Zero‑configuration、軽量 | - 埋め込みデバイス・モバイルに最適<br>- デプロイ不要 | - 同時書き込みはシングルライタでボトルネック<br>- スケールアウト不可 | モバイルアプリ、IoT、テスト/開発用 DB |
| **Amazon Aurora (PostgreSQL/MySQL 互換)** | 商用（AWS） | V + H (6‑Way replication, Auto‑Scaling) | C‑A‑P | - RDS のフルマネージド＋高速化エンジン<br>- クロスリージョンリーダー、バックトラック機能 | - 高可用性・自動フェイルオーバー、サーバーレス v2 が利用可能 | - ベンダーロックイン（AWS）<br>- 互換レイヤの微妙な差異に注意 | 大規模 SaaS、Web アプリのバックエンド |
| **Google Cloud Spanner** | 商用 (GCP) | V + H + MR (TrueTime, 2‑phase commit) | C‑A‑P (Strong Consistency) | - 分散 RDBMS、水平スケールで ACID<br>- SQL (ANSI 2011)、外部ローカル・インデックス | - グローバルに一貫したトランザクションが可能<br>- 自動シャーディング & フェイルオーバー | - 高コスト、レイテンシは地域間で数 ms 程度<br>- プロプライエタリな API | 金融取引、グローバルゲームバックエンド |
| **CockroachDB** | OSS (Apache 2) + Enterprise | H + MR（Geo‑partitioned replication） | C‑A‑P (Strong Consistency) | - PostgreSQL wire protocol互換<br>- スキーマ変更がオンラインで可能 | - 真の水平スケールと自動リバランシング<br>- 強い ACID が保証される | - 書き込みレイテンシは 5–10 ms 程度（ネットワーク依存）<br>- エコシステムは PostgreSQL に比べ小さい | マイクロサービス、マルチリージョン SaaS |
| **YugabyteDB** | OSS (Apache 2) + Enterprise | H + MR（Geo‑distributed） | C‑A‑P (Strong Consistency) | - PostgreSQL API と Cassandra API の二重提供<br>- HTAP (Hybrid Transactional/Analytical Processing) | - 同一クラスターで OLTP + OLAP が可能<br>- Kubernetes Operator が成熟 | - 運用がやや複雑（クラスタ設定、パーティショニング）<br>- メモリ消費は高め | 大規模マイクロサービス、リアルタイム分析 |
| **TiDB** | OSS (Apache 2) + Cloud (PingCAP) | H + MR（分散トランザクション） | C‑A‑P (Strong Consistency) | - MySQL ワイヤープロトコル互換<br>- 分散 SQL エンジン、OLAP のための列指向ストレージ (TiFlash) | - スケールアウトがシームレス、MySQL 互換で導入しやすい | - 書き込み遅延は 10 ms+（ネットワーク）<br>- クエリプランナーは PostgreSQL に劣ることあり | 金融・ゲームのトラフィックが激しい OLTP + BI |
| **SingleStore (旧 MemSQL)** | 商用（オンプレ/クラウド） | H + MR（分散インメモリ） | C‑A‑P (Strong Consistency) | - インメモリ＋ディスクハイブリッド、リアルタイム分析向け | - 超高速 OLAP クエリ、INSERT が高速 | - ライセンス費用が高い<br>- メモリ要件が大きくなる | リアルタイムダッシュボード、IoT データ集約 |

---

### 2‑2️⃣ Document‑Oriented NoSQL

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **MongoDB** (Community/Enterprise) | SSPL (Community) / 商用 (Atlas) | H + MR（シャーディング、レプリカセット） | A‑P‑C (最終的整合性, 読み取りは強い) | - BSON ドキュメント、柔軟なスキーマ<br>- Aggregation Pipeline、Change Streams | - 開発速度が速く、JSON ライクで扱いやすい<br>- Atlas のマネージドが充実 | - トランザクションは 4‑document まで (v4.0) しか保証されない <br>- 大規模書き込み時のレイテンシ上昇 | コンテンツ管理、ログ集約、モバイルバックエンド |
| **Couchbase** | Apache 2 (Community) / 商用 | H + MR（Cross‑Datacenter Replication） | A‑P‑C (最終的整合性) | - バイナリ JSON, N1QL (SQL‑like)、Full‑Text Search、Analytics Service | - 高スループットの KV とクエリが同一クラスタで実行可能<br>- エッジ/モバイル向け Sync Gateway | - ライセンスは Enterprise 版が機能豊富でコストがかかる | キャッシュ層＋永続化、リアルタイム分析 |
| **Amazon DocumentDB (MongoDB compatible)** | 商用（AWS） | H + MR（マルチ AZ レプリケーション） | C‑A‑P (Strong Consistency) | - MongoDB API 互換、フルマネージド | - AWS の他サービスとシームレス連携<br>- 自動バックアップ・スナップショット | - 実装は内部で Aurora MySQL エンジンを流用しているためパフォーマンスがMongoDB 本家に劣ることあり | 既存 MongoDB アプリの AWS 移行 |
| **Azure Cosmos DB** (Mongo API, Cassandra API, Gremlin, Table) | 商用（Microsoft） | H + MR（マルチリージョン自動レプリカ） | C‑A‑P (選択可能な整合性レベル) | - 5 つの API、低レイテンシ・グローバル分散 | - 任意の整合性モデルを選べる<br>- 99.999% 可用性 SLA | - コストが高めで課金単位がリクエスト RU に依存 | グローバルスケールアプリ、IoT、ゲーム |
| **FaunaDB** | 商用（Serverless） | H + MR（マルチリージョン） | C‑A‑P (Strong Consistency) | - FQL（関数型クエリ言語）、GraphQL API も提供 | - 完全サーバーレス、スケール自動化<br>- ACID が保証された分散 DB | - プロプライエタリなクエリ言語に学習コスト <br>- 高トラフィック時のレイテンシは数 ms 程度 | サーバレスアプリ、モバイルバックエンド |

---

### 2‑3️⃣ Key‑Value / In‑Memory

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **Redis** (Open‑Source + Enterprise) | BSD 3‑Clause / 商用 (Redis Enterprise) | H + MR（Cluster, Replication） | A‑P‑C (最終的整合性、読み取りは強い) | - インメモリデータストア、永続化オプションあり<br>- データ構造 (String, Hash, List, Set, SortedSet, Stream, HyperLogLog) | - 超高速（サブマイクロ秒）<br>- Pub/Sub と Streams がリアルタイム処理に最適 | - メモリがボトルネックになるとスケールアウトが必要<br>- 永続化は RDB/AOF で妥協点あり | キャッシュ、セッションストア、レートリミッティング |
| **Memcached** | BSD | H (分散クライアント側シャーディング) | A‑P‑C (最終的整合性) | - シンプルなキー/バリューキャッシュ | - 非常に軽量、単一コマンドで高速 | - 永続化なし、データ構造が単純<br>- 複数クライアントのハッシュ衝突管理が必要 | Web コンテンツキャッシュ、計算結果キャッシュ |
| **Amazon DynamoDB** | 商用 (AWS) | H + MR（自動パーティション） | A‑P‑C (最終的整合性／強い整合性選択可) | - フルマネージド NoSQL KV、スキーマレス<br>- Auto Scaling, Global Tables | - サーバーレスで運用コストが予測しやすい<br>- 1 ミリ秒以下のレイテンシ保証 (プロビジョンド) | - クエリはプライマリキー・インデックスに限定<br>- コストは読書/書き込み単位で増大 | 大規模モバイルバックエンド、IoT データ収集 |
| **Aerospike** | OSS (Apache 2) + Enterprise | H + MR（Strong Consistency） | C‑A‑P (強い整合性) | - 高速インメモリ＋SSD ハイブリッド<br>- Predictable latency SLA | - ミリ秒以下のレイテンシ、書き込み耐久性が高い | - ライセンスは Enterprise が実務向け<br>- 運用に専任エンジニアが必要 | 広告配信・リアルタイムビッディング |
| **FoundationDB (Key‑Value Layer)** | Apache 2 (OSS) + Commercial (Apple) | H + MR（分散トランザクション） | C‑A‑P (Strong Consistency) | - ACID トランザクションを持つ KV ストア、レイヤーで RDBMS / Document DB が構築可能 | - 低レイテンシかつ強い整合性<br>- プラグインで様々なデータモデルに拡張可 | - 商用版は Apple のサポートのみ（OSS は更新が止まっている） | 金融取引、分散トランザクションが必須のシステム |

---

### 2‑4️⃣ カラム指向 / ワイドカラム

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **Apache Cassandra** | Apache 2 – OSS / DataStax Enterprise | H + MR（マルチDC） | A‑P‑C (最終的整合性、書き込みは強い) | - カラムファミリーモデル、Tunable Consistency<br>- ライトウェイトトランザクションなし | - 無停止スケールアウト、書き込み耐久性が高い | - 読み取りレイテンシはチューニングが必要<br>- 複雑な JOIN が不可 | 時系列データ、ログ集約、IoT |
| **ScyllaDB** | Apache 2 – OSS / Enterprise | H + MR（マルチDC） | A‑P‑C (最終的整合性) | - Cassandra API 互換の C++ 実装、Seastar フレームワーク | - 同等機能で数倍高速、CPU キャッシュフレンドリー | - メモリ消費が多い<br>- 新興ながらサポートは成熟しつつある | 高スループット OLTP、広告・ゲームバックエンド |
| **Apache HBase** | Apache 2 – OSS (Hadoop エコシステム) | H + MR（RegionServer, ZooKeeper） | A‑P‑C (最終的整合性) | - Hadoop 上の列指向 DB、Bigtable API 互換 | - 大規模データ格納とスキャンが得意<br>- Hadoop エコシステムとの統合 | - 運用が複雑（ZK, HDFS）<br>- ライトレイテンシは数 ms 程度 | ビッグデータ分析、ログ・イベントストリーム |
| **Google Cloud Bigtable** | 商用 (GCP) | H + MR（自動パーティション） | A‑P‑C (最終的整合性) | - 完全マネージド、HBase API 互換 | - スケーラビリティが無制限に近い<br>- 超低レイテンシの読み書き | - SQL が使えずクエリはアプリ側で実装必要 | 時系列データ、IoT、ユーザープロファイル |
| **ClickHouse** | Apache 2 – OSS (OLAP) | H + MR（分散テーブル） | C‑A‑P (Strong Consistency) | - カラム指向分析 DB、SQL‑like クエリ<br>- データ圧縮率が高く高速集計 | - ペタバイト規模でも秒単位のクエリが可能 | - 書き込みはバッチ／ストリーム向けで OLTP に不向き | ログ分析、BI、リアルタイムダッシュボード |

---

### 2‑5️⃣ グラフデータベース

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **Neo4j** (Community/Enterprise) | GPLv3 (Community) / 商用 (Enterprise) | V + H（Causal Clustering） | C‑A‑P (Strong Consistency) | - Property Graph、Cypher クエリ言語<br>- ACID トランザクション | - グラフアルゴリズムが豊富、開発者向けツールが充実 | - 水平スケールは Enterprise のみ（Causal Clustering）<br>- 大規模クラスタ構築は複雑 | ソーシャルネットワーク、レコメンデーション、詐欺検知 |
| **Amazon Neptune** | 商用 (AWS) | H + MR（マルチ AZ） | C‑A‑P (Strong Consistency) | - Gremlin (TinkerPop) と SPARQL の二重 API<br>- フルマネージド | - AWS 連携がシームレス、スケール自動化 | - プロプライエタリ、クエリ言語習得が必要 | Knowledge Graph、リンクデータ |
| **JanusGraph** (Apache) | Apache 2 – OSS | H + MR（Cassandra/Scylla/HBase バックエンド） | A‑P‑C (最終的整合性) | - Gremlin ベース、プラグインでバックエンド選択可 | - オープンソースかつ柔軟にストレージを切替可能 | - パフォーマンスはバックエンド依存<br>- メンテナンスがやや手間 | 大規模知識ベース、IoT デバイス関係 |
| **Dgraph** (Open‑Source / Cloud) | Apache 2 – OSS + 商用 Dgraph Cloud | H + MR（シャーディング） | C‑A‑P (Strong Consistency) | - GraphQL+​GraphQL+-Native、RDF もサポート | - 高速なグラフクエリとトランザクション<br>- スキーマレスでも ACID が保証される | - エコシステムは Neo4j に比べ小さい | ソーシャル・リアルタイムレコメンド |
| **TigerGraph** (Enterprise) | 商用（Free Community Edition） | H + MR（分散クラスタ） | C‑A‑P (Strong Consistency) | - GSQL 独自クエリ言語、深いパス探索が高速 | - 大規模グラフ分析に最適化<br>- 直感的なビジュアルツール | - 商用版のコストが高い<br>- 学習曲線が急 | Fraud detection, Network security, Bio‑informatics |

---

### 2‑6️⃣ フルテキスト検索・分散分析エンジン

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **Elasticsearch** (7.x/8.x) | Elastic License（OSS 版は Apache 2） / SaaS (Elastic Cloud) | H + MR（クロス‑クラスタレプリケーション） | A‑P‑C (最終的整合性) | - JSON ドキュメントインデックス、Lucene ベース<br>- Kibana ダッシュボード | - 強力な全文検索・集計、リアルタイム分析が可能 | - クラスタ管理が難しい（シャーディング、ヒープ）<br>- ライセンス変更で商用利用に注意必要 | ログ解析、E‑コマース検索、モニタリング |
| **OpenSearch** (Amazon) | Apache 2 – OSS | H + MR（Cognito/Auto-Tune） | A‑P‑C | - Elasticsearch 7.10 のフォーク、Kibana → OpenSearch Dashboards | - 完全 OSS、AWS と統合しやすい | - エコシステムは Elastic に比べ小さい | 同上 (OSS 重視) |
| **Apache Solr** | Apache 2 – OSS | H + MR（SolrCloud） | A‑P‑C | - Lucene ベース、強力な faceting・スキーマ管理 | - 長年の実績、Java エコシステムと親和性高い | - UI がやや古く、設定が複雑 | 大規模エンタープライズ検索 |
| **Meilisearch** | MIT – OSS | V (単一ノード) + H（水平スケールは有償） | C‑A‑P (Strong Consistency) | - 超高速インデックス、Typo tolerance, Ranking rules が自動 | - シンプルな API と設定で開発が速い | - 大規模データ向けの分散は未成熟 | 小〜中規模 SaaS の検索機能 |

---

### 2‑7️⃣ 時系列データベース（TSDB）

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **InfluxDB 2.x** | MIT (OSS) / Enterprise | H + MR（Enterprise） | A‑P‑C (最終的整合性) | - 時系列クエリ言語 Flux、SQL‑like | - 高速書き込み、Retention Policy が簡単 | - Enterprise 機能は有償<br>- クラスタ構築はやや手間 | IoT センサーデータ、モニタリング |
| **TimescaleDB** (PostgreSQL 拡張) | Apache 2 – OSS / Enterprise | V + H（マルチノード） | C‑A‑P (Strong Consistency) | - PostgreSQL の ACID と SQL に時系列拡張<br>- Hypertable、Continuous Aggregates | - 既存 PostgreSQL エコシステム活用可能<br>- 複雑なクエリが標準 SQL で記述できる | - 大規模クラスタは Enterprise が必要 | 時系列分析 + OLAP 統合 |
| **Prometheus** (TSDB) | Apache 2 – OSS | V only（単一サーバ） | C‑A‑P (Strong Consistency) | - Pull 型モニタリング、PromQL | - 高度なアラート・可視化が標準<br>- エコシステムが豊富 | - 長期保存は外部ストレージが必要（Thanos, Cortex） | サービス監視、Kubernetes メトリクス |
| **VictoriaMetrics** | Apache 2 – OSS | H + MR（Cluster version) | A‑P‑C (最終的整合性) | - 高圧縮・高速書き込み、Prometheus 互換 | - スケールアウトがシンプル<br>- コストパフォーマンスが高い | - UI が限定的 | 大規模メトリクス収集 |
| **QuestDB** | Apache 2 – OSS | V + H（Cluster) | C‑A‑P (Strong Consistency) | - SQL ベース、nanosecond 時間精度、JIT コンパイル | - RDBMS と同様の SQL が使える<br>- 超高速書き込み | - エコシステムはまだ小さい | 金融市場データ、リアルタイム分析 |

---

### 2‑8️⃣ データウェアハウス・ビッグデータ基盤

| 製品 | ライセンス / 提供形態 | スケーラビリティ | CAP | 主な特徴 | **メリット** | **デメリット** | 主な利用シーン |
|------|---------------------|-----------------|-----|----------|------------|--------------|---------------|
| **Snowflake** | 商用 (SaaS) | H + MR（マルチクラウド） | C‑A‑P (Strong Consistency) | - 完全マネージド、データ共有が容易<br>- ストレージとコンピュートが分離 | - クエリは自動スケールしコスト最適化可能 | - 従量課金で予測が難しい場合あり | 大規模 BI、データサイエンス |
| **Amazon Redshift** (RA3) | 商用 (AWS) | H + MR（Concurrency Scaling） | C‑A‑P (Strong Consistency) | - PostgreSQL 互換、列指向ストレージ<br>- Spectrum で S3 データ直接クエリ | - 大規模データウェアハウスに最適化されたパフォーマンス | - スキーマ変更がやや重い<br>- ストレージはコールド/ホット分離が必要 | ETL・BI、マーケティング分析 |
| **Google BigQuery** | 商用 (GCP) | H + MR（自動スケール） | C‑A‑P (Strong Consistency) | - サーバーレス、SQL ANSI 2011 準拠<br>- ストレージは Colossus、クエリは Dremel | - ペタバイト規模でも秒単位の分析が可能 | - データロードは GCS に依存、料金はスキャン量ベース | 大規模データ分析、機械学習パイプライン |
| **ClickHouse** (self‑hosted) | Apache 2 – OSS / Cloud (Altinity) | H + MR（Shard/Replica） | C‑A‑P (Strong Consistency) | - カラム指向 OLAP、SQL‑like クエリ<br>- 高圧縮・高速集計 | - オンプレでもクラウドでも同一コードで運用可能 | - 書き込みはバッチ向け、リアルタイム OLTP には不向き | ログ分析、広告レポート |
| **Apache Druid** | Apache 2 – OSS | H + MR（Segment Replication） | A‑P‑C (最終的整合性) | - カラム指向、インデックス化されたタイムウィンドウ集計<br>- Real‑time ingestion と OLAP が同居 | - 高速なスライス・ダイス分析が可能 | - データ更新は難しい（Append‑only） | ビジネスインテリジェンス、クリックストリーム解析 |
| **Presto / Trino** (クエリエンジン) | Apache 2 – OSS | H + MR（Coordinator+Workers） | C‑A‑P (Strong Consistency) | - 複数データソースに対して単一 SQL クエリが可能 | - データレイク上の高速インタラクティブクエリ | - ストレージは外部に依存、書き込みはサポート外 | データレイク分析、BI フロントエンド |

---

## 4️⃣ **ベンチマーク指標（参考）**

| カテゴリ | 代表的ベンチマーク | 主な測定項目 | 典型的スコア例* |
|----------|-------------------|--------------|----------------|
| RDBMS (OLTP) | TPC‑C, TPC‑E | トランザクション/秒、レイテンシ | PostgreSQL 10 k TPS (on‑prem), Aurora PostgreSQL 30 k TPS (AWS) |
| NewSQL | YCSB‑A (read‑only), YCSB‑B (update heavy) | 1 M+ ops/s (CockroachDB on 8 nodes) |
| Document DB | YCSB‑C (MongoDB workload) | 200 k reads/sec, 150 k writes/sec (MongoDB Atlas M30) |
| KV / In‑Memory | redis-benchmark, memtier_benchmark | 1 M+ GET/SET ops/s (Redis Enterprise on 4‑node) |
| Wide Column | YCSB‑D (Cassandra) | 500 k writes/sec (Cassandra 10 nodes) |
| Graph DB | LDBC SNB (Social Network Benchmark) | 50 k traversals/sec (Neo4j Enterprise 8 cores) |
| TSDB | InfluxDB benchmark (line protocol) | 2‑3 M points/s (single node) |
| Search / OLAP | Rally (Elasticsearch) | 200 k docs/sec indexing, 10 k queries/sec |  

\*数値は **ベンチマーク環境（CPU、ネットワーク）** に大きく依存します。実際の導入時は **プロトタイプで測定** が必須です。

---

## 5️⃣ 選定チェックリスト

| 判定項目 | 質問例 | 推奨製品（上位 2〜3） |
|----------|--------|-----------------------|
| **データ整合性はどのレベルが必要か** | 強い ACID が必須か、最終的整合性で良いか | Strong Consistency → PostgreSQL, CockroachDB, TiDB, DynamoDB (Strong) <br>Eventual → Cassandra, MongoDB, DynamoDB (Eventually) |
| **スケールアウトの形態** | 水平シャーディングが必要か、垂直スケーリングで足りるか | Horizontal → CockroachDB, YugabyteDB, ScyllaDB, DynamoDB <br>Vertical → PostgreSQL, MySQL (scale‑up) |
| **トランザクション量 / 書き込みレート** | 1 秒あたり何件の書き込みが想定か | >100 k TPS → Aurora, CockroachDB, SingleStore <br> <10 k TPS → PostgreSQL, MySQL |
| **データ構造の柔軟性** | スキーマは固定か、スキーマレスで良いか | 固定スキーマ → RDBMS (Postgres/MySQL) <br>スキーマレス → MongoDB, DynamoDB, Couchbase |
| **リアルタイム分析・検索** | フルテキスト検索や集計が必要か | Elasticsearch / OpenSearch (全文検索) <br>ClickHouse / Druid (OLAP) |
| **時系列データ** | データは時間順に大量投入されるか | InfluxDB, TimescaleDB, Prometheus |
| **マルチリージョン・グローバル展開** | 複数地域で同一 DB を使う必要があるか | Cloud Spanner、CockroachDB、YugabyteDB、Cosmos DB |
| **運用コスト / マネージド vs 自己管理** | 運用リソースはどれだけ確保できるか | フルマネージド → RDS/Aurora, Azure Database, DynamoDB, Cloud Spanner <br>自己管理 → PostgreSQL, MySQL, Cassandra |
| **既存エコシステム・ツール** | 使いたい BI / ETL ツールは何か | Snowflake/Redshift/BigQuery は標準コネクタが豊富<br>PostgreSQL はほぼ全ツール対応 |
| **予算** | 初期投資とランニングコストの上限は？ | OSS (Postgres, MySQL, Cassandra) → 初期費用低い <br>商用/マネージド (Aurora, Spanner, Snowflake) → 高額だが運用負荷削減 |

---

## 6️⃣ **まとめチャート**（横軸：スケール、縦軸：整合性）

```
   Strong Consistency
          ▲
          │        CockroachDB ── TiDB ── SingleStore
          │    PostgreSQL/MySQL (scale‑up) ── Aurora
          │                 └── Cloud Spanner (global)
          │
          │  DynamoDB (Strong)   └─ FaunaDB
          │
   Eventual Consistency
          ▼
          ─────────────────────────────► Horizontal Scale
                MongoDB ── Cassandra ── ScyllaDB ── Bigtable
                Redis (Cluster) ── DynamoDB (Eventual)
```

- **左上**（強い整合性 + 垂直スケール）→ トランザクション重視の業務系システム。  
- **右上**（強い整合性 + 水平スケール）→ グローバルに分散したマイクロサービスや金融系。  
- **左下**（最終的整合性 + 垂直）→ 小規模データセットで高速検索が必要なアプリ。  
- **右下**（最終的整合性 + 水平）→ 大量 IoT・ログ・時系列データのストリーム処理。

---

## 7️⃣ 参考リンク

| カテゴリ | URL |
|----------|-----|
| PostgreSQL Official | https://www.postgresql.org/ |
| MySQL / MariaDB Docs | https://dev.mysql.com/, https://mariadb.org/ |
| CockroachDB Docs | https://www.cockroachlabs.com/docs/ |
| YugabyteDB Docs | https://docs.yugabyte.com/ |
| TiDB Documentation | https://docs.pingcap.com/tidb/stable |
| MongoDB Atlas / Community | https://www.mongodb.com/ |
| Cassandra / ScyllaDB | https://cassandra.apache.org/, https://www.scylladb.com/ |
| Redis Official | https://redis.io/ |
| DynamoDB Developer Guide | https://docs.aws.amazon.com/dynamodb/ |
| Elasticsearch / OpenSearch | https://www.elastic.co/, https://opensearch.org/ |
| ClickHouse Docs | https://clickhouse.com/docs/en/ |
| TimescaleDB | https://timescale.com/ |
| InfluxDB | https://influxdata.com/ |
| Snowflake | https://www.snowflake.com/ |
| Google BigQuery | https://cloud.google.com/bigquery |
| Amazon Redshift | https://aws.amazon.com/redshift/ |
| Azure Synapse / Cosmos DB | https://azure.microsoft.com/services/synapse-analytics/, https://azure.microsoft.com/services/cosmos-db/ |
| TPC Benchmarks | http://www.tpc.org/ |

---

### 🎯 ひとことまとめ

> **「どの DB を選ぶかは、**  
> **① 整合性（Strong vs Eventual）**、**② スケール方法（垂直 vs 水平・マルチリージョン）**、**③ データ構造の柔軟さ**、**④ 運用コストとツールチェーン**** の４つを軸に評価すべきです。  
> これらを踏まえて上記テーブルから「最適な組み合わせ」を選び、**PoC → ベンチマーク → 本番導入** の流れで検証してください。

質問や特定ユースケース（例：金融系トランザクション、IoT 時系列、リアルタイム検索）に絞った比較が必要な場合は遠慮なくどうぞ！