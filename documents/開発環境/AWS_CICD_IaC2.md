# ☁️ AWS に特化した **CI/CD + IaC ベストプラクティス**  
（2024‑12 時点で公式・実務で主流のサービス・ツールを網羅し、設定例・メリット／デメリットまで徹底解説）

> 本稿は「**ソース管理 → ビルド/テスト → アーティファクト格納 → IaC デプロイ → 監視・ガバナンス**」というフローをベースに、  
> AWS が提供する **ネイティブサービス** と **マルチクラウドで広く使われているオープンソースツール（Terraform / Pulumi / CDK）** を組み合わせた設計指針を示します。  
> 各ステップの **ベストプラクティス、推奨設定例、メリット／デメリット** をテーブル化し、最後に選定チェックリストと参考リンクを掲載しています。

---

## 1️⃣ 全体アーキテクチャ概観

```
[GitHub / CodeCommit] ──► (CodeStar Connection) ──► [AWS CodePipeline]
        │                                            │
        ▼                                            ▼
   Source Stage                                 Build Stage (CodeBuild)
        │                                            │
        ▼                                            ▼
   Manual Approval (optional)                Artifact Upload → S3 + ECR
        │                                            │
        ▼                                            ▼
  Deploy Stage ──► CloudFormation / CDK / Terraform  (ChangeSet/Plan)
        │                                            │
        ▼                                            ▼
 Post‑Deploy Tests (Lambda Hook / Smoke Test)   Production
```

- **ソース**は GitHub（外部）か CodeCommit（AWS 内）を選択し、**CodeStar Connections**でシームレスに接続。  
- **ビルド**は **CodeBuild** が標準だが、必要なら自前の EC2 Spot/On‑Demand ビルダーも可。  
- **アーティファクト**は **S3（バイナリ）＋ECR（Docker）** に保存し、ライフサイクルで自動クリーンアップ。  
- **IaC**は **CloudFormation / CDK** が AWS のデフォルト。マルチクラウドや既存 Terraform 環境がある場合は **Terraform**／**Pulumi** を併用。  
- **ガバナンス**は **AWS Config Rules、Service Control Policies (SCP)、CloudFormation Guard、OPA Gatekeeper（EKS）** で実装し、**CI パイプラインの検証ステージ**に組み込む。  

---

## 2️⃣ ソースコード管理とブランチ戦略

| 項目 | 推奨設定 |
|------|----------|
| **リポジトリ** | - 社内向けは **AWS CodeCommit**（IAM ベースのアクセス制御）<br>- OSS・外部協業は **GitHub** + **CodeStar Connections**（OAuth／SAML SSO が可能） |
| **ブランチ保護** | GitHub の **Branch Protection Rules**、または CodeCommit の **Pull Request Approvals** に **Build Validation (CodeBuild)** を必須化 |
| **コミット署名** | GPG 署名を必須にし、`git verify-commit` が失敗したらプッシュ拒否。AWS IAM ポリシーで `codecommit:GitPush` の条件に `aws:RequestTag/gitSigned=true` を付与可能 |
| **機密情報除外** | `.gitignore` に `*.tfvars`, `secrets.json`, `*.pem` 等を必ず追加し、**GitHub secret scanning** と **CodeGuru security scan** で漏洩検知 |

---

## 3️⃣ ビルド・テスト（AWS CodeBuild）

### 3‑1️⃣ 標準的な `buildspec.yml`

```yaml
# buildspec.yml (YAML)
version: 0.2

env:
  secrets-manager:
    DB_PASSWORD: "prod/dbPassword"   # Secrets Manager のシークレット名

phases:
  install:
    runtime-versions:
      nodejs: 20
      python: 3.11
      java: corretto17
    commands:
      - echo "Installing dependencies..."
      - npm ci               # Node.js のキャッシュは後述の local cache で高速化
      - pip install -r requirements.txt

  pre_build:
    commands:
      - echo "Restoring caches (Docker, Maven, etc.)"
      - |
        if [ -d /root/.m2 ]; then cp -R /root/.m2 $CODEBUILD_SRC_DIR/; fi
      - |
        if [ -d /root/.npm ]; then cp -R /root/.npm $CODEBUILD_SRC_DIR/; fi

  build:
    commands:
      - echo "Running lint & unit tests"
      - npm run lint
      - npm test -- --ci --coverage
      - pytest -q
      - mvn verify

  post_build:
    commands:
      - echo "Building Docker image"
      - IMAGE_URI=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/myapp:${CODEBUILD_RESOLVED_SOURCE_VERSION}
      - docker build -t $IMAGE_URI .
      # コンテナスキャン (Trivy)
      - trivy image --severity HIGH,CRITICAL $IMAGE_URI || exit 1
      - echo "Pushing image to ECR"
      - $(aws ecr get-login-password | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com)
      - docker push $IMAGE_URI
artifacts:
  files:
    - imagedefinitions.json   # ECS/EKS デプロイ用
cache:
  paths:
    - '/root/.npm/**/*'        # npm キャッシュ
    - '/root/.m2/repository/**/*' # Maven キャッシュ
    - '/root/.cache/pip/**/*'   # pip キャッシュ
    - '/root/.docker/**/*'      # Docker レイヤーキャッシュ (local)
```

#### 重要ポイント

| 項目 | ベストプラクティス |
|------|-------------------|
| **ビルド環境** | `aws/codebuild/standard:6.0`（Linux）を使用し、Docker ビルドが必要な場合は `privileged: true` を有効化。 |
| **キャッシュ** | CodeBuild の **local cache** (`type=LOCAL_DOCKER_LAYER_CACHE`, `LOCAL_SOURCE_CACHE`) で Docker レイヤー・ソースの再利用を最大化し、ビルド時間を 30‑50 % 短縮。 |
| **シークレット取得** | `env.secrets-manager` に Secrets Manager の ARN/名前を書き、コード中に平文が残らないようにする（KMS が自動暗号化）。 |
| **イメージスキャン** | Trivy で CVE を検出し、Critical / High があれば `exit 1` → パイプライン失敗。Amazon Inspector のイメージスキャンは ECR にプッシュ後に自動実行されるので、結果は CloudWatch Events で取得可能。 |
| **アーティファクト** | `imagedefinitions.json`（ECS/Fargate 用）や CloudFormation テンプレートを S3 にアップロードし、次ステージのデプロイに渡す。 |

---

## 4️⃣ アーティファクト・コンテナレジストリ（Amazon ECR）

| 項目 | 推奨設定 |
|------|----------|
| **SKU** | **Standard**（小規模）か **Premium**（クロスリージョンレプリケーション、イメージスキャン） |
| **認証方式** | CodeBuild / CodePipeline の実行ロールに `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage` など最小権限を付与。EKS の場合は **IRSA** 経由で Pod が直接取得可能。 |
| **イメージスキャン** | ECR の **Image scanning on push** を有効化し、Amazon Inspector が自動で CVE を検出。結果は CloudWatch Events (`ecr-image-scan`) に流す。 |
| **レプリケーション** | Premium なら **Cross‑Region Replication**（最低 2 リージョン）を設定し、グローバルデプロイ時のプッシュレイテンシを削減。 |
| **ライフサイクルポリシー** | `untagged > 30 days` と `tagged older than 90 days -> keep last 5` のように自動クリーンアップ設定でストレージコスト最小化。 |

---

## 5️⃣ デプロイ戦略と実装例

### 5‑1️⃣ Blue‑Green（EC2 / ECS） – CodeDeploy + ALB

| サービス | 主な機能 |
|----------|-----------|
| **AWS CodeDeploy** (Server/ ECS) | - `deploymentConfigName: CodeDeployDefault.AllAtOnce`（一括切替）または `CodeDeployDefault.HalfAtATime`（段階的）<br>- **自動ロールバック**（ヘルスチェック失敗時） |
| **Application Load Balancer (ALB)** | - 2 つの Target Group（Blue / Green）を持ち、CodeDeploy がトラフィックシフトを実行<br>- ヘルスチェックでインスタンス／タスクの正常性を判定 |

#### CloudFormation + ChangeSet の Blue‑Green デプロイ例

```yaml
Resources:
  # --- ALB と Target Groups -------------------------------------------------
  MyALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: my-alb
      Subnets: !Ref PublicSubnets
      Scheme: internet-facing

  TGBlue:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Port: 80
      Protocol: HTTP
      VpcId: !Ref VPC
      HealthCheckIntervalSeconds: 30

  TGGreen:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Port: 80
      Protocol: HTTP
      VpcId: !Ref VPC
      HealthCheckIntervalSeconds: 30

  # --- CodeDeploy Application & Deployment Group -----------------------------
  MyApp:
    Type: AWS::CodeDeploy::Application
    Properties:
      ComputePlatform: Server   # EC2/ECS

  BlueGreenDG:
    Type: AWS::CodeDeploy::DeploymentGroup
    Properties:
      ApplicationName: !Ref MyApp
      ServiceRoleArn: !GetAtt CodeDeployServiceRole.Arn
      DeploymentConfigName: CodeDeployDefault.AllAtOnce
      AutoRollbackConfiguration:
        Enabled: true
        Events: [DEPLOYMENT_FAILURE]
      LoadBalancerInfo:
        TargetGroupPairInfoList:
          - TargetGroups:
              - Name: !Ref TGBlue   # 現在の Blue
            ProdTrafficRoute:
              ListenerArns: [!Ref ALBListener]   # 本番リスナ
            TestTrafficRoute:
              ListenerArns: [!Ref ALBTestListener] # テスト用リスナ（Canary でも使用）

Outputs:
  LoadBalancerDNS:
    Value: !GetAtt MyALB.DNSName
```

- **手順**：CodePipeline の Deploy ステージで CloudFormation **Change Set** を作成 → 承認後に実行。Change Set が成功すれば CodeDeploy が Blue‑Green 切替を開始し、ヘルスチェックが NG なら自動ロールバック。

---

### 5‑2️⃣ Canary デプロイ（EKS / Lambda）

| サービス | 主な機能 |
|----------|-----------|
| **AWS CodeDeploy for Amazon EKS** | - `deploymentConfigName: CodeDeployDefault.ECSCanary10Percent30Minutes` 等で段階的トラフィックシフト<br>- `PreTrafficHook`（Lambda）で統合テスト実行 |
| **Argo Rollouts (EKS)** | - オープンソースだが IAM ロールと連携し、**OPA Gatekeeper** と組み合わせてポリシー適用可能 |
| **Lambda Alias + Weighted Routing** | - `aws lambda update-alias --function-name MyFn --name prod --routing-config '{"AdditionalVersionWeights":{"2":0.1}}'` で Canary（10 %） → 重み増加で本番へ |

#### CodeDeploy for EKS の Canary 設定例（JSON）

```json
{
  "applicationName": "my-eks-app",
  "deploymentGroupName": "prod-canary",
  "serviceRoleArn": "arn:aws:iam::123456789012:role/CodeDeployEKSRole",
  "deploymentConfigName": "CodeDeployDefault.ECSCanary10Percent30Minutes",
  "autoRollbackConfiguration": {
    "enabled": true,
    "events": ["DEPLOYMENT_FAILURE"]
  },
  "ecsServices": [
    {
      "serviceName": "my-eks-service",
      "clusterName": "prod-cluster"
    }
  ],
  "loadBalancerInfo": {
    "targetGroupPairInfoList": [
      {
        "targetGroups": [{ "name": "tg-blue" }],
        "prodTrafficRoute": { "listenerArns": ["arn:aws:elasticloadbalancing:..."] },
        "testTrafficRoute": { "listenerArns": ["arn:aws:elasticloadbalancing:..."] }
      }
    ]
  }
}
```

- **Pre‑traffic Hook** Lambda が `curl` や内部 API 呼び出しでヘルスチェック → NG の場合は CodeDeploy が自動ロールバック。

---

### 5‑3️⃣ Rolling Update（ECS Service）

| 設定項目 | 推奨値 |
|----------|--------|
| **minimumHealthyPercent** | `100` （常に全タスクが稼働） |
| **maximumPercent** | `200` （デプロイ時に最大 2 倍のタスク数を許容） |
| **deploymentCircuitBreaker** | `{ "enable": true, "rollback": true }`（失敗時自動ロールバック） |

```yaml
Resources:
  MyService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      ServiceName: my-service
      TaskDefinition: !Ref TaskDef
      DesiredCount: 3
      DeploymentConfiguration:
        MinimumHealthyPercent: 100
        MaximumPercent: 200
        DeploymentCircuitBreaker:
          Enable: true
          Rollback: true
```

---

## 6️⃣ IaC（Infrastructure as Code）ツールとベストプラクティス

| ツール | 宣言的/命令的 | 主な対象リソース | 推奨シナリオ |
|--------|---------------|------------------|--------------|
| **AWS CloudFormation** | JSON/YAML (宣言的) | すべての AWS リソース | - 完全マネージド、Change Set による安全デプロイ<br>- 大規模組織で標準化 |
| **AWS CDK** | TypeScript / Python / Java / C#（命令的 DSL → CloudFormation） | 同上 | - 開発者がプログラミング言語でロジックを書きたいとき<br>- モジュール化・再利用性が高い |
| **Terraform** | HCL (宣言的) + `aws` プロバイダー | 同上 | - マルチクラウド／オンプレ併用、既存 Terraform 環境がある場合 |
| **Pulumi** | TypeScript / Python / Go / .NET（命令的） | 同上 | - すでにアプリコードと同じ言語スタックで IaC を管理したいケース |

### 6‑1️⃣ CloudFormation の安全デプロイフロー

1. **ローカル検証**  
   ```bash
   cfn-lint template.yml               # 構文チェック
   taskcat test-run -c .taskcat.yml    # ステージング環境での実行テスト
   ```
2. **Change Set 作成 → 手動承認**（CodePipeline の Manual Approval アクション）  
3. **Execute Change Set** 失敗したら自動ロールバック（`RollbackConfiguration`）

#### CloudFormation Guard（ポリシー as Code）例：必須タグ

```hcl
# guard-rules.guard
rule required_tags {
    description = "All resources must have Environment and Owner tags"
    tags = ["Environment", "Owner"]
}
```

CI で `cfn-guard validate -r guard-rules.guard template.yml` を実行し、違反があればビルド失敗。

---

### 6‑2️⃣ CDK デプロイ例（TypeScript）

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';

export class MyEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, 'Repo', 'myapp');

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef');
    taskDef.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repo,
        process.env.CIRCLE_SHA1),   // CodeBuild のイメージタグ
      memoryLimitMiB: 512,
      logging: new ecs.AwsLogDriver({ streamPrefix: 'myapp' })
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 3,
      deploymentController: { type: ecs.DeploymentControllerType.CODE_DEPLOY } // Blue‑Green 可
    });
  }
}
```

- `cdk synth` → CloudFormation テンプレート生成、`cdk deploy --require-approval never` を CodePipeline の Deploy ステージで実行。  
- **CodeDeploy** と組み合わせれば **Blue‑Green / Canary** が自動化。

---

### 6‑3️⃣ Terraform + Sentinel（Policy as Code）例

```hcl
# main.tf (抜粋)
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
}
```

#### Sentinel ポリシー：必須タグ `Owner` が無い場合は拒否

```hcl
import "tfplan/v2" as tfplan

# 全ての aws_instance に Owner タグがあるかチェック
deny if length(filter tfplan.resource_changes, r ->
  r.type == "aws_instance" and
  !(contains(keys(r.change.after.tags), "Owner"))
) > 0
```

- **Terraform Cloud / Enterprise** のプラン実行時に Sentinel が評価され、違反があると `terraform plan` が失敗し、CodePipeline が自動でブロック。

---

## 7️⃣ シークレット・認証管理

| 項目 | 推奨手法 |
|------|----------|
| **シークレット格納** | **AWS Secrets Manager**（自動ローテーション可能）または **SSM Parameter Store (SecureString)** に KMS 暗号化 |
| **アクセス権限** | IAM ロールに `secretsmanager:GetSecretValue` / `ssm:GetParameter` を最小スコープで付与。ECS/EKS のタスクロール、Lambda の実行ロールで直接取得できるようにする。 |
| **IRSA (EKS)** | ServiceAccount に IAM ロールを紐づけ（IAM OIDC プロバイダー）し、Pod が Secrets Manager / Parameter Store へシークレットベアラートークンなしでアクセス可能。 |
| **自動ローテーション** | Secrets Manager の **Rotation Lambda**（RDS, MongoDB 等）を有効化し、30 日ごとに自動更新。Lambda の環境変数は `aws:secretsmanager` で参照するだけで暗号化されたまま渡せる。 |
| **パラメータキャッシュ** | アプリ側で Parameter Store の値を取得したらローカルキャッシュ（例：AWS SDK の `CacheItemTTL`) を利用し、頻繁な API 呼び出しを回避。 |

---

## 8️⃣ ガバナンス・Policy as Code

| ツール | 対象 | 主な機能 |
|--------|------|----------|
| **AWS Config Rules** | 全リソース | - リアルタイムで構成違反検知（例：`required-tags`, `s3-bucket-public-read-prohibited`) <br>- CloudWatch Events で通知・自動修正 |
| **Service Control Policies (SCP)** | AWS Organizations の全アカウント | - アカウント単位で権限上限を設定（例：`ec2:*` を禁止） |
| **CloudFormation Guard** | CloudFormation テンプレート | - `cfn-guard` でテンプレート検証、CI に組み込み |
| **OPA Gatekeeper (EKS)** | Kubernetes リソース | - Rego ポリシーで PodSecurity、NetworkPolicy 等を強制 |
| **Terraform Sentinel** | Terraform プラン | - カスタムロジック（タグ・コスト上限）でプラン実行前にブロック |

#### Config Rule 例：S3 バケットは暗号化必須

```json
{
  "ConfigRuleName": "s3-bucket-encryption",
  "Scope": {
    "ComplianceResourceTypes": ["AWS::S3::Bucket"]
  },
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
}
```

- **CodePipeline** の Deploy 前に `aws configservice evaluate-config-rules` を実行し、非準拠があればパイプライン失敗。

---

## 9️⃣ セキュリティスキャンと品質保証

| ステージ | ツール | 主なチェック項目 |
|----------|--------|------------------|
| **コード静的解析** | CodeGuru Reviewer (Java, Python) / SonarCloud / Snyk | バグ、脆弱性、コード Smell |
| **依存関係スキャン** | Dependabot (GitHub) / `npm audit` / `pip-audit` | ライブラリ CVE |
| **コンテナイメージスキャン** | Amazon Inspector (ECR) + Trivy（CI） | OS パッケージ・アプリ層の CVE |
| **IaC スキャン** | cfn‑lint / taskcat（CFN）<br>tflint / tfsec（Terraform）<br>cdk‑nag（CDK） | テンプレート構文、ベストプラクティス違反 |
| **ポリシー検証** | Config Rules, Guard, Sentinel, OPA Gatekeeper | タグ付与・暗号化・コスト上限 |

### 失敗基準例

- **Critical / High CVE** が Trivy または Inspector に検出 → `exit 1`（パイプライン停止）  
- **CodeGuru** の `Severity >= HIGH` → ビルド失敗  
- **Config Rule** 非準拠 → Deploy ステージで自動ブロック  

---

## 10️⃣ デプロイ戦略とトラフィック管理

| 戦略 | AWS サービス | 実装例 |
|------|--------------|--------|
| **Blue‑Green (EC2/ECS)** | CodeDeploy + ALB Target Groups | 上記 CloudFormation テンプレートで TG を 2 つ用意し、CodeDeploy がスイッチ |
| **Canary (EKS / Lambda)** | CodeDeploy for EKS / Lambda Alias Weighted Routing | `deploymentConfigName: CodeDeployDefault.ECSCanary10Percent30Minutes` + Pre‑Traffic Hook |
| **Rolling Update (ECS Service)** | ECS Service DeploymentConfiguration | `minimumHealthyPercent=100`, `maximumPercent=200`, `deploymentCircuitBreaker` 有効化 |
| **Feature Flags** | AWS AppConfig + Amazon CloudWatch Evidently | アプリ側でフラグ取得 → 機能リリースを段階的に展開 |

---

## 11️⃣ モニタリング・可観測性

| 項目 | サービス | 推奨設定 |
|------|----------|----------|
| **ログ** | CloudWatch Logs | CodeBuild、Lambda、ECS の標準出力を Log Group に集約。Log Retention は 30‑90 日に設定。 |
| **メトリクス** | CloudWatch Metrics | ビルド時間・失敗率・デプロイ成功率をカスタムメトリクスとして `PutMetricData`。ダッシュボードで可視化。 |
| **分散トレース** | AWS X‑Ray | Lambda、ECS タスク、API Gateway のリクエストトレースを有効化し、遅延原因を特定。 |
| **イベント駆動** | EventBridge | `codepipeline-pipeline-execution-failure`, `ecr-image-scan` 等のイベントを SNS/Slack に通知。 |
| **アラート** | CloudWatch Alarms + SNS | ビルド失敗率 > 5 % → Slack 通知、デプロイロールバック → PagerDuty アラート。 |

> **ベストプラクティス**：  
> - **パイプラインメトリクス**（`PipelineExecutionTime`, `StageDuration`) を CloudWatch に送信し、CI のボトルネックを自動検出。  
> - **X‑Ray のサブセグメント**で外部 API 呼び出しや DB クエリのレイテンシも測定。

---

## 12️⃣ コスト最適化とスケーラビリティ

| 項目 | 推奨手法 |
|------|----------|
| **Build 環境** | CodeBuild の `computeType` を必要最低限に設定し、**Spot インスタンス** (`codebuild:StartBuild` で `environment.computeType=BUILD_GENERAL1_SMALL`, `queuedTimeoutInMinutes` で短縮) |
| **ECR ストレージ** | ライフサイクルポリシーで未タグ付け画像を 30 日以内に削除、古いタグは保持数限定 |
| **S3 アーティファクト** | バケットの **Lifecycle Rules** で 90 日以上のオブジェクトを **Glacier Deep Archive** に移行 |
| **Auto Scaling** | EC2 / ECS の Target Tracking Policy（CPU/Memory）で需要に応じて自動スケール。Spot Fleet と組み合わせるとコスト 30‑50 % 削減可能 |
| **Reserved Instances / Savings Plans** | 長期稼働が見込める RDS、Aurora、EC2 は **Savings Plans** を活用し、最大 72 % の割引を取得 |
| **パイプライン実行回数削減** | PR 単位で `Build Validation` のみ走らせ、本番ブランチへのマージ時にフルデプロイ。不要なビルドは **GitHub Actions** でスキップできるよう条件分岐 (`if: github.event_name == 'push' && startsWith(github.ref, 'refs/heads/main')`) |

---

## 13️⃣ 推奨 AWS‑Centric CI/CD + IaC アーキテクチャ例（コード化）

### 13‑1️⃣ CDK パイプライン（TypeScript）全体像

```ts
import * as cdk from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

export class MyCICDPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'my-app-pipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('myorg/myapp', 'main',
          { authentication: cdk.SecretValue.secretsManager('github-token') }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ],
      })
    });

    // Add a stage that deploys the CDK app (CloudFormation)
    const prodStage = pipeline.addStage(new MyAppStage(this, 'Prod'));

    // Manual approval before production
    prodStage.addPre(new ManualApprovalStep('Approve-Prod'));

    // Canary deployment using CodeDeploy for ECS
    prodStage.addPost(new ShellStep('Canary-Test', {
      commands: [
        'aws deploy create-deployment --application-name my-eks-app \
          --deployment-group-name prod-canary --revision ...'
      ]
    }));
  }
}
```

- **Source**は GitHub、認証は Secrets Manager の `github-token`。  
- **Synth**で CDK → CloudFormation へ変換し、**Change Set** が自動生成される。  
- **ManualApprovalStep**で人間の承認を挟み、失敗したらロールバック。  

---

### 13‑2️⃣ Terraform Cloud + Sentinel パイプライン（YAML）

```yaml
# .gitlab-ci.yml (GitLab CI が Terraform Cloud と連携する例)
stages:
  - validate
  - plan
  - apply

validate:
  stage: validate
  image: hashicorp/terraform:latest
  script:
    - terraform fmt -check
    - terraform init -backend-config="bucket=my-tfstate"
    - terraform validate

plan:
  stage: plan
  image: hashicorp/terraform:latest
  script:
    - terraform plan -out=tfplan.out
    - terraform show -json tfplan.out > tfplan.json
  artifacts:
    paths:
      - tfplan.out
      - tfplan.json

apply:
  stage: apply
  when: manual          # 手動承認必須
  image: hashicorp/terraform:latest
  script:
    - terraform apply -auto-approve tfplan.out
```

- **Terraform Cloud** の Sentinel ポリシーが `plan` 時点で評価され、違反があればジョブは失敗し次のステージへ進まない。  
- `apply` は手動承認 (`when: manual`) にして、本番デプロイ前に必ず人間が確認。

---

## 14️⃣ **選定チェックリスト**（AWS CI/CD + IaC）

| 判定項目 | 質問例 | 推奨ツール / アーキテクチャ |
|----------|--------|---------------------------|
| **コードホスティング** | 社内だけか外部協業があるか？ | - 完全社内 → CodeCommit + CodeStar Connections (GitHub) <br>- 外部は GitHub + OIDC で SSO |
| **ビルド環境のスケール** | ビルド頻度・コスト重視か？ | - 小規模は **CodeBuild (standard)** <br>- 大規模／高速化は **Self‑Hosted EC2 Spot** with Docker-in-Docker |
| **コンテナレジストリ** | イメージのスキャンとレプリケーションが必要か？ | - ECR Premium + Image Scan + Cross‑Region Replication |
| **IaC の選択肢** | マルチクラウドや既存 Terraform があるか？ | - CloudFormation / CDK (AWS 専用) <br>- Terraform (マルチクラウド) <br>- Pulumi (開発者が好きな言語で統一したい） |
| **デプロイ戦略** | Blue‑Green が必須か、Canary が必要か？ | - EC2/ECS → CodeDeploy + ALB (Blue‑Green) <br>- EKS/Lambda → CodeDeploy Canary + Pre‑Traffic Hook |
| **ガバナンス要件** | コンプライアンスでタグ・暗号化が必須か？ | - Config Rules + Guard / Sentinel（IaC）<br>- SCP で組織全体の権限上限設定 |
| **セキュリティスキャン** | どこまで自動化したいか？ | - CodeGuru (コード) <br>- Trivy & Inspector (イメージ) <br>- Dependabot / Snyk (依存関係) |
| **モニタリング** | パイプラインの可視化は必要か？ | - CloudWatch Logs + Metrics + Dashboards <br>- X‑Ray for分散トレース |
| **コスト最適化** | ビルド・インフラに余剰があるか？ | - Spot / Savings Plans <br>- S3 Lifecycle, ECR Lifecycle, Build Cache |

---

## 15️⃣ 参考リンク（公式ドキュメント）

| カテゴリ | URL |
|----------|-----|
| CodeCommit | https://docs.aws.amazon.com/codecommit/ |
| CodeBuild | https://docs.aws.amazon.com/codebuild/ |
| CodePipeline | https://docs.aws.amazon.com/codepipeline/ |
| CodeDeploy (ECS/EKS) | https://docs.aws.amazon.com/codedeploy/ |
| Amazon ECR | https://docs.aws.amazon.com/ecr/ |
| AWS CDK | https://docs.aws.amazon.com/cdk/latest/guide/home.html |
| CloudFormation Guard | https://github.com/aws-cloudformation/cloudformation-guard |
| AWS Config Rules | https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html |
| Service Control Policies (SCP) | https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html |
| OPA Gatekeeper on EKS | https://github.com/open-policy-agent/gatekeeper |
| Terraform Sentinel | https://www.terraform.io/cloud-docs/policy/sentinel |
| Amazon Inspector (ECR) | https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html |
| Trivy (container scanning) | https://github.com/aquasecurity/trivy |
| CodeGuru Reviewer | https://aws.amazon.com/codeguru/reviewer/ |
| AWS X‑Ray | https://docs.aws.amazon.com/xray/latest/devguide/aws-x-ray.html |
| Savings Plans | https://aws.amazon.com/savingsplans/ |
| EventBridge | https://docs.aws.amazon.com/eventbridge/latest/userguide/what-is-amazon-eventbridge.html |

---

## 🎯 まとめ

1. **ソース → ビルド → アーティファクト → IaC デプロイ** のフローは、**AWS CodePipeline + CodeBuild + CloudFormation/CDK/Terraform** が最もシームレス。  
2. **Blue‑Green / Canary** は **CodeDeploy** と **ALB Target Groups**（EC2/ECS）または **Lambda Alias Weighted Routing** で実装し、**Pre‑Traffic Hook** にテスト自動化を組み込むと安全性が向上。  
3. **シークレット管理**は **Secrets Manager / Parameter Store + IAM ロール (IRSA)** を徹底し、平文がコードに残らないようにする。  
4. **ガバナンス**は **AWS Config Rules + CloudFormation Guard + Sentinel** で IaC のプッシュ前に検証し、違反はパイプライン自体をブロック。  
5. **セキュリティスキャン**は **CodeGuru → Trivy/Inspector → Dependabot** を CI に組み込み、Critical が出たら必ずビルド失敗させる。  
6. **コスト最適化**は **Spot ビルド環境・ECR Lifecycle・Savings Plans** を活用し、リソースの無駄遣いを抑える。

このベストプラクティスに沿って構築すれば、**安全かつ高速なデリバリー**と **インフラガバナンス** が実現でき、AWS 環境での DevOps 成熟度が大幅に向上します。  

> さらに具体的なユースケース（例：マルチリージョン Blue‑Green デプロイ、EKS の OPA Gatekeeper 運用、Serverless Canary リリース）について詳しく知りたい場合は遠慮なく質問してください！