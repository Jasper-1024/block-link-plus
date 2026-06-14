#!/usr/bin/env pwsh

[CmdletBinding(DefaultParameterSetName = 'Inline')]
param(
  [Parameter(Mandatory)]
  [string]$Method,

  [Parameter(ParameterSetName = 'Inline')]
  [string]$ParamsJson,

  [Parameter(ParameterSetName = 'File')]
  [string]$ParamsFile,

  [string]$CdpHost = '127.0.0.1',
  [int]$Port = 9222,

  [string]$WsUrl,
  [string]$TargetTitleRegex,
  [string]$TargetUrlRegex,
  [string]$TargetType = 'page',

  [switch]$RawResponse
)

. "$PSScriptRoot/cdp_common.ps1"

$targets = Get-CdpTargets -CdpHost $CdpHost -Port $Port
$target = Select-CdpTarget -Targets $targets -WsUrl $WsUrl -TargetTitleRegex $TargetTitleRegex -TargetUrlRegex $TargetUrlRegex -TargetType $TargetType

$paramsObj = $null
if ($PSCmdlet.ParameterSetName -eq 'File') {
  if (-not (Test-Path -LiteralPath $ParamsFile)) {
    throw "ParamsFile not found: $ParamsFile"
  }
  $ParamsJson = Get-Content -LiteralPath $ParamsFile -Raw
}
if ($ParamsJson) {
  # Windows PowerShell 5.1 does not support ConvertFrom-Json -Depth.
  $paramsObj = $ParamsJson | ConvertFrom-Json
}

$ws = Connect-CdpWebSocket -WsUrl $target.webSocketDebuggerUrl
try {
  $resp = Invoke-CdpMethod -WebSocket $ws -Method $Method -Params $paramsObj

  if ($resp.error) {
    throw ("CDP error for '$Method': " + ($resp.error | ConvertTo-Json -Depth 100 -Compress))
  }

  if ($RawResponse) {
    $resp | ConvertTo-Json -Depth 100
    exit 0
  }

  if ($null -ne $resp.result) {
    $resp.result | ConvertTo-Json -Depth 100
    exit 0
  }

  $resp | ConvertTo-Json -Depth 100
} finally {
  Disconnect-CdpWebSocket -WebSocket $ws
}
