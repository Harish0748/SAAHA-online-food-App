<#
PowerShell firewall script to block external access to Postgres and other internal ports.
Run as Administrator.
Usage: Right-click PowerShell -> Run as Administrator, then:
  \> .\windows-firewall.ps1
#>

Write-Host "Adding firewall rule to block external inbound on TCP 5432 (Postgres)"

try {
  New-NetFirewallRule -DisplayName "Block Postgres external" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Block -Profile Any -EdgeTraversalPolicy Block -ErrorAction Stop
  Write-Host "Rule added: Block Postgres external"
} catch {
  Write-Host "Failed to add rule or rule already exists: $_"
}

Write-Host "To remove the rule later, run: Remove-NetFirewallRule -DisplayName 'Block Postgres external'"
