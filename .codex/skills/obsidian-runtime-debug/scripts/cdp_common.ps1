<# 
Minimal Chrome DevTools Protocol (CDP) helpers for PowerShell.

This intentionally avoids external dependencies (no npm/pip) by using:
- Invoke-RestMethod for http://127.0.0.1:9222/json
- System.Net.WebSockets.ClientWebSocket for the CDP websocket
#>

$script:CdpNextId = 1

function Get-CdpTargets {
  [CmdletBinding()]
  param(
    [string]$CdpHost = '127.0.0.1',
    [int]$Port = 9222
  )

  $uri = "http://$CdpHost`:$Port/json"
  try {
    $targets = Invoke-RestMethod -Uri $uri -Method Get
  } catch {
    throw "Failed to query CDP targets at $uri. Is Obsidian running with remote debugging enabled? $($_.Exception.Message)"
  }

  if ($null -eq $targets) { return @() }
  if ($targets -isnot [System.Array]) { return @($targets) }
  return $targets
}

function Select-CdpTarget {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [object[]]$Targets,

    [string]$WsUrl,
    [string]$TargetTitleRegex,
    [string]$TargetUrlRegex,
    [string]$TargetType = 'page'
  )

  if ($WsUrl) {
    return [pscustomobject]@{
      webSocketDebuggerUrl = $WsUrl
      title = '(provided by -WsUrl)'
      url = ''
      type = $TargetType
      id = ''
    }
  }

  $filtered = $Targets
  if ($TargetType) {
    $filtered = $filtered | Where-Object { $_.type -eq $TargetType }
  }
  if ($TargetTitleRegex) {
    $filtered = $filtered | Where-Object { $_.title -match $TargetTitleRegex }
  }
  if ($TargetUrlRegex) {
    $filtered = $filtered | Where-Object { $_.url -match $TargetUrlRegex }
  }

  $filtered = @($filtered)
  if ($filtered.Count -eq 0) {
    $hint = @()
    if ($TargetType) { $hint += "type=$TargetType" }
    if ($TargetTitleRegex) { $hint += "title~/$TargetTitleRegex/" }
    if ($TargetUrlRegex) { $hint += "url~/$TargetUrlRegex/" }
    $hintText = if ($hint.Count) { " (" + ($hint -join ', ') + ")" } else { '' }
    throw "No CDP targets matched$hintText. Run cdp_list_targets.ps1 and refine the regex or pass -WsUrl."
  }

  if ($filtered.Count -gt 1) {
    $preview = $filtered |
      Select-Object -First 10 |
      ForEach-Object { "title='$($_.title)' url='$($_.url)' ws='$($_.webSocketDebuggerUrl)'" }
    $previewText = $preview -join "`n"
    throw "Multiple CDP targets matched. Refine -TargetTitleRegex/-TargetUrlRegex or pass -WsUrl. Matches:`n$previewText"
  }

  return $filtered[0]
}

function Connect-CdpWebSocket {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [string]$WsUrl
  )

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  try {
    $ws.ConnectAsync([Uri]$WsUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  } catch {
    $ws.Dispose()
    throw "Failed to connect to CDP websocket: $WsUrl. $($_.Exception.Message)"
  }
  return $ws
}

function Disconnect-CdpWebSocket {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [System.Net.WebSockets.ClientWebSocket]$WebSocket
  )

  try {
    if ($WebSocket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $WebSocket.CloseAsync(
        [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
        'done',
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult() | Out-Null
    }
  } catch {
    # Best effort.
  } finally {
    $WebSocket.Dispose()
  }
}

function Receive-CdpMessageText {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [System.Net.WebSockets.ClientWebSocket]$WebSocket
  )

  $buffer = New-Object byte[] 8192
  $sb = New-Object System.Text.StringBuilder

  while ($true) {
    $segment = [ArraySegment[byte]]::new($buffer)
    $result = $WebSocket.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
      throw "CDP websocket closed by peer."
    }
    $chunk = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    $null = $sb.Append($chunk)
    if ($result.EndOfMessage) { break }
  }

  return $sb.ToString()
}

function Invoke-CdpMethod {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [System.Net.WebSockets.ClientWebSocket]$WebSocket,

    [Parameter(Mandatory)]
    [string]$Method,

    [object]$Params
  )

  $id = $script:CdpNextId
  $script:CdpNextId++

  $msg = @{ id = $id; method = $Method }
  if ($null -ne $Params) { $msg.params = $Params }

  $json = $msg | ConvertTo-Json -Depth 100 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $segment = [ArraySegment[byte]]::new($bytes)

  $WebSocket.SendAsync(
    $segment,
    [System.Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [Threading.CancellationToken]::None
  ).GetAwaiter().GetResult() | Out-Null

  while ($true) {
    $respText = Receive-CdpMessageText -WebSocket $WebSocket
    # Windows PowerShell 5.1 does not support ConvertFrom-Json -Depth.
    $resp = $respText | ConvertFrom-Json

    # Ignore event messages; return the matching response.
    if ($null -ne $resp.id -and [int]$resp.id -eq $id) {
      return $resp
    }
  }
}
