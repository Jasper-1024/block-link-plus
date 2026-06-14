#!/usr/bin/env pwsh

[CmdletBinding()]
param(
  [string]$CdpHost = '127.0.0.1',
  [int]$Port = 9222,
  [switch]$PassThru
)

. "$PSScriptRoot/cdp_common.ps1"

$targets = Get-CdpTargets -CdpHost $CdpHost -Port $Port

$rows = @()
$i = 0
foreach ($t in $targets) {
  $rows += [pscustomobject]@{
    Index = $i
    Type  = $t.type
    Title = $t.title
    Url   = $t.url
    WsUrl = $t.webSocketDebuggerUrl
    Id    = $t.id
  }
  $i++
}

if ($PassThru) {
  $rows
  exit 0
}

$rows | Format-Table -AutoSize
