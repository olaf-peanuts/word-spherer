terraform {
  required_providers {
    null = {
      source  = "registry.terraform.io/hashicorp/null"
      version = "3.2.4"
    }
    # remote-exec は null_resource 内で使うため provider は null だけでOK
  }
}

provider "null" {}

# ------------------------------
# deploy ユーザーを作成
# ------------------------------
resource "null_resource" "create_deploy_user" {
  # SSH 接続情報
  connection {
    type        = "ssh"
    host        = var.target_host
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    agent       = true
  }

  # コマンド実行
  provisioner "remote-exec" {
    inline = [
      # deploy ユーザーが存在すれば削除してクリーンに（古い設定を rm）
      "sudo deluser --remove-home deploy || true",

      # deploy ユーザーを作成
      "sudo useradd -m -s /bin/bash deploy",

      # deploy ユーザーのホームに .ssh ディレクトリ作成
      "sudo mkdir -p /home/deploy/.ssh",
      "sudo chmod 700 /home/deploy/.ssh",
      "sudo chown deploy:deploy /home/deploy/.ssh",

      # deploy ユーザー用公開鍵を書き込み
      "echo '${var.deploy_public_key}' | sudo tee /home/deploy/.ssh/authorized_keys > /dev/null",
      "sudo chmod 600 /home/deploy/.ssh/authorized_keys",
      "sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys"
    ]
  }
}

# ------------------------------
# Docker を安全にセットアップ
# ------------------------------
resource "null_resource" "install_docker" {
  depends_on = [null_resource.create_deploy_user]

  connection {
    type        = "ssh"
    host        = var.target_host
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    agent       = true
  }

  provisioner "remote-exec" {
    inline = [
      # 古い GPG キーがあれば削除
      "sudo rm -f /etc/apt/keyrings/docker.gpg",

      # 古いリポジトリ設定を削除
      "sudo rm -f /etc/apt/sources.list.d/docker.list",

      # 必要なパッケージを更新・インストール
      "sudo apt-get update",
      "sudo apt-get install -y ca-certificates curl gnupg lsb-release",

      # Docker の公式 GPG キーを取得
      "sudo mkdir -p /etc/apt/keyrings",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg",

      # Docker リポジトリを作成
      "echo \"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null",

      # 更新して Docker をインストール
      "sudo apt-get update",
      "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",

      # deploy ユーザーを docker グループに追加
      "sudo usermod -aG docker deploy",

      # Docker サービスを有効化
      "sudo systemctl enable docker",
      "sudo systemctl start docker"
    ]
  }
}
