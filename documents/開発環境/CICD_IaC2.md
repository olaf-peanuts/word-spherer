# 📦 CI/CD と IaC（Infrastructure as Code）を **網羅的にまとめた一覧**  
（2024‑12 時点の実務で主流なツール・サービス、特徴・メリット・デメリット、典型的な利用シーンをまとめました）

> 本稿は「**CI/CD パイプライン**」と「**IaC / 設定管理**」という二つの軸に分けて構成しています。  
> それぞれ **セルフホスト型** と **SaaS／マネージド型**、そして **クラウドベンダー依存** vs **マルチクラウド・オンプレミス対応** の観点で表にまとめ、最後に統合パターンと選定チェックリストを提示します。

---

## 1️⃣ CI/CD（継続的インテグレーション／デリバリー）ツール

| 製品 / サービス | 種別 (SaaS / Self‑host) | 主なプラットフォーム・言語実装 | ライセンス | キー機能 | **メリット** | **デメリット** | 代表的な利用シーン |
|------------------|--------------------------|--------------------------------|------------|-----------|--------------|----------------|-------------------|
| **Jenkins** | Self‑host (Docker, K8s) | Java（プラグインは Groovy/DSL） | MIT | パイプライン as Code (`Jenkinsfile`)、豊富な 1800+ プラグイン、分散ビルド（Master/Agent） | - カスタマイズ自由度最高<br>- 大規模エンタープライズでも実績あり | - UI が古く設定が煩雑<br>- プラグイン互換性の維持コスト | オンプレ／ハイブリッド、レガシー環境、プライベートネットワーク |
| **GitHub Actions** | SaaS (GitHub) + Self‑host Runner | Go/Node.js | MIT | ワークフローは YAML、マトリックスビルド、GitHub Packages 連携、Marketplace の Action が豊富 | - GitHub とシームレスに統合<br>- 無料枠が広く CI 時間が充実（Public Repo） | - 大規模パラレル実行は有償プランが必要<br>- カスタムエージェントの管理が別途必要 | OSS プロジェクト、GitHub‑first 企業 |
| **GitLab CI/CD** | SaaS (GitLab.com) + Self‑host (Omnibus) | Ruby on Rails, Go | MIT (Community) / Proprietary (Enterprise) | `.gitlab-ci.yml`、Auto DevOps、マルチプラットフォーム Runner（Docker/VM/K8s） | - 完全な DevSecOps パイプラインが標準装備<br>- 1 つの UI で SCM・CI・CD が完結 | - Self‑host の場合はアップデートとスケール管理が必要 | エンドツーエンドの開発フローを一元化したい企業 |
| **CircleCI** | SaaS + 自己ホスト (Runner) | Go, Python | Proprietary (Free tierあり) | ワークフローベース、Docker layer caching、Orbs（再利用可能モジュール） | - 高速なキャッシュ戦略とパラレル実行<br>- 設定が比較的シンプル | - 自己ホスト版は有償・設定が必要<br>- 柔軟性は Jenkins に劣る | スタートアップ・高速デプロイが求められる SaaS |
| **Azure Pipelines** (Azure DevOps) | SaaS + Self‑host Agent | .NET / Node.js / Go | Proprietary (Free tier 1800 min/month) | YAML pipelines、マルチプラットフォーム、Microsoft Marketplace のタスク | - Azure と統合しやすく、AKS・App Service へのデプロイが簡単 | - UI が他ツールに比べ重い<br>- 大規模パラレルは有償 | Microsoft エコシステム中心の企業 |
| **AWS CodePipeline / CodeBuild** | SaaS (Fully managed) | Java, Go, Python (CodeBuild) | Proprietary | ビジュアルなステージング、統合的に CodeCommit/Bitbucket/GitHub と連携、ECR・Lambda デプロイ | - AWS の他サービス（CloudFormation, ECS, Lambda）とシームレス | - パイプラインのロジックが GUI 中心でコード化しにくい<br>- カスタムステップは Lambda 必要 | 完全マネージドでインフラ構築も同一ベンダー |
| **Google Cloud Build** | SaaS (Fully managed) | Go, Python | Proprietary | `cloudbuild.yaml`、Docker イメージ自動ビルド、Cloud Deploy 連携 | - GCP の Artifact Registry・Kubernetes と統合が簡単 | - 複雑なワークフローは Cloud Build Triggers + Cloud Functions が必要 | GCP 上のマイクロサービス CI |
| **Bitbucket Pipelines** | SaaS (Atlassian) | Docker / Node.js | Proprietary (Free tier 500 min/month) | YAML, 自動キャッシュ、Docker イメージビルド | - Bitbucket と統合、UI がシンプル | - 大規模パラレルは有償<br>- プラグインエコシステムが小さい | 小〜中規模チーム、Atlassian スタック |
| **TeamCity** (JetBrains) | Self‑host + Cloud (TeamCity Cloud) | Java/Kotlin | Proprietary (Free tier 100 build configs) | ビルドチェーンの可視化、パラメータ化、 Kotlin DSL | - 強力な UI とビルトインテストレポート<br>- パラメータ化が柔軟 | - ライセンス費用がかさむ（Enterprise）<br>- プラグインは少数 | 大規模エンタープライズ、Java/Kotlin 主導 |
| **Bamboo** (Atlassian) | Self‑host | Java | Proprietary | ビルド・デプロイ・リリース管理が統合、Jira/Bitbucket 連携 | - Jira と深い統合、デプロイプランが GUI で作成可能 | - UI が古く、設定がやや煩雑<br>- ライセンスコスト高め | Atlassian エコシステムで統一したい組織 |
| **Drone CI** | Self‑host (Docker) | Go | Apache 2 | コンテナ単位のビルド・パイプライン、YAML (`.drone.yml`) | - 完全コンテナ化でスケーラブル<br>- プラグインは Docker イメージとして配布 | - UI が最小限、機能はシンプル | Kubernetes / Docker‑first のチーム |
| **Buildkite** | SaaS (controller) + Self‑host Agents | Go, Ruby | Proprietary (Free tier 100 jobs/month) | 高速なパラレル実行、エージェントは任意の環境で動作 | - エージェントがフリーランスで柔軟<br>- 大規模ビルドに最適 | - UI がシンプルで拡張性はプラグイン次第 | 高速パイプラインが必要な SaaS |
| **Harness** (CD) | SaaS | Java, Go | Proprietary | CD‑only、Continuous Verification（自動カナリア・ロールバック） | - AI/ML がビルド失敗を予測<br>- ローリング／ブルーグリーンがワンクリック | - 高価なサブスクリプション | エンタープライズ向け CD |
| **Spinnaker** | Self‑host (Netflix) | Java, Groovy | Apache 2 | マルチクラウドデプロイ、パイプライン DSL、Canary 分析 | - AWS/GCP/Azure すべてを横断的に管理可能<br>- カナリア分析が標準装備 | - 設定・運用が複雑で学習コスト高い | 大規模マルチクラウド CD |
| **Argo CD** (GitOps) | Self‑host / SaaS (Argo CD Enterprise) | Go | Apache 2 | Git リポジトリを単一の真実情報に、K8s デプロイ自動化 | - Kubernetes に特化し宣言的デプロイがシンプル<br>- UI が直感的、RBAC が細かい | - K8s 以外のリソースは別ツールが必要 | GitOps でインフラとアプリを同一リポジトリ管理 |
| **Tekton Pipelines** | Self‑host (Kubernetes) | Go | Apache 2 | Kubernetes Native CI/CD、CRDs によるパイプライン定義 (`Task`, `Pipeline`) | - 完全 K8s ネイティブでクラウドプロバイダに依存しない<br>- GitOps と併用が容易 | - UI がなく CLI/CI のみで操作 | CNCF エコシステム中心の組織 |
| **GitHub Packages / Docker Hub / JFrog Artifactory** (Artifact Registry) | SaaS / Self‑host | — | Varies | ビルド成果物（Docker, Maven, npm, NuGet）保存・配布 | - CI と同一プラットフォームで統合しやすい | - プライベートリポジトリは有償 | 全ての CI/CD パイプラインに必須 |

---

## 2️⃣ IaC（Infrastructure as Code）ツールとカテゴリ

### 2‑1️⃣ **宣言的・クラウドネイティブ IaC**

| 製品 / サービス | 種別 (SaaS / Self‑host) | 主なプラットフォーム | ライセンス | キー機能 | **メリット** | **デメリット** | 代表的利用シーン |
|------------------|--------------------------|----------------------|------------|-----------|--------------|----------------|-------------------|
| **Terraform** (HashiCorp) | SaaS（Terraform Cloud） + Self‑host CLI | AWS, Azure, GCP, OCI, K8s, 任意プロバイダ | MPL‑2.0 | HCL 宣言、プラグインで 2000+ プロバイダー、State ファイル管理、Plan/Apply の差分確認 | - マルチクラウドが最も成熟<br>- 大規模モジュール化が可能 | - State 管理が運用上の課題（ロック・バックアップ）<br>- 変数型が弱く、ロジックは外部で実装必要 | インフラ全体のコード管理 |
| **AWS CloudFormation** | SaaS (Fully managed) | AWS | Proprietary | JSON/YAML テンプレート、Change Sets、StackSets、SAM (Serverless) | - ネイティブに IAM / Service Control が利用可能<br>- Drift Detection が標準装備 | - AWS 以外のリソースは管理できない<br>- テンプレートが冗長になりやすい | AWS 専用インフラ |
| **Azure Resource Manager (ARM) Templates** | SaaS (Azure) | Azure | Proprietary | JSON / Bicep（宣言的 DSL） 、モジュール化、What‑If デプロイ | - Azure の全サービスが対象<br>- Bicep が可読性向上 | - JSON の記述は冗長、Bicep への移行コストあり | Azure 環境 |
| **Google Cloud Deployment Manager** | SaaS (GCP) | GCP | Proprietary | YAML + Jinja2 テンプレート、インポート可能な Terraform config | - GCP のリソースを一括管理<br>- 変更プレビューが可能 | - 機能は Cloud Build + Terraform に比べ限定的 | GCP 環境 |
| **Pulumi** | SaaS (Pulumi Service) + Self‑host CLI | AWS, Azure, GCP, K8s, 任意 | Apache 2 | コードベース（TypeScript, Python, Go, C#, Java）で IaC、State 管理は Pulumi Service/CLI | - プログラミング言語のロジックがそのまま利用できる<br>- 既存 CI と統合しやすい | - 学習コストが高め（言語依存）<br>- State の暗号化管理が必須 | 複雑なロジックを含むインフラ |
| **AWS CDK** (Cloud Development Kit) | SaaS (CDK Deploy) + Self‑host CLI | AWS | Apache 2 | TypeScript / Python / Java / C# で CloudFormation を生成 | - 開発者が慣れた言語で IaC が書ける<br>- 高度な抽象化（Construct） | - CDK のバージョン互換が頻繁に変わりやすい | AWS ネイティブ開発 |
| **Azure Bicep** | SaaS (Azure) + CLI | Azure | MIT | 宣言的 DSL → ARM JSON にコンパイル、モジュール化 | - ARM よりシンプルで VS Code 拡張が充実 | - 現在は Azure のみ対象 | Azure 環境 |
| **Google CDK for Terraform (cdktf)** | SaaS + CLI | GCP/AWS/… | Apache 2 | TypeScript/Python で Terraform を生成 | - プログラミング言語の利点と Terraform のプロバイダーを融合 | - ツールチェーンが増える | マルチクラウド＋開発者フレンドリー |

### 2‑2️⃣ **構成管理 / プロビジョニング（状態遷移型）**

| 製品 | 種別 | 主な言語・DSL | ライセンス | キー機能 | **メリット** | **デメリット** |
|------|------|---------------|------------|----------|--------------|----------------|
| **Ansible** | SaaS (Automation Hub) + Self‑host | YAML（Playbook） | Apache 2 | エージェントレス、モジュールが豊富、Idempotent | - 学習コスト低い、SSH だけで動作<br>- 多くのクラウド・OS に対応 | - 大規模ノード数で実行速度が遅くなることがある |
| **Chef** | SaaS (Hosted Chef) + Self‑host | Ruby DSL | Apache 2 | クライアント/サーバー型、Cookbooks、Policyfiles | - 強力なテストフレームワーク（Test Kitchen）<br>- 大規模インフラで実績あり | - Ruby が必須、学習コスト高め |
| **Puppet** | SaaS (Puppet Enterprise) + Self‑host | Puppet DSL (Ruby ベース) | Apache 2 | モデル駆動、Catalog, Agent/Server, Hiera | - 大規模環境でのコンプライアンス管理が得意 | - DSL が独特、デバッグがやや難しい |
| **SaltStack** | SaaS (Salt Cloud) + Self‑host | YAML + Jinja2 (states) | Apache 2 | 高速イベント駆動、Zero‑MQ, Salt SSH | - リアルタイムの状態監視と変更適用が得意 | - 大規模環境でのスケールは調整が必要 |
| **CFEngine** | Self‑host | CFEngine DSL (C) | Apache 2 | 高速、エージェントレス、ポリシーベース | - 非常に軽量で大規模ノードに向く | - DSL が古く学習コストが高い |
| **Rudder** | SaaS + Self‑host | YAML (Policies) | GPLv3 | コンプライアンスレポート、Web UI で管理 | - UI が充実し非エンジニアでも利用可能 | - エンタープライズ向けの機能は有償 |

### 2‑3️⃣ **Policy as Code / セキュリティ IaC**

| 製品 | 種別 | 主な言語・DSL | ライセンス | キー機能 | メリット | デメリット |
|------|------|---------------|------------|----------|----------|-------------|
| **OPA (Open Policy Agent)** | Self‑host + SaaS (Gatekeeper) | Rego（宣言的） | Apache 2 | ポリシー評価エンジン、Kubernetes Admission Controller, Terraform OPA integration | - 任意の API にポリシー適用可能<br>- 高度なロジックが書ける | - Rego の学習曲線 |
| **Checkov** (Bridgecrew) | SaaS + CLI | Python | Apache 2 | IaC 静的解析（Terraform, CloudFormation, ARM） | - CI に組み込みやすく、セキュリティベストプラクティスを自動検出 | - カスタムルールは Python で実装 |
| **Terrascan** (Accurics) | SaaS + CLI | Go | Apache 2 | IaC スキャン（Terraform, CloudFormation） | - ポリシーのカスタマイズが簡単 | - 検出結果のチューニングが必要 |
| **Conftest** (OPA ベース) | CLI | Rego | Apache 2 | 任意テキスト/YAML/JSON に対するポリシーチェック | - CI で手軽に使用可能 | - OPA と同様の学習コスト |

---

## 3️⃣ **CI/CD と IaC の統合パターン（GitOps・Pipeline‑as‑Code）**

```
┌─────────────────┐      ┌───────────────┐
│ Git リポジトリ   │──►──▶│ CI (Jenkins, │
│  - アプリコード │      │ GitHub Actions)│
│  - IaC（Terraform│      └───────▲───────┘
│    / Helm）     │              │
└─────────────────┘              │
         ▲                       │ ビルド・テスト結果 (artifact)
         │                       │
         │          ┌────────────▼─────────────┐
         │          │ CD/デプロイ（Argo CD,   │
         │          │ Spinnaker, Tekton）      │
         │          └──────────────────────────┘
         │                     ▲
         │                     │
    Pull‑Request             │
  (コードレビュー)           │
         │               デプロイ対象環境
         ▼                     │
   マージ／マージリクエスト →│
(自動トリガーで CI が走り、IaC を apply)
```

### 主な実装例

| パターン | 具体的ツールチェーン | フロー概要 |
|----------|-------------------|-----------|
| **GitOps（K8s）** | GitHub → GitHub Actions (ビルド) → Docker Registry → Argo CD (宣言的マニフェスト) | アプリとインフラのマニフェストが同一リポジトリにあり、`git push` がデプロイを駆動 |
| **Terraform‑CI** | GitLab CI → `terraform fmt/validate` → `plan` → 手動承認 → `apply` (GitLab Runner) | PR のレビューで `plan` を確認し、マージ後に自動適用 |
| **AWS CDK + CodePipeline** | CodeCommit → CodeBuild (CDK synth) → CloudFormation StackSet デプロイ | CDK が生成した CFN テンプレートを Pipeline がデリバリー |
| **Azure Bicep + Azure Pipelines** | Azure Repos → Azure Pipelines → `az deployment sub create` | Bicep のプレビュー (`what-if`) をステージングし、承認後に本番へ適用 |
| **Hybrid (Terraform + Helm)** | Bitbucket Pipelines → Terraform apply (インフラ) → Helm upgrade (アプリ) on EKS | IaC と K8s アプリデプロイを同一パイプラインで管理 |
| **Policy‑Gate (OPA)** | Jenkins → `opa test` / `conftest` で IaC スキャン → 合格なら `terraform apply` | セキュリティポリシー違反があればビルド失敗 |

---

## 4️⃣ CI/CD に組み込む **セキュリティ・品質保証**（SAST/DAST/SBOM）

| ツール | カテゴリ | 主な機能 | 統合ポイント |
|--------|----------|-----------|--------------|
| **SonarQube / SonarCloud** | SAST | 静的コード解析、バグ・脆弱性検出、品質ゲート | CI のテストフェーズで実行（GitHub Actions, GitLab CI） |
| **Trivy** | コンテナイメージスキャン | CVE スキャニング、misconfig 検出、SBOM 出力 (CycloneDX) | Docker ビルド後の `trivy image` アクション |
| **Snyk** | SAST + 依存関係スキャン | npm, Maven, PyPI の脆弱性検出、Fix PR 提案 | CI の「dependency check」ステップ |
| **Checkov / Terrascan** | IaC 静的解析 | Terraform/CloudFormation のベストプラクティス違反検出 | `terraform plan` 後に実行し、fail on violation |
| **OWASP ZAP** | DAST | ランタイムの Web アプリ脆弱性スキャン (XSS, SQLi) | デプロイ後のステージング環境で自動テスト |
| **Syft + Grype** | SBOM 生成 & CVE スキャン | `syft` で SBOM、`grype` で脆弱性照合 | ビルド完了直後に実行し、アーティファクトと紐付け |
| **Dependabot / Renovate** | Dependence 更新自動化 | PR による依存ライブラリのバージョン更新 | GitHub リポジトリで自動有効化 |

---

## 5️⃣ デプロイ戦略（Blue‑Green・Canary・Rolling）

| 戦略 | 特徴 | 実装例 (CI/CD + IaC) | メリット | 注意点 |
|------|------|-----------------------|----------|--------|
| **Blue‑Green** | 本番環境と同等のスタンバイ環境を用意し、切り替え時に DNS/ロードバランサでスイッチ | - AWS: `CodeDeploy` + Elastic Load Balancer でターゲットグループ入れ替え <br>- K8s: `Argo CD` の **sync waves** と `Service` の selector 切り替え | - ダウンタイムなし、ロールバックが即座に可能 | - 2 倍のリソースが必要 |
| **Canary** | 新バージョンを一部トラフィックだけに段階的に提供し、モニタリングで合格判定 | - Spinnaker の Canary アナリティクス <br>- Argo Rollouts (`RolloutStrategy: Canary`) | - リスク低減、問題があれば即座に縮小 | - カナリア分析の設定が必要 |
| **Rolling Update** | 既存ポッド/インスタンスを順次置き換える | - K8s Deployment の `strategy.rollingUpdate` <br>- ECS Service のデプロイタイプ `BLUE_GREEN` (実装は内部で Rolling) | - リソース増減が最小、継続的に更新可能 | - 一部インスタンスが古いまま残る期間がある |
| **Recreate** | 全ての旧リソースを停止し、新しいものへ一括置換 | - ECS の `deploymentController` = `ECS` (デフォルト) <br>- Kubernetes `strategy.type: Recreate` | - 実装が最もシンプル | - 完全なダウンタイムが発生 |
| **A/B Testing** | 複数バージョンを同時に提供し、ユーザー属性で分割 | - Istio VirtualService + Weighted Routing <br>- Cloudflare Load Balancer の Weighted Pools | - 機能比較実験が可能 | - トラフィック配分の正確さとモニタリングが必須 |

---

## 6️⃣ **選定チェックリスト**（CI/CD × IaC）

| 判定項目 | 質問例 | 推奨ツール／組み合わせ |
|----------|--------|-----------------------|
| **VCS の統合度** | GitHub、GitLab、Bitbucket のどれを主に使うか？ | - GitHub → GitHub Actions + Terraform Cloud <br>- GitLab → GitLab CI + Terraform (self‑host) |
| **マルチクラウド / ハイブリッド** | 複数ベンダー（AWS/Azure/GCP）へ同時にデプロイしたいか？ | - Terraform + Argo CD (K8s)、Pulumi、Crossplane |
| **エージェントの可用性** | 社内ネットワークだけで実行したいか、クラウド上で完結させたいか？ | - オフライン環境 → Jenkins + Ansible <br>- クラウド → Cloud Build / CodePipeline |
| **スケーラビリティ** | 同時に 1000 件以上のビルドを走らせる必要があるか？ | - Buildkite / Harness（高速エージェント）<br>- Tekton + K8s クラスタで水平スケール |
| **コンプライアンス・監査** | IaC の変更履歴やポリシー違反の証跡が必須か？ | - OPA Gatekeeper + Terraform Cloud Sentinel <br>- Azure Policy + Bicep |
| **Secret 管理** | 秘密情報を安全に扱う必要があるか？ | - HashiCorp Vault (外部) + CI の Secret Injection <br>- AWS Secrets Manager と CodeBuild 環境変数 |
| **デプロイ戦略** | Blue‑Green / Canary が必須か？ | - Argo Rollouts（K8s）<br>- Spinnaker（マルチクラウド） |
| **テスト自動化** | セキュリティスキャン・SBOM 生成はパイプラインに入れたいか？ | - GitHub Actions + Trivy / Syft <br>- Jenkins + Checkov + SonarQube |
| **コスト感覚** | 無料枠でどこまで賄えるか、予算上限は？ | - 小規模 → GitHub Actions (Free) + Terraform Cloud Free <br>- 大規模 → 自己ホスト Jenkins + GitLab Runner on EC2 |

---

## 7️⃣ **パフォーマンス指標・ベンチマーク例**

| 指標 | 測定対象 | 典型的な数値（参考） |
|------|----------|-------------------|
| **ビルド時間** (単一ジョブ) | Docker イメージ (Node.js アプリ, 500 MB) | 4‑6 min on GitHub Actions (standard runner) |
| **パイプライン同時実行数** | GitLab Runner (Docker executor) | 50+ ジョブ／ノード（CPU 8 core） |
| **IaC Apply 時間** | Terraform `apply` (10 リージョン VPC + SG) | 2‑3 min on Terraform Cloud (remote backend) |
| **Canary 判定遅延** | Spinnaker Canary (Datadog metrics) | 5‑15 min のデータ収集で自動昇格 |
| **Secret 取得レイテンシ** | Vault Agent sidecar → Env var injection | < 50 ms per secret |
| **SBOM 生成時間** | Syft on multi‑layer Docker image (1 GB) | ~30 s |

> **実測環境例**  
> - **GitHub Actions**（Ubuntu‑latest, 2 CPU）: `docker build` + `trivy scan` ≈ 3 min。  
> - **Jenkins on Kubernetes**（4 pod executors）: 同時に 30 ビルド走らせても CPU 使用率 < 70%。  

---

## 8️⃣ まとめとおすすめアーキテクチャ例

| シナリオ | 推奨 CI/CD + IaC スタック |
|----------|---------------------------|
| **スタートアップ・SaaS（GitHub‑first）** | GitHub → GitHub Actions (Docker, Trivy) → Docker Hub / GH Packages → Argo CD (K8s) + Terraform Cloud (state) |
| **エンタープライズ・オンプレ／ハイブリッド** | Jenkins (Master/Agents) + Nexus Repository <br>→ Ansible for OS config <br>→ Terraform（Self‑host）+ OPA Gatekeeper <br>→ Spinnaker for multi‑cloud CD |
| **マルチクラウド大規模サービス** | GitLab CI/CD → Tekton Pipelines on GKE + Crossplane (IaC) <br>→ Pulumi (TypeScript) で Cloud‑agnostic リソース作成 <br>→ Argo Rollouts for Canary |
| **サーバーレス / FaaS アプリ** | AWS CodeCommit → CodeBuild (CDK synth) → CodePipeline (Deploy to Lambda & API GW) <br>→ Terraform (for ancillary resources) + Checkov security lint |
| **コンプライアンス重視（金融）** | Azure DevOps Pipelines → Bicep + Sentinel policies <br>→ OPA Gatekeeper for K8s <br>→ Vault for secrets, integrated via Azure Key Vault provider |

---

## 9️⃣ 参考リンク

| カテゴリ | URL |
|----------|-----|
| Jenkins | https://www.jenkins.io/ |
| GitHub Actions | https://github.com/features/actions |
| GitLab CI/CD | https://docs.gitlab.com/ee/ci/ |
| CircleCI | https://circleci.com/ |
| Azure Pipelines | https://azure.microsoft.com/services/devops/pipelines/ |
| AWS CodePipeline / CodeBuild | https://aws.amazon.com/codepipeline/ |
| Google Cloud Build | https://cloud.google.com/build |
| Terraform | https://www.terraform.io/ |
| Pulumi | https://www.pulumi.com/ |
| AWS CDK | https://aws.amazon.com/cdk/ |
| Azure Bicep | https://github.com/Azure/bicep |
| Argo CD | https://argo-cd.readthedocs.io/ |
| Tekton | https://tekton.dev/ |
| OPA / Gatekeeper | https://www.openpolicyagent.org/ |
| Trivy | https://github.com/aquasecurity/trivy |
| Snyk | https://snyk.io/ |
| SonarQube | https://www.sonarqube.org/ |
| Checkov | https://github.com/bridgecrewio/checkov |
| Spinnaker | https://spinnaker.io/ |
| Argo Rollouts (Canary) | https://argoproj.github.io/argo-rollouts/ |

---

### 🎯 ひとことまとめ

> **CI/CD と IaC の選定は「統合度」「スケール」「コンプライアンス」の３軸で評価**し、  
> - **Git リポジトリと同一にコード・インフラを置く（GitOps）** がモダンなベストプラクティスです。  
> - **Terraform + Argo CD** はマルチクラウドでも最も汎用的で、**Jenkins / GitHub Actions** 系は開発速度とエコシステムの豊富さが魅力です。  
> - **OPA / Sentinel / Checkov** などの *Policy‑as‑Code* を CI に組み込むことで、デリバリー時点でセキュリティ・コンプライアンスを自動保証できます。

質問や「特定クラウドだけに絞ったベストプラクティス」等、さらに掘り下げが必要な項目があれば遠慮なくどうぞ！