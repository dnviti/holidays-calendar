param(
    [Parameter(Position = 0)]
    [ValidateSet("install", "run-backend", "run-frontend", "build-frontend", "dev")]
    [string]$Command
)

$ErrorActionPreference = "Stop"

function Install {
    Push-Location backend
    try {
        python -m venv venv --copies
        & ./venv/Scripts/pip install -r requirements.txt
    } finally { Pop-Location }

    Push-Location frontend
    try {
        npm install
    } finally { Pop-Location }
}

function Run-Backend {
    Push-Location backend
    try {
        & ./venv/Scripts/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    } finally { Pop-Location }
}

function Run-Frontend {
    Push-Location frontend
    try {
        npm run dev
    } finally { Pop-Location }
}

function Build-Frontend {
    Push-Location frontend
    try {
        npm run build
    } finally { Pop-Location }
}

function Dev {
    $backend = Start-Job -ScriptBlock {
        Set-Location "$using:PSScriptRoot/backend"
        & ./venv/Scripts/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    }
    $frontend = Start-Job -ScriptBlock {
        Set-Location "$using:PSScriptRoot/frontend"
        npm run dev
    }

    try {
        while ($true) {
            Receive-Job $backend -ErrorAction SilentlyContinue
            Receive-Job $frontend -ErrorAction SilentlyContinue
            if ($backend.State -eq "Failed" -or $frontend.State -eq "Failed") { break }
            Start-Sleep -Milliseconds 500
        }
    } finally {
        Stop-Job $backend, $frontend -ErrorAction SilentlyContinue
        Remove-Job $backend, $frontend -Force -ErrorAction SilentlyContinue
    }
}

switch ($Command) {
    "install"        { Install }
    "run-backend"    { Run-Backend }
    "run-frontend"   { Run-Frontend }
    "build-frontend" { Build-Frontend }
    "dev"            { Dev }
    default {
        Write-Host "Usage: .\make.ps1 <command>"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  install         Install backend and frontend dependencies"
        Write-Host "  run-backend     Start the backend server"
        Write-Host "  run-frontend    Start the frontend dev server"
        Write-Host "  build-frontend  Build the frontend for production"
        Write-Host "  dev             Run backend and frontend concurrently"
    }
}
