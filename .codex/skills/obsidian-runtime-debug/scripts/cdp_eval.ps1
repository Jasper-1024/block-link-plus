#!/usr/bin/env pwsh

[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Expression,

  [string]$CdpHost = '127.0.0.1',
  [int]$Port = 9222,

  # Provide this to skip target selection.
  [string]$WsUrl,

  # Used when -WsUrl is not provided.
  [string]$TargetTitleRegex,
  [string]$TargetUrlRegex,
  [string]$TargetType = 'page',

  [bool]$AwaitPromise = $false,
  [bool]$ReturnByValue = $true,
  [bool]$IncludeCommandLineAPI = $true,
  [bool]$Silent = $false,

  [switch]$RawResponse
)

. "$PSScriptRoot/cdp_common.ps1"

$targets = Get-CdpTargets -CdpHost $CdpHost -Port $Port
$target = Select-CdpTarget -Targets $targets -WsUrl $WsUrl -TargetTitleRegex $TargetTitleRegex -TargetUrlRegex $TargetUrlRegex -TargetType $TargetType

$ws = Connect-CdpWebSocket -WsUrl $target.webSocketDebuggerUrl
try {
  $params = @{
    expression = $Expression
    awaitPromise = $AwaitPromise
    returnByValue = $ReturnByValue
    includeCommandLineAPI = $IncludeCommandLineAPI
    silent = $Silent
  }

  $resp = Invoke-CdpMethod -WebSocket $ws -Method 'Runtime.evaluate' -Params $params

  if ($resp.error) {
    throw ("CDP Runtime.evaluate error: " + ($resp.error | ConvertTo-Json -Depth 100 -Compress))
  }

  if ($RawResponse) {
    $resp | ConvertTo-Json -Depth 100
    exit 0
  }

  # Typical successful path: resp.result.result.value is present when returnByValue=true.
  $value = $resp.result.result.value
  if ($null -ne $value) {
    $value
    exit 0
  }

  # Fallback: print the evaluated RemoteObject (type, description, objectId, preview, etc).
  $resp.result.result | ConvertTo-Json -Depth 100
} finally {
  Disconnect-CdpWebSocket -WebSocket $ws
}
