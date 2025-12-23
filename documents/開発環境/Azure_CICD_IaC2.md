# 🟦 Azure に特化した **CI/CD + IaC ベストプラクティス**  
（2024‑12 時点で Microsoft が公式に提供・推奨しているツール、実務での導入パターン、セキュリティ・ガバナンスまで網羅）

> 本稿は **「コード管理」 → 「ビルド／テスト」 → 「イメージ格納」 → 「インフラ構築 (IaC)」 → 「デプロイ」** の一連の流れを、Azure が提供するサービスとオープンソースツールで実装した場合に最適になる構成・設定例と合わせて解説します。  
> 途中で **「なぜこの選択がベストなのか」**（コスト、スケーラビリティ、セキュリティ）を必ず添えているので、設計判断の材料としてご活用ください。

---

## 1️⃣ Azure CI/CD エコシステム全体像

| カテゴリ | 主なサービス / ツール | 補足 |
|----------|----------------------|------|
| **ソースコード管理** | Azure Repos (Git) ★ GitHub Enterprise (Azure AD 統合) | プライベートリポジトリは Azure Repos が最も統合が深い |
| **CI（ビルド・テスト）** | Azure Pipelines (YAML マルチステージ)、GitHub Actions + `azure/*` アクション | Microsoft‑hosted エージェントは Windows / Linux / macOS の 3 種類を無料で利用可能 |
| **Artifact & コンテナレジストリ** | Azure Artifacts (NuGet・npm・Maven) ★ Azure Container Registry (ACR) | ACR は Premium SKU で Geo‑replication が可能 |
| **IaC（インフラ構成）** | ARM テンプレート、Bicep (宣言的 DSL)、Terraform (Azure Provider)、Pulumi (TypeScript / Python) | Bicep は Azure の公式推奨、Terraform はマルチクラウド併用に便利 |
| **CD（デプロイ）** | Azure Pipelines Environments + Approvals, Azure DevOps Release pipelines ★ Azure App Service Deployment Slots ★ AKS + Helm / Flux / Argo CD ★ Azure Functions (ZIP デプロイ) | 各プラットフォームで Blue‑Green／Canary が標準サポート |
| **シークレット管理** | Azure Key Vault、Azure Managed Identity、Azure DevOps Variable Groups (Key Vault 連携) | 完全マネージド、ローテーション自動化が可能 |
| **ガバナンス / Policy as Code** | Azure Policy, Azure Blueprint, Sentinel (Terraform Enterprise), OPA Gatekeeper (AKS) | ポリシー違反は CI 時点でブロックできる |
| **セキュリティスキャン** | Microsoft Defender for Cloud (CSPM)、Defender for Containers、Trivy/Grype (CI 統合) ★ SonarCloud, Dependabot | DevSecOps パイプラインに必須 |
| **モニタリング / 可観測性** | Azure Monitor (Metrics), Log Analytics (Log Collection), Application Insights (App‑level Telemetry) ★ GitHub Actions の workflow run logs | パイプライン実行時間・失敗率もメトリクス化可能 |

---

## 2️⃣ ソースコード管理とブランチ戦略

| 項目 | 推奨設定（Azure Repos） | 理由 |
|------|------------------------|------|
| **ブランチモデル** | *GitFlow* または *Trunk‑Based Development* (feature ブランチ → `main` に PR) | Azure Repos の **Branch Policies** が PR ごとに必須ビルド・レビュー・コードオーナーを設定でき、CI と連携しやすい |
| **保護ポリシー** | - *Require a minimum number of reviewers* (2 以上)<br>- *Build validation*（Azure Pipelines のビルド結果が SUCCESS 必須）<br>- *Check for linked work items*（Azure Boards と紐付） | コード品質・トレーサビリティを自動化 |
| **コミット署名** | *Require signed commits* (GPG) | 攻撃者による改ざん防止、Key Vault で公開鍵管理可能 |
| **Secrets の除外** | `.gitignore` に `*.tfvars`, `appsettings.*.json` 等を必ず入れる | 秘密情報がリポジトリに流出しないよう徹底 |

> **GitHub Enterprise と Azure AD 連携**  
> - GitHub の SSO、SCIM、MFA を Azure AD で一元管理でき、Azure DevOps との同一 ID でアクセス権を共有可能です。  
> - GitHub Actions → Azure にデプロイする場合は `azure/login` アクションで **Managed Identity** が使えるので、Service Principal の秘密鍵管理が不要になります。

---

## 3️⃣ ビルド・テストパイプライン（Azure Pipelines）

### 3‑1️⃣ 推奨構成：マルチステージ YAML

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [ main ]

pr:
  autoCancel: true
  branches:
    include: [ main ]

variables:
  - group: "global-vars"          # Azure DevOps Variable Group (Key Vault 連携)
  - name: buildConfiguration
    value: Release

stages:

# ── Stage 1 : Restore / Install Dependencies ────────────────────────
- stage: restore
  displayName: 'Restore & Cache'
  jobs:
  - job: npm_restore   # Node.js の例
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: Cache@2
      inputs:
        key: '"npm"|$(Agent.OS)|package-lock.json'
        restoreKeys: |
          "npm"
        path: $(Pipeline.Workspace)/.npm
    - script: npm ci --prefer-offline
      displayName: 'npm install'

# ── Stage 2 : Build & Unit Test ───────────────────────────────────────
- stage: build
  dependsOn: restore
  jobs:
  - job: build_app
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - script: npm run build --if-present
      displayName: 'Build Application'

    - script: npm test -- --ci --coverage
      displayName: 'Run Unit Tests'

# ── Stage 3 : Security Scan (SAST + Container) ───────────────────────
- stage: security
  dependsOn: build
  jobs:
  - job: trivy_scan
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - script: |
        docker build -t $(ACR_NAME).azurecr.io/myapp:${{ variables['Build.BuildId'] }} .
        trivy image --severity HIGH,CRITICAL $(ACR_NAME).azurecr.io/myapp:${{ variables['Build.BuildId'] }}
      displayName: 'Container Image Scan with Trivy'

  - job: sonar_scan
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: SonarCloudPrepare@1
      inputs:
        SonarCloud: 'SonarCloudServiceConnection'
        organization: 'my-org'
        scannerMode: 'CLI'
        configMode: 'manual'
        cliProjectKey: 'myproject'
        extraProperties: |
          sonar.cs.opencover.reportsPaths=$(Build.SourcesDirectory)/**/coverage.opencover.xml
    - script: dotnet test --collect:"XPlat Code Coverage"
      displayName: 'Run .NET Tests (if mixed stack)'
    - task: SonarCloudAnalyze@1

# ── Stage 4 : Publish Artifacts & Push Image ───────────────────────────
- stage: publish
  dependsOn: security
  jobs:
  - job: push_image
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: Docker@2
      inputs:
        containerRegistry: 'ACR-ServiceConnection'   # ACR に接続した Service Connection
        repository: 'myapp'
        command: 'buildAndPush'
        Dockerfile: '**/Dockerfile'
        tags: |
          $(Build.BuildId)
          latest

    - publish: $(Pipeline.Workspace)/drop
      artifact: drop

# ── Stage 5 : Deploy (Blue‑Green) ───────────────────────────────────────
- stage: deploy
  dependsOn: publish
  condition: succeeded()
  jobs:
  - deployment: appservice_deploy
    environment: 'prod'                # Azure DevOps Environments に定義済み
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure-Prod-Connection'
              appName: 'my-webapp-prod'
              package: $(Pipeline.Workspace)/drop/**/*.zip
              deploymentMethod: 'auto'  # スロットを利用した Blue‑Green
          - task: AzureCLI@2
            displayName: 'Swap Slots (Blue‑Green)'
            inputs:
              azureSubscription: 'Azure-Prod-Connection'
              scriptType: 'pscore'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az webapp deployment slot swap \
                  --resource-group $(ResourceGroup) \
                  --name my-webapp-prod \
                  --slot staging \
                  --target-slot production
```

#### 重要ポイント

| 項目 | 推奨設定・ベストプラクティス |
|------|-----------------------------|
| **エージェント** | Microsoft‑hosted `ubuntu-latest`（キャッシュが自動）か、自己ホスト (Linux VM) に **Managed Identity** を付与し、Key Vault へシームレスにアクセス |
| **キャッシュ** | `Cache@2` タスクで npm/yarn, NuGet (`~/.nuget/packages`) などを永続化。ビルド時間が 30‑50 % 短縮 |
| **Artifact 保存** | Azure Artifacts (Universal Packages) か ACR のマニフェストにタグ付与。`retain` ポリシーで古いバージョンは自動削除 |
| **環境変数・シークレット** | **Variable Group** → Key Vault 参照 (`@Microsoft.KeyVault(VaultName=..., SecretName=...)`) により、パイプライン実行時に Azure AD の Managed Identity がシークレット取得 |
| **承認フロー** | `environment: prod` と併せて **Approvals & Checks**（手動承認・ビジネスルール）を設定。必須レビュー者が OK しないと次ステージに進まない |
| **テストの分離** | Unit → Integration → End‑to‑End (E2E) を別ジョブで実行し、失敗したら早期にパイプライン停止（`dependsOn` と `condition: succeeded()`） |
| **コード品質ゲート** | SonarCloud / Microsoft CodeQL で PR のビルドバリデーションを必須化 (`build validation` policy) |
| **コンテナスキャン** | Trivy (CVE) + Azure Defender for Containers (policy & runtime) を組み合わせ、イメージプッシュ前に必ず走らせる |
| **ロールバック** | App Service の **Deployment Slots** か AKS の `kubectl rollout undo` / Argo Rollouts による自動ロールバックを設定（失敗時は自動で前バージョンへ） |

---

## 4️⃣ コンテナイメージ管理 – Azure Container Registry (ACR)

| 項目 | 推奨設定 |
|------|----------|
| **SKU** | `Premium` を選択 → Geo‑replication（3 リージョン以上）でリージョナルレジストリを構築し、マルチリージョン AKS に高速プッシュ/プル |
| **認証方式** | **Managed Identity** (Azure AD) か **Service Principal** の最小権限 (`acrpull` / `acrpush`) を Azure DevOps Service Connection に紐付け |
| **イメージスキャン** | ACR の **Content Trust** と **Vulnerability Scanning**（Microsoft Defender for Containers）を有効化。プッシュ時に自動で CVE が検出され、ポリシー違反は `docker push` が失敗 |
| **Retention Policy** | 30 日以上のイメージは自動削除、`latest` タグは保護しない（CI によって常に上書き） |
| **Helm Chart の格納** | ACR は Helm リポジトリとしても機能 (`helm repo add acr https://myacr.azurecr.io/helm/v1/repo`)。Chart 変更時は `helm package` → `az acr helm push` |

---

## 5️⃣ アプリケーションデプロイ戦略

| プラットフォーム | デプロイ方式 | Blue‑Green / Canary 実装例 |
|------------------|--------------|---------------------------|
| **Azure App Service** | Deployment Slots (staging ↔ production) + `az webapp deployment slot swap` | *Blue‑Green*: ステージングスロットに新バージョンをデプロイ → ヘルスチェック → `swap` で即時切替。失敗したら **Swap** 前の状態へ自動ロールバック |
| **Azure Kubernetes Service (AKS)** | Helm, Flux CD, Argo CD + Argo Rollouts | *Canary*: `RolloutStrategy: Canary`（step‑wise traffic shift）<br>※ AKS の **Pod Disruption Budgets** と **Horizontal Pod Autoscaler** を併用し、スローダウン時は自動でトラフィックを戻す |
| **Azure Functions** | Zip デプロイ (`AzureFunctionApp@1`) + Slots (preview) | *Blue‑Green*: Function App の **Deployment Slots**（プレビュー機能）にデプロイ → `az functionapp deployment slot swap` |
| **Static Web Apps** | GitHub Actions + Azure CLI (`az staticwebapp create`) | *Canary*: 変更は自動的にステージング環境へデプロイし、GitHub ブランチ保護で PR がマージされたら本番へロールアウト |

> **ポイント**：  
> - **Deployment Slots** は App Service と Functions のみ提供されるが、AKS では **Argo Rollouts** または **Flux Canary** が同等機能を実装。  
> - ステージング環境は必ず **別リソースグループ / サブスクリプション** に分離し、**ネットワーク隔離 (VNet) と NSG** で本番トラフィックから切り離す。

---

## 6️⃣ IaC ツールとベストプラクティス

| ツール | 宣言的/命令的 | 主な対象リソース | 推奨利用シーン |
|--------|---------------|------------------|----------------|
| **ARM テンプレート** | JSON (宣言的) | すべての Azure リソース | - 完全マネージド、Azure Portal から直接エクスポート可能 <br>- 大規模組織で既存テンプレートが多数ある場合 |
| **Bicep** | DSL（簡潔な宣言的） | 同上 (ARM の上位ラッパー) | - 新規プロジェクトのデフォルト<br>- モジュール化・再利用性が高く、`what-if` が標準装備 |
| **Terraform** | 宣言的 (HCL) | Azure + 他クラウド/オンプレミス | - マルチクラウド併用、既存 Terraform で統一管理したい場合 |
| **Pulumi** | 命令的 (TypeScript / Python / Go) | 同上 | - 複雑なロジックや外部 API 呼び出しが必要なとき<br>- 開発者がコードベースで IaC を扱いたいケース |

### 6‑1️⃣ Bicep の実装例（モジュール化＋CI テスト）

**modules/network.bicep**

```bicep
param vnetName string = 'myVNet'
param addressSpace string = '10.0.0.0/16'
param subnetName string = 'appSubnet'
param subnetPrefix string = '10.0.1.0/24'

resource vnet 'Microsoft.Network/virtualNetworks@2022-09-01' = {
  name: vnetName
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [addressSpace]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: subnetPrefix
        }
      }
    ]
  }
}
output vnetId string = vnet.id
```

**main.bicep**

```bicep
module net './modules/network.bicep' = {
  name: 'network'
  params: {
    vnetName: 'prod-vnet-${uniqueString(resourceGroup().id)}'
  }
}
```

**CI パイプライン（Azure Pipelines）で Bicep テスト**

```yaml
- stage: iac_test
  jobs:
  - job: bicep_whatif
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: AzureCLI@2
      inputs:
        azureSubscription: 'Azure-DevOps-Connection'
        scriptType: 'pscore'
        scriptLocation: 'inlineScript'
        inlineScript: |
          az deployment sub what-if \
            --location eastus \
            --template-file main.bicep \
            --parameters environment=dev
```

#### 6‑2️⃣ Terraform + Azure Storage Backend

```hcl
terraform {
  required_version = ">= 1.5"
  backend "azurerm" {
    resource_group_name   = "tfstate-rg"
    storage_account_name  = "tfstatestorage"
    container_name        = "tfstate"
    key                   = "prod.terraform.tfstate"
  }
}
provider "azurerm" {
  features {}
}
```

- **ロック**は Azure Blob の **lease** 機構で自動。  
- **Plan/Apply** は Azure Pipelines の `TerraformCLI@0` タスクで実行し、**Service Connection** に最小権限 (`Contributor` + `Storage Blob Data Owner`) を付与。

---

## 7️⃣ シークレット・認証管理

| 項目 | 推奨手法 |
|------|----------|
| **Key Vault へのアクセス** | Azure DevOps の **Variable Group → Key Vault** 参照 (`@Microsoft.KeyVault(VaultName=..., SecretName=...)`) <br>または **Azure CLI task** で `az keyvault secret show` を呼び出し、結果を環境変数に展開 |
| **Managed Identity** | パイプラインエージェントが Azure VM (Self‑hosted) の場合、**System Assigned Managed Identity** に `Key Vault Secrets User` ロールを付与し、シークレット取得時のクレデンシャル管理を排除 |
| **Secret Rotation** | Key Vault の **自動ローテーション**（証明書・キー）＋ Azure AD Conditional Access で MFA 必須化 |
| **パラメータストア** | Terraform では `azurerm_key_vault_secret` データソース、Bicep では `existing` リソース参照 (`resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = { name: 'mykv' }`) |

---

## 8️⃣ ガバナンス・ポリシー（Policy as Code）

| ツール | 適用対象 | 主な機能 |
|--------|----------|----------|
| **Azure Policy** | 全 Azure リソース | - タグ付与、リージョン制限、SKU 制限<br>- `deny` / `auditIfNotExists` で IaC デプロイ時にブロック |
| **Azure Blueprint** | サブスクリプションレベル | - 複数ポリシー・ロール定義をテンプレート化し、環境ごとに適用 |
| **Sentinel (Terraform Enterprise)** | Terraform の `plan` 段階 | - Go 言語ベースのポリシーでコスト上限やタグ付与を強制 |
| **OPA Gatekeeper** | AKS（Kubernetes） | - K8s リソースに対する Rego ポリシー (`validate-ingress`, `require-resource-limits`) を Admission Controller で適用 |

> **実装例：Azure Policy によるタグ付与の必須化**

```json
{
  "if": {
    "field": "tags",
    "exists": false
  },
  "then": {
    "effect": "deny"
  }
}
```

- このポリシーは **ARM/Bicep/Terraform** のデプロイ時に `az deployment` が失敗し、CI パイプラインが自動でブロックされます。

---

## 9️⃣ セキュリティスキャンと品質保証

| タスク | ツール・実装例 |
|--------|----------------|
| **Static Application Security Testing (SAST)** | SonarCloud (`SonarCloudPrepare` + `SonarCloudAnalyze`) <br>Microsoft CodeQL (`CodeQL Action` on GitHub) |
| **Dependency Vulnerability** | Dependabot (GitHub) → Azure Repos でも同様に *Dependabot Alerts* を有効化 <br>NuGet / npm の脆弱性は `dotnet list package --vulnerable` / `npm audit` |
| **Container Image Scanning** | Trivy (`trivy image`) + Azure Defender for Containers (policy & runtime) |
| **Infrastructure Security** | **Checkov**（Terraform/Bicep）<br>```bash
checkov -d . --skip-check CKV_AZURE_1
``` |
| **Secret Leakageチェック** | `git-secrets`, `detect-secrets` を CI の最初のジョブで走らせる |

> **パイプライン失敗基準**  
> - SAST/Dependency スキャンで **Critical / High** が 0 件でない場合は `failOnSeverity: true` に設定し、ビルドを中止。  
> - Container Scan の結果が **Critical** CVE を含む場合も同様に失敗させる。

---

## 10️⃣ デプロイ戦略とトラフィック管理

| 戦略 | Azure サービス | 実装例 |
|------|----------------|--------|
| **Blue‑Green (App Service)** | Deployment Slots + Traffic Manager/Front Door | - スロットにデプロイ → `az webapp deployment slot swap` <br> - Front Door の **Backend Pool** にスロットを登録し、切替時にヘルスチェックで自動フェイルオーバー |
| **Canary (AKS)** | Argo Rollouts + Service Mesh (Istio) | ```yaml\napiVersion: argoproj.io/v1alpha1\nkind: Rollout\nspec:\n  strategy:\n    canary:\n      steps:\n        - setWeight: 10\n        - pause: {duration: 5m}\n        - setWeight: 30\n``` |
| **A/B テスト (Static Web Apps)** | Azure Static Web Apps + GitHub Actions のプレビュー環境 | - PR が作成されると自動で **preview URL** が生成、ステージング → 本番へマージ時に `az staticwebapp create` で本番リソース更新 |
| **Zero‑Downtime (Functions)** | Slots + Swap | 同上（Function App のスロット） |

> **Traffic Manager / Front Door** を併用すると、リージョン単位のカナリアやグローバルロードバランシングが実装しやすくなります。  
> - `traffic-manager profile` に **Weighted** ルーティングを設定し、段階的に新しいエンドポイントへトラフィック比率を上げるだけでカナリアテストが完了。

---

## 11️⃣ モニタリング・可観測性

| 項目 | Azure サービス | 推奨構成 |
|------|----------------|----------|
| **パイプラインメトリクス** | Azure Monitor (Pipeline Metrics) | - `Azure Pipelines` の **Analytics** で成功率、平均実行時間を可視化<br>- Application Insights に **custom events** (`trackEvent`) を送ってビジネスKPI と紐付 |
| **ログ集約** | Log Analytics Workspace | - ビルド・デプロイジョブの stdout/stderr → Azure Monitor Logs に自動転送 <br>- `AzureDiagnostics` カテゴリでエラー検索が可能 |
| **アプリケーション可観測性** | Application Insights (APM) + Distributed Tracing | - `.NET`, `Java`, `Node.js` SDK を組み込み、**Request/Dependency** のトレースを自動取得 <br>- Azure DevOps から直接 **Dashboard** に埋め込める |
| **インフラ監視** | Azure Monitor + Service Health | - VM, AKS, App Service の **Health Alerts** を設定し、障害時は Teams/Slack に Webhook 通知 |

> **実装例：パイプラインから Application Insights へカスタムイベント送信**

```yaml
- task: AzureCLI@2
  inputs:
    azureSubscription: 'Azure-DevOps-Connection'
    scriptType: 'pscore'
    inlineScript: |
      $appId = "$(APPINSIGHTS_INSTRUMENTATION_KEY)"
      $event = @{
        name = "PipelineRun"
        properties = @{ 
          pipeline = "$(Build.DefinitionName)";
          runId   = "$(Build.BuildId)";
          result  = "$(Agent.JobStatus)";
        }
      } | ConvertTo-Json
      Invoke-RestMethod -Method Post `
        -Uri "https://dc.services.visualstudio.com/v2/track" `
        -Headers @{ "Content-Type"="application/json"; "x-api-key"=$appId } `
        -Body $event
```

---

## 12️⃣ コスト最適化とスケーラビリティ

| 項目 | ベストプラクティス |
|------|-------------------|
| **エージェント利用** | Microsoft‑hosted エージェントは **無料分 (1800 min/月)** を超える場合は **Self‑Hosted Linux VM** に切り替え、**Reserved Instances** でコスト削減 |
| **キャッシュ活用** | `Cache@2` タスクで `~/.npm`, `~/.nuget/packages`, `~/.m2/repository` を永続化し、ビルド時間を 30‑50 % 短縮 |
| **Artifact Retention** | Azure Artifacts の **Retention Policy**（例: 30 日）で古いパッケージ自動削除 |
| **ACR Geo‑Replication** | 必要なリージョンだけにレプリカを作成し、不要なリージョンは削除してストレージコスト抑制 |
| **Infrastructure as Code の分割** | 環境ごとに **Bicep modules** を切り出し、**環境変数 (parameters)** だけで差分デプロイ。無駄なリソース再作成を防止 |
| **スケールアウト** | AKS の **Cluster Autoscaler** と **Virtual Node**（ACI）を有効化し、ピーク時に自動でノード追加 |

---

## 13️⃣ 推奨 Azure‑Centric CI/CD + IaC アーキテクチャ例

### フローチャート（テキスト版）

```
[GitHub / Azure Repos] ──► Pull Request
      │ (Branch Policy)
      ▼
[Azure Pipelines]  (YAML Multi‑Stage)
   ├─ Stage: Restore/Cache
   ├─ Stage: Build + Unit Test
   ├─ Stage: Security Scan (Trivy, SonarCloud)
   ├─ Stage: Publish Artifacts → ACR / Azure Artifacts
   └─ Stage: Deploy
        │
        ├─ App Service Slot (Blue‑Green)  OR
        └─ AKS Helm + Argo Rollouts (Canary)
            ↓
      [Azure Key Vault] ← Secrets
      [Azure Monitor] ← Metrics / Alerts
```

### 実装上のポイントまとめ

| 項目 | 詳細設定 |
|------|----------|
| **Service Connection** | `Azure-DevOps-Connection`（Managed Identity + RBAC: Contributor on target RG, AcrPush) |
| **Variable Group** | `global-vars` → Key Vault 参照 (`secretName=DbPassword`) |
| **Pipeline Triggers** | PR validation only on `main`; CI for feature branches (fast feedback) |
| **Approval Gates** | `environment: prod` に **Pre‑deployment approval**（チームリーダー）と **Post‑deployment health check**（App Service 健康チェック） |
| **Rollback** | App Service のスロット自動復元、AKS では `kubectl rollout undo` または Argo Rollouts の `autoPromote: false` + manual promote |
| **Policy Enforcement** | Azure Policy (require tags) → `az deployment what-if` が失敗すればパイプライン停止 |
| **Cost Guard** | Terraform Sentinel に「total cost < $5,000」ポリシー、Pipeline で `cost-estimation` タスクを走らせる |

---

## 14️⃣ **最終チェックリスト**（Azure CI/CD + IaC）

| 判定項目 | Yes/No → 推奨アクション |
|----------|------------------------|
| ソースは Azure Repos または GitHub Enterprise で管理していますか？ | どちらでも OK、GitHub の場合は `azure/login` アクションで認証 |
| ブランチ保護ポリシーに *ビルドバリデーション* が設定されていますか？ | 必須。失敗したらマージ不可 |
| ビルドエージェントは **Managed Identity** で Key Vault にアクセスしていますか？ | 無い場合は Service Principal → 最小権限へ変更 |
| コンテナイメージは ACR Premium の Geo‑Replication を利用していますか？ | 必要なら有効化、不要なリージョンは削除 |
| IaC は **Bicep**（または Terraform）でモジュール化されていますか？ | そうでない場合はリファクタリングを検討 |
| Azure Policy に必須タグ・リージョン制限が設定され、CI の `what-if` が失敗したらブロックしていますか？ | 無い場合は作成し、パイプラインに組み込む |
| セキュリティスキャン（Trivy, SonarCloud, Dependabot）が CI に必ず走りますか？ | すべて *fail on severity* 設定でビルド失敗させる |
| デプロイは **Blue‑Green** / **Canary** のいずれかを採用し、ロールバック手順が自動化されていますか？ | 手動だけの場合はスクリプト化・Argo Rollouts へ移行 |
| パイプラインの実行時間・失敗率を Azure Monitor で可視化していますか？ | ダッシュボード作成し、アラート設定 |

---

## 15️⃣ 参考リンク（公式ドキュメント）

| カテゴリ | URL |
|----------|-----|
| Azure Pipelines (YAML) | https://learn.microsoft.com/azure/devops/pipelines/yaml-schema |
| Azure Container Registry | https://learn.microsoft.com/azure/container-registry/ |
| Bicep 公式サイト | https://learn.microsoft.com/azure/bicep/ |
| Terraform on Azure | https://learn.microsoft.com/terraform/azure/install-azurerm |
| Pulumi for Azure | https://www.pulumi.com/docs/reference/clouds/azure/ |
| Azure Key Vault Integration (DevOps) | https://learn.microsoft.com/azure/devops/pipelines/library/connect-to-azure?view=azure-devops |
| Azure Policy Samples | https://github.com/Azure/azure-policy |
| Argo Rollouts on AKS | https://argoproj.github.io/argo-rollouts/ |
| Defender for Containers | https://learn.microsoft.com/azure/security-center/container-security |
| Application Insights (CI Integration) | https://learn.microsoft.com/azure/azure-monitor/app/sdk-overview |
| Azure Monitor Metrics for Pipelines | https://learn.microsoft.com/azure/devops/pipelines/reports/analytics?view=azure-devops |

---

## 🎯 まとめ

1. **コード管理は Azure Repos か GitHub Enterprise**（Azure AD 統合）に統一し、**Branch Policies**でビルド・レビューを必須化。  
2. **CI は Azure Pipelines のマルチステージ YAML** をベースに、**キャッシュ・アーティファクト管理・シークレットは Key Vault と連携**させることで安全かつ高速に。  
3. **コンテナイメージは ACR Premium** に格納し、**Trivy + Defender for Containers** で CI 時点で脆弱性を除去。  
4. **IaC は Bicep がデフォルト**（宣言的・what‑if が標準）。マルチクラウドが必要なら Terraform／Pulumi と併用し、State のロックは Azure Storage に委ねる。  
5. **デプロイは Blue‑Green (App Service) / Canary (AKS + Argo Rollouts)** を採用し、**Deployment Slots・Traffic Manager/Front Door** でトラフィック切替と自動ヘルスチェックを実装。  
6. **ポリシーは Azure Policy + OPA Gatekeeper** でインフラのコンプライアンスをコード化し、CI の `what‑if` / `plan` 段階で違反をブロック。  
7. **可観測性は Azure Monitor + Application Insights** に統合し、パイプライン実行メトリクスとアプリケーションテレメトリを一元管理。  

この構成・ベストプラクティスを採用すれば、**Azure ネイティブのフルマネージドサービスで高い可用性・セキュリティ・コスト効率** を実現しつつ、CI/CD と IaC の全工程が **コードとして管理・自動化** できるようになります。  

質問や「特定サービス（例：Azure Functions の Canary デプロイ）」「Terraform Sentinel の具体的ポリシー例」など、さらに掘り下げたいトピックがあれば遠慮なくどうぞ！