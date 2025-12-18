variable "location" {
  type    = string
  default = "East US"
}

variable "resource_group_name" {
  type    = string
  default = "glossary-rg"
}

variable "acr_name" {
  description = "Globally unique Azure Container Registry name"
  type        = string
}

variable "app_service_plan_name" {
  type    = string
  default = "glossary-asp"
}

variable "api_web_app_name" {
  type    = string
  default = "glossary-api-app"
}

variable "frontend_web_app_name" {
  type    = string
  default = "glossary-web-app"
}

variable "storage_account_name" {
  description = "Must be globally unique (lowercase, alphanumeric, 3‑24 chars)"
  type        = string
}

/* Secrets / runtime values – pass via TF_VAR_ env vars or -var arguments */
variable "database_url" {
  type      = string
  sensitive = true
}
variable "azure_ad_tenant_id" { type = string }
variable "azure_ad_client_id"   { type = string }
variable "image_tag" {
  description = "Docker image tag to deploy (e.g. git SHA)"
  type        = string
}
