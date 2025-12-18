terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }

  backend "local" {}
}

provider "azurerm" {
  features {}
}

/* ---------- Resource Group ---------- */
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

/* ---------- Storage Account (Azure Files) ---------- */
resource "azurerm_storage_account" "sa" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  allow_blob_public_access = false
}

resource "azurerm_storage_share" "glossary_share" {
  name                 = "glossarydata"
  storage_account_name = azurerm_storage_account.sa.name
  quota                = 5120 # MB
}

/* ---------- Azure Container Registry ---------- */
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = false
}

/* ---------- App Service Plan (Linux) ---------- */
resource "azurerm_service_plan" "asp" {
  name                = var.app_service_plan_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku_name            = "B1"
  os_type             = "Linux"
}

/* ---------- Managed Identities ---------- */
resource "azurerm_user_assigned_identity" "api_id" {
  name                = "${var.api_web_app_name}-mi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

resource "azurerm_user_assigned_identity" "frontend_id" {
  name                = "${var.frontend_web_app_name}-mi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

/* ---------- API Web App (Container) ---------- */
resource "azurerm_linux_web_app" "api_app" {
  name                = var.api_web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.asp.id

  site_config {
    linux_fx_version = "DOCKER|${azurerm_container_registry.acr.login_server}/glossary-api:${var.image_tag}"
    # Mount Azure Files
    azure_storage_accounts {
      name       = azurerm_storage_account.sa.name
      access_key = azurerm_storage_account.sa.primary_access_key
      share_name = azurerm_storage_share.glossary_share.name
      mount_path = "/data"
    }
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api_id.id]
  }

  app_settings = {
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "true"
    FILE_STORAGE_ROOT                    = "/data"
    DATABASE_URL                         = var.database_url
    AZURE_AD_TENANT_ID                   = var.azure_ad_tenant_id
    AZURE_AD_CLIENT_ID                   = var.azure_ad_client_id
  }
}

/* ---------- Frontend Web App (Container) ---------- */
resource "azurerm_linux_web_app" "frontend_app" {
  name                = var.frontend_web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.asp.id

  site_config {
    linux_fx_version = "DOCKER|${azurerm_container_registry.acr.login_server}/glossary-frontend:${var.image_tag}"
    azure_storage_accounts {
      name       = azurerm_storage_account.sa.name
      access_key = azurerm_storage_account.sa.primary_access_key
      share_name = azurerm_storage_share.glossary_share.name
      mount_path = "/data"
    }
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.frontend_id.id]
  }

  app_settings = {
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "true"
    FILE_STORAGE_ROOT                    = "/data"
    API_BASE_URL                         = "https://${azurerm_linux_web_app.api_app.default_hostname}/api"
    AZURE_AD_TENANT_ID                  = var.azure_ad_tenant_id
    AZURE_AD_CLIENT_ID                  = var.azure_ad_client_id
  }
}

/* ---------- ACR Pull Role Assignments ---------- */
resource "azurerm_role_assignment" "api_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.api_id.principal_id
}

resource "azurerm_role_assignment" "frontend_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.frontend_id.principal_id
}
