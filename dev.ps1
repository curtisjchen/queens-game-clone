Write-Host "Launching the Queens Game Dev Environment..." -ForegroundColor Cyan

# 1. Start the Python Backend (Run from root to fix Relative Import error)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Backend...'; .\.venv\Scripts\activate; uvicorn backend.main:app --reload"

# 2. Start the React Frontend (Source your toolbox first to find 'npm')
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Frontend...'; . .\start_node.ps1; cd frontend; npm run dev"

Write-Host "Both servers are spinning up!" -ForegroundColor Green

# Poll until Vite is up, then open
do {
    Start-Sleep -Seconds 1
} until (Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet 2>$null)

Start-Process "http://localhost:5173"