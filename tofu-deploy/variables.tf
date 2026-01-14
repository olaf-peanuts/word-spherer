variable "target_host" {
  description = "192.168.11.131"
  type        = string
}

variable "ssh_user" {
  description = "noguchi"
  type        = string
}

variable "ssh_private_key_path" {
  description = "/home/noguchi/.ssh/id_ed25519_olaf133-noguchi"
  type        = string
}

variable "deploy_public_key" {
  description = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMTPkP+bah2hw3U7oTYMQoScSSR8Lz3iiWyBImQJrfd2 deploy@olaf131"
  type        = string
}
