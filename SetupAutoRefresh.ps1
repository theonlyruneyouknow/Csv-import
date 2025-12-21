# Setup Script - Create Windows Scheduled Task for Auto-Refresh
# Run this once to set up automatic data refresh

$scriptPath = "$PSScriptRoot\RefreshExcelData.ps1"
$taskName = "Auto-Refresh Purchase Orders"

Write-Host "🔧 Setting up automatic Excel data refresh..." -ForegroundColor Cyan

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create scheduled task action
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

# Create trigger options - you can choose one or multiple:

Write-Host ""
Write-Host "Choose refresh schedule:" -ForegroundColor Cyan
Write-Host "1. Every hour (recommended)"
Write-Host "2. Every 30 minutes"
Write-Host "3. Daily at 8 AM"
Write-Host "4. Every 4 hours"
Write-Host ""
$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        # Every hour
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)
        Write-Host "⏰ Set to refresh every hour" -ForegroundColor Green
    }
    "2" {
        # Every 30 minutes
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)
        Write-Host "⏰ Set to refresh every 30 minutes" -ForegroundColor Green
    }
    "3" {
        # Daily at 8 AM
        $trigger = New-ScheduledTaskTrigger -Daily -At "8:00AM"
        Write-Host "⏰ Set to refresh daily at 8 AM" -ForegroundColor Green
    }
    "4" {
        # Every 4 hours
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration ([TimeSpan]::MaxValue)
        Write-Host "⏰ Set to refresh every 4 hours" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Invalid choice. Defaulting to every hour." -ForegroundColor Red
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)
    }
}

# Create task settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the scheduled task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Automatically refreshes Purchase Order data from MongoDB to Excel"

Write-Host ""
Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
Write-Host "📋 Task Name: $taskName" -ForegroundColor Cyan
Write-Host "📁 Script Location: $scriptPath" -ForegroundColor Cyan
Write-Host "📊 Excel File: $env:USERPROFILE\Documents\PurchaseOrders.xlsx" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Your Excel file will now update automatically!" -ForegroundColor Green
Write-Host ""
Write-Host "To test it now, run: .\RefreshExcelData.ps1" -ForegroundColor Yellow
Write-Host "To view the task: taskschd.msc" -ForegroundColor Yellow
Write-Host "To stop auto-refresh: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
