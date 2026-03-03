$nodeDir = "C:\Users\cjchen\Documents\node-v24.14.0-win-x64"

# 1. Update the Environment Path
$env:Path = "$nodeDir;$nodeDir\bin;" + $env:Path

# 2. Define the 'Aliases' (The secret bypass)
function npx { & "$nodeDir\node.exe" "$nodeDir\node_modules\npm\bin\npx-cli.js" @args }
function npm { & "$nodeDir\node.exe" "$nodeDir\node_modules\npm\bin\npm-cli.js" @args }

# 3. Confirmation
Write-Host "--- Node.js Toolbox Ready ---" -ForegroundColor Cyan
Write-Host "Node version: $(node -v)"
Write-Host "Aliases created! You can now use 'npm' and 'npx' safely." -ForegroundColor Green