# Setup Prerequisites
Add-Type -AssemblyName System.Web
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

enum RecordType {
  Weapon
  Character
}

function Get-AKERecords {
  [CmdletBinding()]
  param (
    [RecordType]$Type = "Weapon", 

    [Parameter(Mandatory)]
    [string]$Token, 

    [Parameter(Mandatory)]
    [string]$ServerID
  )

  $reqQuery = @{
    'lang'      = 'en-us'
    'token'     = $Token
    'server_id' = $ServerID
  }

  $rdata = @()

  # Now grab pull data
  Write-Host "`nGrabbing data for $($Type.ToString())"

  if ($Type -eq 0) {
    $uriBuilder = [System.UriBuilder]"https://ef-webview.gryphline.com/api/record/weapon"
    $pools = @('weap123')
  } else {
    # Character banners require a pool type. We grab the pool type first
    $uriBuilder = [System.UriBuilder]"https://ef-webview.gryphline.com/api/record/char"
    try {
      Invoke-WebRequest -Uri "https://ef-webview.gryphline.com/api/record/char?lang=en-us&token=A&server_id=$ServerID" -UserAgent "Mozilla/5.0" -ErrorAction SilentlyContinue -UseBasicParsing
    }
    catch {
      # Different way to do it based on Powershell version
      if ($PSVersionTable.PSVersion.Major -lt 6) {
        # For Windows PowerShell < 6
        $stream = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $stream.BaseStream.Position = 0
        if (($stream.ReadToEnd() | ConvertFrom-Json).message[-1] -match 'values:\s*(.+)') {
          $pools = $Matches[1] -split ',\s*'
        } else {
          $pools = @()
        }
        $stream.Close()
      }
      else {
        # For PowerShell Core/7+
        if ((ConvertFrom-Json $_).message[-1] -match 'values:\s*(.+)') {
          $pools = $Matches[1] -split ',\s*'
        } else {
          $pools = @()
        }
      }
    }
    
  }

  foreach ($pl in $pools) {
    if ($pl -ne 'weap123') {
      $reqQuery["pool_type"] = $pl
    }
    $seq = 0 # Seq number for next page

    while($true) {
      if ($Type -eq 0) {
        Write-Host "    Seq $seq"
      } else {
        Write-Host "    Seq $seq pool $pl"
      }
      
      # Cleanup sequence ID
      if ($seq -ne 0) {
        $reqQuery["seq_id"] = $seq
      } else {
        $reqQuery.Remove("seq_id")
      }

      $sq = [System.Web.HttpUtility]::ParseQueryString([String]::Empty)
      foreach ($key in $reqQuery.Keys) {
        $sq.Add($key, $reqQuery.$key)
      }
      $uriBuilder.Query = $sq.ToString()
      $resp = Invoke-WebRequest -Uri $uriBuilder.Uri.OriginalString -UserAgent "Mozilla/5.0" -UseBasicParsing
      $respJson = $resp | ConvertFrom-Json
      
      $rdata += $respJson.data.list

      if (-not $respJson.data.hasMore) {
        if ($seq -gt 6) {
          if ($Type -eq 0) {
            Write-Host "`nWARNING: $($Type.ToString()) banner has more data before the end of sequence. Some pull data has been deleted. This can be normal, but if this is the first time you run this script, know that some pull data has been lost." -ForegroundColor Yellow
          } else {
            Write-Host "`nWARNING: $($Type.ToString()) banner and $pl pool has no more data before the end of sequence. Some pull data has been deleted. This can be normal, but if this is the first time you run this script, know that some pull data has been lost." -ForegroundColor Yellow
          }
        }
        break
      }

      $seq = $respJson.data.list[-1].seqId

      Start-Sleep -Milliseconds 250
    }
  }

  return $rdata
}

# Load file at this location
# $FilePath = $env:LOCALAPPDATA + "Low\Gryphline\Endfield\sdklogs\HGWebview.log"
$FilePath = $env:LOCALAPPDATA + "\PlatformProcess\Cache\data_1"

# Validate file exists
if (-not (Test-Path -Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

$lines = Get-Content -Path $FilePath
[array]::Reverse($lines)

# Regex to match a URL with a query string
$urlPattern = 'https?://ef-webview.gryphline.com/api/record[^\s"''<>{}\0]+\?[^\s"''<>{}\0]+'

$found = $false

foreach ($line in $lines) {
  $match = [regex]::Match($line, $urlPattern)

  if (-not $match.Success) {
    continue
  }

  $fullUrl = $match.Value
  Write-Host "`nURL Found:" -ForegroundColor Green
  Write-Host "  $fullUrl" -ForegroundColor Cyan

  # Get query string
  $uri = [System.Uri]$fullUrl
  $queryString = $uri.Query.TrimStart('?')
  $params = [System.Web.HttpUtility]::ParseQueryString($queryString)

  $data = @{
    'weapons'      = $()
    'characters'  = $()
  }

  # Get token and server from query string
  $data.weapons = Get-AKERecords -Type Weapon -Token $params["token"] -ServerID $params["server_id"]
  $data.characters = Get-AKERecords -Type Character -Token $params["token"] -ServerID $params["server_id"]

  $data | ConvertTo-Json -Compress | Out-File -FilePath "./akerecord.json"

  Write-Host "`nDone! Record saved to $($PWD.Path + "/akerecord.json")" -ForegroundColor Green

  $found = $true
  break
}

if (-not $found) {
  Write-Host "`nNo URL found. Make sure that you have opened the in-game pull history at least once today." -ForegroundColor Red
}