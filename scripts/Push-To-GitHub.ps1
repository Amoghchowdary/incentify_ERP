param(
  [Parameter(Mandatory=$true)][string]$RepositoryUrl,
  [string]$CloneFolder = "",
  [string]$CommitMessage = "Deploy INCENTIFY ERP V10 web application"
)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $CloneFolder) { $CloneFolder = Join-Path (Split-Path $source -Parent) 'Deployment_Folder\INCENTIFY_ERP_Git_Deploy' }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (!(Test-Path (Join-Path $CloneFolder '.git'))) {
  if (Test-Path $CloneFolder) { throw "Clone folder already exists without .git: $CloneFolder" }
  New-Item -ItemType Directory -Force -Path (Split-Path $CloneFolder -Parent) | Out-Null
  & git clone $RepositoryUrl $CloneFolder
  if ($LASTEXITCODE -ne 0) { throw 'Git clone failed.' }
}
Push-Location $CloneFolder
try {
  if ((& git status --porcelain)) { throw 'Deployment clone has uncommitted changes. Commit or stash before proceeding.' }
  $configuredRemote = (& git remote get-url origin).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Git remote origin was not found.' }
  if ($configuredRemote.TrimEnd('/') -ne $RepositoryUrl.TrimEnd('/')) { throw "Existing clone points to a different origin: $configuredRemote" }
  & git show-ref --verify --quiet refs/heads/main
  if ($LASTEXITCODE -eq 0) {
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'Git pull --ff-only failed. Resolve remote conflicts without force push.' }
  } else {
    & git checkout -B main
    if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize main branch in empty clone.' }
  }
  $items = @('index.html','admin-login.html','sales-login.html','admin.html','erp.html','404.html','.nojekyll','.gitignore','.env.example','package.json','vite.config.mjs','README.md','docs','assets','css','js','scripts','.github')
  foreach ($item in $items) {
    $from=Join-Path $source $item
    if (!(Test-Path $from)) { throw "Missing release file: $item" }
    $to=Join-Path $CloneFolder $item
    if (Test-Path $from -PathType Container) {
      New-Item -ItemType Directory -Force -Path $to | Out-Null
      & robocopy $from $to /E /NFL /NDL /NJH /NJS /NP | Out-Null
      if ($LASTEXITCODE -gt 7) { throw "Robocopy failed for ${item}: code $LASTEXITCODE" }
    } else { Copy-Item -LiteralPath $from -Destination $to -Force }
  }
  if (Test-Path (Join-Path $CloneFolder 'dev\mock-api.js')) { throw 'Public deployment clone contains a mock API; remove it before pushing.' }
  if (Test-Path (Join-Path $CloneFolder 'apps-script-v9\Code.gs')) { throw 'Public deployment clone contains private backend code; remove it before pushing.' }
  & git add -A
  & git diff --cached --check
  if ($LASTEXITCODE -ne 0) { throw 'Staged changes failed git diff --check.' }
  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Write-Host 'No changes to push.'; return }
  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
  & git push origin HEAD:main
  if ($LASTEXITCODE -ne 0) { throw 'Push failed. No force push was attempted.' }
  Write-Host 'Frontend source pushed. GitHub Actions will perform the live-only build.'
} finally { Pop-Location }
