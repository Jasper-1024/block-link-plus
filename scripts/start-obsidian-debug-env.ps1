<#
.SYNOPSIS
Starts a fresh, isolated Obsidian instance for BLP CDP debugging.

.DESCRIPTION
The script creates a disposable Obsidian profile and a disposable vault,
links the current repo as the Block Link Plus plugin, starts Obsidian with
a high remote-debugging port, enables community plugins through CDP, and
prints a JSON context object for follow-up CDP commands.
#>
[CmdletBinding()]
param(
	[int]$Port = 0,
	[int]$MinPort = 19225,
	[string]$VaultName = "blp",
	[string]$Root = "",
	[string]$ObsidianExe = $env:OBSIDIAN_EXE,
	[int]$TimeoutSec = 45
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$CdpScript = Join-Path $RepoRoot "scripts\obsidian-cdp.js"

function Write-Utf8NoBom {
	param(
		[Parameter(Mandatory = $true)][string]$Path,
		[Parameter(Mandatory = $true)][string]$Content
	)
	$Encoding = New-Object System.Text.UTF8Encoding($false)
	[System.IO.File]::WriteAllText($Path, $Content, $Encoding)
}

function Test-PortFree {
	param([Parameter(Mandatory = $true)][int]$Candidate)
	$Listener = $null
	try {
		$Address = [System.Net.IPAddress]::Parse("127.0.0.1")
		$Listener = New-Object System.Net.Sockets.TcpListener($Address, $Candidate)
		$Listener.Start()
		return $true
	} catch {
		return $false
	} finally {
		if ($Listener) {
			$Listener.Stop()
		}
	}
}

function Resolve-DebugPort {
	param([int]$RequestedPort, [int]$StartPort)
	if ($RequestedPort -gt 0) {
		if (-not (Test-PortFree -Candidate $RequestedPort)) {
			throw "Requested CDP port $RequestedPort is already in use."
		}
		return $RequestedPort
	}

	for ($Candidate = $StartPort; $Candidate -lt ($StartPort + 200); $Candidate++) {
		if (Test-PortFree -Candidate $Candidate) {
			return $Candidate
		}
	}

	throw "No free CDP port found from $StartPort to $($StartPort + 199)."
}

function Resolve-ObsidianPath {
	param([string]$Preferred)
	if ($Preferred) {
		if (Test-Path -LiteralPath $Preferred) {
			return (Resolve-Path -LiteralPath $Preferred).Path
		}
		throw "OBSIDIAN_EXE/ObsidianExe path does not exist: $Preferred"
	}

	$Command = Get-Command obsidian.exe -ErrorAction SilentlyContinue
	if ($Command -and $Command.Path) {
		$ShimPath = [System.IO.Path]::ChangeExtension($Command.Path, ".shim")
		if (Test-Path -LiteralPath $ShimPath) {
			$ShimText = Get-Content -LiteralPath $ShimPath -Raw
			if ($ShimText -match 'path\s*=\s*"([^"]+)"') {
				$Resolved = $Matches[1]
				if (Test-Path -LiteralPath $Resolved) {
					return (Resolve-Path -LiteralPath $Resolved).Path
				}
			}
		}
		return $Command.Path
	}

	$ScoopPath = Join-Path $env:USERPROFILE "scoop\apps\obsidian\current\obsidian.exe"
	if (Test-Path -LiteralPath $ScoopPath) {
		return (Resolve-Path -LiteralPath $ScoopPath).Path
	}

	throw "Could not find Obsidian. Set OBSIDIAN_EXE or pass -ObsidianExe."
}

function New-HexId {
	$Bytes = New-Object byte[] 8
	[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($Bytes)
	return (($Bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}

function New-PluginDirectoryLink {
	param(
		[Parameter(Mandatory = $true)][string]$LinkPath,
		[Parameter(Mandatory = $true)][string]$TargetPath
	)
	if (Test-Path -LiteralPath $LinkPath) {
		Remove-Item -LiteralPath $LinkPath -Recurse -Force
	}

	try {
		New-Item -ItemType SymbolicLink -Path $LinkPath -Target $TargetPath -Force | Out-Null
		return "SymbolicLink"
	} catch {
		New-Item -ItemType Junction -Path $LinkPath -Target $TargetPath -Force | Out-Null
		return "Junction"
	}
}

function Wait-HttpJson {
	param(
		[Parameter(Mandatory = $true)][string]$Uri,
		[int]$TimeoutSec = 30
	)
	$Deadline = (Get-Date).AddSeconds($TimeoutSec)
	$LastError = $null
	do {
		try {
			return Invoke-RestMethod -Uri $Uri -TimeoutSec 1
		} catch {
			$LastError = $_
			Start-Sleep -Milliseconds 500
		}
	} while ((Get-Date) -lt $Deadline)

	throw "Timed out waiting for $Uri. Last error: $LastError"
}

function Invoke-ObsidianCdp {
	param([Parameter(Mandatory = $true)][string[]]$Arguments)
	$OldPort = $env:OB_CDP_PORT
	$OldUrl = $env:OB_CDP_URL_CONTAINS
	$OldTitle = $env:OB_CDP_TITLE_CONTAINS
	try {
		$env:OB_CDP_PORT = [string]$script:Port
		$env:OB_CDP_URL_CONTAINS = "app://obsidian.md/index.html"
		$env:OB_CDP_TITLE_CONTAINS = ""
		$Output = & node $script:CdpScript @Arguments 2>&1
		if ($LASTEXITCODE -ne 0) {
			throw "obsidian-cdp.js $($Arguments -join ' ') failed: $($Output -join "`n")"
		}
		return ($Output -join "`n")
	} finally {
		$env:OB_CDP_PORT = $OldPort
		$env:OB_CDP_URL_CONTAINS = $OldUrl
		$env:OB_CDP_TITLE_CONTAINS = $OldTitle
	}
}

function Invoke-ObsidianEval {
	param([Parameter(Mandatory = $true)][string]$Expression)
	$EvalPath = Join-Path $script:EvalDir ("eval-" + [Guid]::NewGuid().ToString("N") + ".js")
	Write-Utf8NoBom -Path $EvalPath -Content $Expression
	return Invoke-ObsidianCdp -Arguments @("eval-file", $EvalPath)
}

function Wait-ObsidianApp {
	param([int]$TimeoutSec = 45)
	$Expression = @'
(() => {
  if (typeof app === "undefined" || !app.vault) {
    return { ready: false, title: document.title, href: location.href };
  }
  return {
    ready: true,
    title: document.title,
    href: location.href,
    vaultName: app.vault.getName(),
    vaultBasePath: app.vault.adapter && app.vault.adapter.basePath,
    activeFile: app.workspace.getActiveFile() && app.workspace.getActiveFile().path
  };
})()
'@
	$Deadline = (Get-Date).AddSeconds($TimeoutSec)
	$LastError = $null
	do {
		try {
			$Text = Invoke-ObsidianEval -Expression $Expression
			$State = $Text | ConvertFrom-Json
			if ($State.ready -and $State.vaultName -eq $script:VaultName) {
				return $State
			}
		} catch {
			$LastError = $_
		}
		Start-Sleep -Milliseconds 750
	} while ((Get-Date) -lt $Deadline)

	throw "Timed out waiting for Obsidian vault '$script:VaultName' on CDP port $script:Port. Last error: $LastError"
}

function Enable-BlockLinkPlus {
	$Expression = @'
(async () => {
  const pluginId = "block-link-plus";
  const startFile = "_debug/start.md";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const result = { loadError: null, openError: null };

  try {
    if (!app.plugins.isEnabled()) {
      await app.plugins.setEnable(true);
    } else if (!app.plugins.plugins[pluginId]) {
      await app.plugins.loadPlugin(pluginId);
    }
  } catch (e) {
    result.loadError = {
      name: e && e.name,
      message: e && e.message,
      stack: e && String(e.stack || "").slice(0, 2000)
    };
  }

  for (let i = 0; i < 40 && !app.plugins.plugins[pluginId]; i++) {
    await sleep(250);
  }

  try {
    await app.workspace.openLinkText(startFile, "", true);
  } catch (e) {
    result.openError = e && e.message;
  }

  const plugin = app.plugins.plugins[pluginId];
  return {
    title: document.title,
    vaultName: app.vault.getName(),
    vaultBasePath: app.vault.adapter && app.vault.adapter.basePath,
    activeFile: app.workspace.getActiveFile() && app.workspace.getActiveFile().path,
    appId: app.appId,
    communityPluginsEnabled: app.plugins.isEnabled(),
    loadedPluginIds: Object.keys(app.plugins.plugins).sort(),
    blockLinkPlusEnabled: app.plugins.enabledPlugins.has(pluginId),
    blockLinkPlusLoaded: !!plugin,
    blockLinkPlusVersion: plugin && plugin.manifest && plugin.manifest.version,
    blockLinkPlusDir: plugin && plugin.manifest && plugin.manifest.dir,
    loadError: result.loadError,
    openError: result.openError
  };
})()
'@
	$Text = Invoke-ObsidianEval -Expression $Expression
	return ($Text | ConvertFrom-Json)
}

$script:Port = Resolve-DebugPort -RequestedPort $Port -StartPort $MinPort
$script:VaultName = $VaultName
$ObsidianPath = Resolve-ObsidianPath -Preferred $ObsidianExe

if (-not $Root) {
	$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
	$Root = Join-Path ([System.IO.Path]::GetTempPath()) "blp-obsidian-debug\$Stamp-p$script:Port"
}

$Root = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Root)
$ProfilePath = Join-Path $Root "profile"
$VaultPath = Join-Path (Join-Path $Root "vault") $VaultName
$script:EvalDir = Join-Path $Root "_cdp-eval"
$ObsidianDir = Join-Path $VaultPath ".obsidian"
$PluginsDir = Join-Path $ObsidianDir "plugins"
$PluginLink = Join-Path $PluginsDir "block-link-plus"
$StartNotePath = Join-Path $VaultPath "_debug\start.md"

New-Item -ItemType Directory -Force -Path $ProfilePath, $VaultPath, $script:EvalDir, $ObsidianDir, $PluginsDir, (Split-Path -Parent $StartNotePath) | Out-Null

$PluginLinkType = New-PluginDirectoryLink -LinkPath $PluginLink -TargetPath $RepoRoot

Write-Utf8NoBom -Path (Join-Path $ObsidianDir "app.json") -Content "{}"
Write-Utf8NoBom -Path (Join-Path $ObsidianDir "appearance.json") -Content "{}"
Write-Utf8NoBom -Path (Join-Path $ObsidianDir "community-plugins.json") -Content '["block-link-plus"]'
Write-Utf8NoBom -Path $StartNotePath -Content @"
# BLP CDP Debug

This vault is disposable. The Block Link Plus plugin directory is linked to:

$RepoRoot
"@

$VaultId = New-HexId
$UnixMs = [int64](([DateTime]::UtcNow - [DateTime]"1970-01-01T00:00:00Z").TotalMilliseconds)
$ProfileConfig = [ordered]@{
	vaults = [ordered]@{
		$VaultId = [ordered]@{
			path = $VaultPath
			ts = $UnixMs
			open = $true
		}
	}
	cli = $true
}
Write-Utf8NoBom -Path (Join-Path $ProfilePath "obsidian.json") -Content ($ProfileConfig | ConvertTo-Json -Depth 8 -Compress)

$Arguments = @(
	"--remote-debugging-port=$script:Port",
	"--user-data-dir=""$ProfilePath""",
	"vault=$VaultName"
)
$Process = Start-Process -FilePath $ObsidianPath -ArgumentList $Arguments -PassThru

Wait-HttpJson -Uri "http://127.0.0.1:$script:Port/json/version" -TimeoutSec $TimeoutSec | Out-Null
Wait-ObsidianApp -TimeoutSec $TimeoutSec | Out-Null
$Runtime = Enable-BlockLinkPlus

$Result = [ordered]@{
	status = if ($Runtime.blockLinkPlusLoaded) { "ready" } else { "plugin-not-loaded" }
	port = $script:Port
	processId = $Process.Id
	obsidianExe = $ObsidianPath
	root = $Root
	profilePath = $ProfilePath
	vaultPath = $VaultPath
	pluginLinkPath = $PluginLink
	pluginLinkType = $PluginLinkType
	repoRoot = $RepoRoot
	cdp = [ordered]@{
		host = "127.0.0.1"
		port = $script:Port
		env = [ordered]@{
			OB_CDP_PORT = [string]$script:Port
			OB_CDP_URL_CONTAINS = "app://obsidian.md/index.html"
			OB_CDP_TITLE_CONTAINS = " - $VaultName - "
		}
		listCommand = "`$env:OB_CDP_PORT='$script:Port'; node scripts/obsidian-cdp.js list"
	}
	runtime = $Runtime
}

$Result | ConvertTo-Json -Depth 12
