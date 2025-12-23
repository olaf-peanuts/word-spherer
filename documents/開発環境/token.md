# 認証で使われる **トークン** とは何か  
## 1️⃣ 基本概念

| 用語 | 意味 |
|------|------|
| **認証 (Authentication)** | 「あなたは誰か」を確認するプロセス。成功すると **トークン** が発行されることが多い。 |
| **認可 (Authorization)** | 発行されたトークンに基づき「何ができるか」(アクセス権) を決める。 |
| **トークン** | 文字列・バイナリデータで、認証済みユーザーやアプリケーションの情報（ID, 権限, 有効期限 …）を安全に運搬するもの。クライアントはこのトークンをサーバーへ渡すだけで再度ログインしなくてもよくなる。 |

> **ポイント**  
> - トークンは「**自己完結型 (self‑contained)**」か「**参照型 (reference)**」のどちらかに分類できる。  
>   *自己完結型* は内部に全情報が入っている（例：JWT）。  
>   *参照型* はサーバー側で状態を保持し、トークンはその参照 ID だけになる（例：セッション ID、Kerberos チケット）。

---

# 2️⃣ 主な認証トークンの種類と特徴

| 種類 | 主な利用シーン | フォーマット例 | 有効期限・リフレッシュ |
|------|----------------|----------------|------------------------|
| **Cookie / Session ID** | Web アプリのログインセッション | ランダム文字列 (サーバ側 DB/メモリに紐付く) | サーバ設定次第（数分〜数日） |
| **OAuth2 Access Token** | API 呼び出し、クラウドサービス | JWT, opaque string など | 数分〜1時間（短命） |
| **Refresh Token** | Access Token の再取得 | Opaque string | 数日〜数か月 (長寿) |
| **ID Token (OpenID Connect)** | ユーザー情報の取得 (認証結果) | JWT (`sub`, `name`, `email` など) | 通常は Access Token と同じ |
| **Personal Access Token (PAT)** | GitHub, GitLab 等の API 認証 | プレーン文字列（例: `ghp_...`） | 手動で期限設定（最大1年） |
| **JWT (JSON Web Token)** | 汎用的な認可情報搬送 | Base64URL エンコードされた 3 部構成 | 発行者が決める（数分〜数時間） |
| **Kerberos Ticket** | Windows ドメイン環境のシングルサインオン | バイナリ (Ticket Granting Ticket, Service Ticket) | デフォルトは 10 分 (TGT は 7‑10 日) |
| **NTLM Challenge/Response** | 古い Windows 認証 | バイナリチャレンジ・レスポンス | ログオンセッション中のみ |
| **CSRF Token** | フォーム送信の偽装防止 | ランダム文字列 (HTML hidden field) | 1 リクエスト〜数分 |
| **SAML Assertion** | エンタープライズ SSO | XML デジタル署名付き | 数分 |

---

# 3️⃣ トークンの構造とフォーマット

## 3.1 JWT（JSON Web Token）

```
<Header>.<Payload>.<Signature>
```

| パート | 内容 |
|--------|------|
| **Header** | `alg` (署名アルゴリズム), `typ` ("JWT") など |
| **Payload (Claims)** | 標準クレーム: <br>`iss`(発行者)・`sub`(主体)・`aud`(対象)・`exp`(有効期限)・`iat`(発行時刻) ・`nbf`(使用開始) <br> カスタムクレーム例: `role`, `scope`, `tenant_id` |
| **Signature** | Header と Payload を Base64URL エンコードし、`alg` で指定された鍵でハッシュ。改ざん防止 |

### JWT のサンプル（Base64 デコード済み）

```json
Header:
{
  "alg": "RS256",
  "typ": "JWT"
}

Payload:
{
  "iss": "https://login.microsoftonline.com/{tenant-id}/v2.0",
  "sub": "12345678-90ab-cdef-1234-567890abcdef",
  "aud": ["api://myapp", "https://graph.microsoft.com"],
  "exp": 1735689600,
  "iat": 1735686000,
  "scp": "User.Read Files.ReadWrite.All"
}
```

## 3.2 Windows アクセストークン（ローカル認証）

Windows の **アクセス トークン** は「バイナリ構造体」で、以下の情報が格納されます。

| フィールド | 内容 |
|------------|------|
| `User SID` | ログオンしたユーザーの Security Identifier |
| `Group SIDs` | ユーザーが所属するローカル/ドメイン グループの SID (例: Administrators, Users) |
| `Privileges` | `SeBackupPrivilege` など、プロセスが保持できる権限 |
| `Integrity Level` | Low / Medium / High / System（UAC の基礎） |
| `Token Source` | ログオン方式 (NTLM, Kerberos, Smart Card…) |
| `Owner`, `Primary Group` | オブジェクト所有者情報 |
| `Restricted SIDs` (任意) | アクセス制限用に除外した SID |

**取得方法例（C++）**

```cpp
HANDLE hToken;
OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &hToken);
DWORD dwSize = 0;
GetTokenInformation(hToken, TokenUser, nullptr, 0, &dwSize); // 必要サイズ取得
TOKEN_USER* pUser = (TOKEN_USER*)malloc(dwSize);
GetTokenInformation(hToken, TokenUser, pUser, dwSize, &dwSize);
// pUser->User.Sid が SID
```

> **ポイント**  
> - Windows のアクセストークンは「**プロセスに自動的に付与**」され、アプリ側で明示的に送信する必要はない（ローカルリソースへのアクセスチェック時に OS が内部で使用）。  
> - クラウドサービス (Azure AD) に対しては **OAuth2 / JWT** が別途発行される。

---

# 4️⃣ Windows の認証トークン

## 4.1 ローカルログオン（NTLM・Kerberos）とアクセストークンの流れ

```
[ユーザー] ──► (入力) ──► LSA (Logon Process)
      │                │
   パスワード          ▼
      │            Kerberos TGT (KDC)
      │                │
      ▼                ▼
  NTLM Challenge   Service Ticket
      │                │
      ▼                ▼
  アクセストークン(プロセス) ──► OS がリソースアクセス時に評価
```

1. **ユーザー入力** → LSA (Local Security Authority) が認証方式を決定。  
2. **Kerberos**: KDC（Domain Controller）から TGT を取得し、必要なサービスごとに Service Ticket を取得。  
3. **NTLM**: Challenge/Response のやり取りで認証が完了。  
4. 認証成功 → **Windows アクセストークン** が生成され、プロセスの `Token` ハンドルとして保持。  

### 重要な概念
- **Ticket Granting Ticket (TGT)** は暗号化された「ユーザーの認証情報」。有効期限はデフォルトで 7〜10 日（Renewable）。  
- **Service Ticket** は特定サービス (例: `cifs/server.example.com`) 用。取得時に TGT が使用され、期限は数分〜数時間。  
- **Kerberos の相互認証** により、サーバー側もクライアントを検証できる。

## 4.2 Azure AD と Microsoft Identity Platform（クラウド版）

| 項目 | 内容 |
|------|------|
| 発行元 | Azure Active Directory (テナント) |
| プロトコル | OAuth 2.0 + OpenID Connect |
| トークンタイプ | **Access Token** (JWT)、**Refresh Token**、**ID Token** |
| 取得フロー例 | Authorization Code Flow, Client