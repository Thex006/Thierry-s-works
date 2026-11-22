# Publishes ONE demo (demos/<site>) to Cloudflare Pages as https://<site>-kitebright.pages.dev and saves the URL.
# Run it when the site goes to Review; take it down with `npx wrangler pages project delete <site>-kitebright` (Thierry's OK).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File life\desktop\publish-demo.ps1 <site>
# Needs a one-time `npx wrangler login` by Thierry. Deploys only demos/<site>; checker leftovers are excluded.
param([Parameter(Mandatory)][string]$Site)
$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\Thierry\Documents\claude-life'
Set-Location $repo

# Trust boundary: a plain folder name directly under demos/ (no slashes, dots-only names or traversal).
if ($Site -cnotmatch '^[a-z0-9][a-z0-9-]{0,40}$') { throw "Bad site name '$Site': use lowercase letters, digits and dashes." }
$src = Join-Path $repo "demos\$Site"
if (-not (Test-Path (Join-Path $src 'index.html'))) { throw "demos\$Site\index.html not found." }
if (-not (Test-Path (Join-Path $src 'SKILLS-USED.md'))) { throw "demos\$Site\SKILLS-USED.md missing: the site isn't ready to publish (CLAUDE.md Website jobs)." }

# Copy the site to a clean staging folder without the design checker's files, screenshots and notes.
$stage = Join-Path $env:TEMP "kb-publish-$Site"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
robocopy $src $stage /E /NFL /NDL /NJH /NJS /NP /XD .taste-skill shots node_modules .git /XF *.md LIVE_URL.txt *.log | Out-Null
if ($LASTEXITCODE -ge 8) { throw "copy failed (robocopy $LASTEXITCODE)" }

# Keep demos out of search engines (header + meta tag) and mark them as demos with a small fixed note.
Set-Content -Path (Join-Path $stage '_headers') -Value "/*`n  X-Robots-Tag: noindex" -Encoding ascii
$note = '<div style="position:fixed;left:12px;bottom:12px;z-index:2147483647;font:12px/1.4 system-ui,sans-serif;background:rgba(0,0,0,.72);color:#fff;padding:6px 10px;border-radius:6px">Demo by Kitebright Studio</div>'
Get-ChildItem $stage -Recurse -Filter *.html | ForEach-Object {
  $h = [IO.File]::ReadAllText($_.FullName)
  if ($h -notmatch 'name="robots"') { $h = $h -replace '(?i)<head>', "<head>`n<meta name=`"robots`" content=`"noindex`">" }
  if ($h -notmatch 'Demo by Kitebright Studio') { $h = $h -replace '(?i)</body>', "$note`n</body>" }
  [IO.File]::WriteAllText($_.FullName, $h, (New-Object Text.UTF8Encoding $false))
}

$project = "$Site-kitebright"
$exists = (npx wrangler pages project list 2>$null | Out-String) -match [regex]::Escape($project)
if (-not $exists) { npx wrangler pages project create $project --production-branch main; if ($LASTEXITCODE) { throw 'project create failed (logged in? run: npx wrangler login)' } }
npx wrangler pages deploy $stage --project-name $project --branch main --commit-dirty=true
if ($LASTEXITCODE) { throw 'deploy failed (logged in? run: npx wrangler login)' }

$url = "https://$project.pages.dev"
Set-Content -Path (Join-Path $src 'LIVE_URL.txt') -Value $url -Encoding ascii
Write-Output "Published: $url"
