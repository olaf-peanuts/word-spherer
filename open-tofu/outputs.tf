output "api_url" {
  value = "https://${azurerm_linux_web_app.api_app.default_hostname}"
}

output "frontend_url" {
  value = "https://${azurerm_linux_web_app.frontend_app.default_hostname}"
}
