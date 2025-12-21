# PowerShell Script to Auto-Refresh Excel Data from MongoDB
# This script downloads fresh data from your API and updates an Excel file

# Configuration
$apiUrl = "https://tscsv-import.onrender.com/purchase-orders/export/csv-data?key=d2300d5b011727e025a1f456f1fb4a33aa668d71ed933499c8be9907707fdfe5"
$csvPath = "$env:USERPROFILE\Documents\PurchaseOrders.csv"
$excelPath = "$env:USERPROFILE\Documents\PurchaseOrders.xlsx"

Write-Host "🔄 Refreshing Purchase Order data..." -ForegroundColor Cyan

try {
    # Download fresh CSV data
    Write-Host "📥 Downloading data from MongoDB..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $apiUrl -OutFile $csvPath
    Write-Host "✅ Data downloaded successfully!" -ForegroundColor Green
    
    # Create Excel COM object
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # Open or create Excel workbook
    if (Test-Path $excelPath) {
        Write-Host "📂 Opening existing Excel file..." -ForegroundColor Yellow
        $workbook = $excel.Workbooks.Open($excelPath)
        # Clear existing data
        $worksheet = $workbook.Worksheets.Item(1)
        $worksheet.Cells.Clear()
    } else {
        Write-Host "📝 Creating new Excel file..." -ForegroundColor Yellow
        $workbook = $excel.Workbooks.Add()
        $worksheet = $workbook.Worksheets.Item(1)
    }
    
    # Import CSV data
    Write-Host "📊 Importing data into Excel..." -ForegroundColor Yellow
    $csv = Import-Csv $csvPath
    
    # Write headers
    $headers = $csv[0].PSObject.Properties.Name
    $col = 1
    foreach ($header in $headers) {
        $worksheet.Cells.Item(1, $col) = $header
        $col++
    }
    
    # Write data rows
    $row = 2
    foreach ($record in $csv) {
        $col = 1
        foreach ($header in $headers) {
            $worksheet.Cells.Item($row, $col) = $record.$header
            $col++
        }
        $row++
    }
    
    # Format as table
    $worksheet.UsedRange.Select() | Out-Null
    $listObject = $worksheet.ListObjects.Add([Microsoft.Office.Interop.Excel.XlListObjectSourceType]::xlSrcRange, $worksheet.UsedRange, $null, [Microsoft.Office.Interop.Excel.XlYesNoGuess]::xlYes)
    $listObject.Name = "PurchaseOrdersTable"
    $listObject.TableStyle = "TableStyleMedium2"
    
    # Auto-fit columns
    $worksheet.UsedRange.EntireColumn.AutoFit() | Out-Null
    
    # Save and close
    $workbook.SaveAs($excelPath)
    $workbook.Close()
    $excel.Quit()
    
    # Clean up COM objects
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($worksheet) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($workbook) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    
    Write-Host "✅ Excel file updated successfully!" -ForegroundColor Green
    Write-Host "📁 File location: $excelPath" -ForegroundColor Cyan
    Write-Host "🕐 Last updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
