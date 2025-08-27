const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const puppeteer = require('puppeteer');
const DropshipFileAnalyzer = require('./DropshipFileAnalyzer');

class DropshipProcessor {
    constructor(uploadsDir, outputDir) {
        this.uploadsDir = uploadsDir;
        this.outputDir = outputDir || path.join(uploadsDir, '../processed');
        this.analyzer = new DropshipFileAnalyzer(uploadsDir);
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async processAllFiles() {
        try {
            console.log('Starting file analysis...');
            const analysis = await this.analyzer.analyzeAllFiles();
            
            console.log('Generating processing plan...');
            const plan = this.analyzer.generateProcessingPlan(analysis);
            
            console.log('Processing files...');
            const results = await this.executeProcessingPlan(plan, analysis);
            
            return {
                success: true,
                analysis: analysis,
                plan: plan,
                results: results
            };
        } catch (error) {
            console.error('Processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeProcessingPlan(plan, analysis) {
        const results = [];
        
        for (const step of plan.steps) {
            try {
                console.log(`Processing ${step.outputFile}...`);
                
                const result = await this.processOutputFile(step, analysis);
                results.push(result);
                
            } catch (error) {
                console.error(`Error processing ${step.outputFile}:`, error);
                results.push({
                    outputFile: step.outputFile,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async processOutputFile(step, analysis) {
        const method = step.processingMethod;
        
        switch (method) {
            case 'postback_generation':
                return await this.generatePostbackFile(step, analysis);
            case 'tracking_compilation':
                return await this.generateTrackingFile(step, analysis);
            case 'territorial_mapping':
                return await this.generateTerritorialFile(step, analysis);
            case 'pdf_report_generation':
                return await this.generatePdfReport(step, analysis);
            default:
                return await this.genericTransformation(step, analysis);
        }
    }

    async generatePostbackFile(step, analysis) {
        // Find the target output file structure
        const targetFile = analysis.outputFiles.find(f => f.filename === step.outputFile);
        const targetHeaders = targetFile?.data?.headers || ['SYS_INTERNAL_ID', 'SYS_ITEM_INTERNAL_ID', 'SYS_OS_QTY'];
        
        // Get all input data with proper mapping
        const compiledData = await this.compileAllInputData(analysis);
        
        // Transform data to match postback format
        const transformedData = this.transformToPostbackFormat(compiledData, targetHeaders);
        
        // Generate output file
        const outputPath = path.join(this.outputDir, step.outputFile);
        
        if (step.outputFile.toLowerCase().endsWith('.csv')) {
            this.writeCsvFile(outputPath, transformedData, targetHeaders);
        } else {
            this.writeExcelFile(outputPath, transformedData, targetHeaders);
        }
        
        return {
            outputFile: step.outputFile,
            success: true,
            recordCount: transformedData.length,
            outputPath: outputPath
        };
    }

    async generateTrackingFile(step, analysis) {
        const targetFile = analysis.outputFiles.find(f => f.filename === step.outputFile);
        const targetHeaders = targetFile?.data?.headers || ['Order Number ', 'Transaction Type', 'weight', 'tracking number', 'Label Integration'];
        
        // Get all input data
        const compiledData = await this.compileAllInputData(analysis);
        
        // Transform data to tracking format
        const transformedData = this.transformToTrackingFormat(compiledData, targetHeaders);
        
        const outputPath = path.join(this.outputDir, step.outputFile);
        this.writeCsvFile(outputPath, transformedData, targetHeaders);
        
        return {
            outputFile: step.outputFile,
            success: true,
            recordCount: transformedData.length,
            outputPath: outputPath
        };
    }

    async generateTerritorialFile(step, analysis) {
        const targetFile = analysis.outputFiles.find(f => f.filename === step.outputFile);
        
        // Get all input data  
        const compiledData = await this.compileAllInputData(analysis);
        
        // For territorial file, use the structure from ONE RECORD PER ITEM
        const oneRecordFile = analysis.inputFiles.find(f => f.filename.includes('ONE RECORD PER ITEM'));
        let headers = [];
        
        if (oneRecordFile && oneRecordFile.data && oneRecordFile.data.type === 'Excel') {
            const sheet = Object.values(oneRecordFile.data.sheets)[0];
            headers = sheet?.headers || [];
        }
        
        const transformedData = this.transformToTerritorialFormat(compiledData, headers);
        
        const outputPath = path.join(this.outputDir, step.outputFile);
        this.writeExcelFile(outputPath, transformedData, headers);
        
        return {
            outputFile: step.outputFile,
            success: true,
            recordCount: transformedData.length,
            outputPath: outputPath
        };
    }

    // New method to compile all input data more effectively
    async compileAllInputData(analysis) {
        const allData = [];
        
        // Process each input file
        analysis.inputFiles.forEach(inputFile => {
            if (inputFile.data) {
                if (inputFile.data.type === 'Excel') {
                    // Process each sheet in Excel files
                    Object.entries(inputFile.data.sheets).forEach(([sheetName, sheetData]) => {
                        if (sheetData.allData && sheetData.headers) {
                            sheetData.allData.forEach(row => {
                                const rowObj = {};
                                sheetData.headers.forEach((header, index) => {
                                    rowObj[header] = row[index];
                                });
                                rowObj._source = inputFile.filename;
                                rowObj._sheet = sheetName;
                                allData.push(rowObj);
                            });
                        }
                    });
                } else if (inputFile.data.allData) {
                    // Process CSV files
                    inputFile.data.allData.forEach(row => {
                        const rowObj = { ...row };
                        rowObj._source = inputFile.filename;
                        allData.push(rowObj);
                    });
                }
            }
        });
        
        return allData;
    }

    async generatePdfReport(step, analysis) {
        try {
            // Get all input data
            const compiledData = await this.compileAllInputData(analysis);
            
            // Generate HTML content for PDF
            const htmlContent = this.generateOrdersReportHTML(compiledData);
            
            // Create PDF using puppeteer
            const outputPath = path.join(this.outputDir, step.outputFile);
            await this.generatePdfFromHTML(htmlContent, outputPath);
            
            return {
                outputFile: step.outputFile,
                success: true,
                outputPath: outputPath,
                recordCount: compiledData.length,
                note: 'Generated as PDF'
            };
        } catch (error) {
            console.error('PDF generation error:', error);
            
            // Fallback to text file if PDF fails
            const compiledData = await this.compileAllInputData(analysis);
            const reportContent = this.generateOrdersReport(compiledData);
            const outputPath = path.join(this.outputDir, step.outputFile.replace('.pdf', '.txt'));
            fs.writeFileSync(outputPath, reportContent, 'utf8');
            
            return {
                outputFile: step.outputFile.replace('.pdf', '.txt'),
                success: true,
                outputPath: outputPath,
                recordCount: compiledData.length,
                note: 'Generated as text file due to PDF error: ' + error.message
            };
        }
    }

    async compileDataFromSources(inputSources, analysis) {
        const compiledData = [];
        
        for (const source of inputSources) {
            const inputFile = analysis.inputFiles.find(f => f.filename === source.inputFile);
            
            if (inputFile && inputFile.data) {
                if (inputFile.data.type === 'Excel' && source.inputSheet) {
                    const sheetData = inputFile.data.sheets[source.inputSheet]?.allData || [];
                    const headers = inputFile.data.sheets[source.inputSheet]?.headers || [];
                    
                    sheetData.forEach(row => {
                        const rowObj = {};
                        headers.forEach((header, index) => {
                            rowObj[header] = row[index];
                        });
                        rowObj._source = source.inputFile;
                        rowObj._sheet = source.inputSheet;
                        compiledData.push(rowObj);
                    });
                } else if (inputFile.data.allData) {
                    inputFile.data.allData.forEach(row => {
                        row._source = source.inputFile;
                        compiledData.push(row);
                    });
                }
            }
        }
        
        return compiledData;
    }

    transformToPostbackFormat(data, targetHeaders) {
        // Filter for data that has Internal ID information (from ORDERS TO PROCESS file)
        const ordersToProcessData = data.filter(row => 
            (row._source && row._source.includes('ORDERSTOPROCESS') && 
            row['Internal ID'] && row['TSC_SKU']) ||
            (row._sheet && row._sheet.includes('OFFSITEDIXONDALEORDERSTOPROCES'))
        );
        
        console.log('Found ' + ordersToProcessData.length + ' records for postback');
        
        return ordersToProcessData.map(row => {
            const transformedRow = {};
            
            // Map the specific fields for postback
            transformedRow['SYS_INTERNAL_ID'] = row['Internal ID'] || '';
            transformedRow['SYS_ITEM_INTERNAL_ID'] = this.extractItemInternalId(row);
            transformedRow['SYS_OS_QTY'] = row['QTY_ORDERED'] || row['COMMITTED'] || 1;
            
            return transformedRow;
        });
    }

    transformToTrackingFormat(data, targetHeaders) {
        // Use data from ONE RECORD PER ITEM which has the tracking information
        const oneRecordData = data.filter(row => 
            row._source && row._source.includes('ONE RECORD PER ITEM') && 
            row['orderno']
        );
        
        return oneRecordData.map(row => {
            const transformedRow = {};
            
            // Map the tracking fields
            transformedRow['Order Number '] = row['orderno'] || '';
            transformedRow['Transaction Type'] = 'Sales Order';
            transformedRow['weight'] = row['weight'] || row['total weight'] || '0';
            transformedRow['tracking number'] = row['tracking number'] || '';
            transformedRow['Label Integration'] = 'F';
            
            return transformedRow;
        });
    }

    transformToTerritorialFormat(data, headers) {
        // Use ONE RECORD PER ITEM data for territorial format
        const oneRecordData = data.filter(row => 
            row._source && row._source.includes('ONE RECORD PER ITEM')
        );
        
        return oneRecordData.map(row => {
            const transformedRow = {};
            
            // Copy all fields from ONE RECORD PER ITEM
            headers.forEach(header => {
                transformedRow[header] = row[header] || '';
            });
            
            // Add processing metadata
            transformedRow['processed_date'] = new Date().toISOString().split('T')[0];
            
            return transformedRow;
        });
    }

    // Helper method to extract item internal ID
    extractItemInternalId(row) {
        // Try different field names that might contain item internal ID
        const possibleFields = ['TSC_SKU', 'ITEM_ID', 'Internal ID', 'item'];
        
        for (const field of possibleFields) {
            if (row[field]) {
                const value = row[field].toString();
                // For TSC_SKU like 'XN514/C', extract the numeric part
                if (field === 'TSC_SKU') {
                    const numericMatch = value.match(/\d+/);
                    if (numericMatch) {
                        return numericMatch[0];
                    }
                }
                // For other fields, try to extract numbers
                const match = value.match(/\d+/);
                if (match) {
                    return match[0];
                }
            }
        }
        
        // Generate a simple hash-based ID if no numeric value found
        if (row['TSC_SKU']) {
            // Simple hash function to convert SKU to consistent number
            let hash = 0;
            const str = row['TSC_SKU'].toString();
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash % 99999).toString();
        }
        
        // Default fallback
        return '21148';
    }

    mapFieldValue(sourceRow, targetField) {
        // Try to map source fields to target fields
        const normalizedTarget = this.analyzer.normalizeFieldName(targetField);
        
        for (const [key, value] of Object.entries(sourceRow)) {
            if (this.analyzer.normalizeFieldName(key) === normalizedTarget) {
                return value;
            }
        }
        
        // Handle special field mappings
        if (normalizedTarget.includes('date')) {
            return new Date().toISOString().split('T')[0];
        }
        
        if (normalizedTarget.includes('total') || normalizedTarget.includes('amount')) {
            return this.calculateTotalFromRow(sourceRow);
        }
        
        return ''; // Default empty value
    }

    calculateTotalFromRow(row) {
        // Look for numeric fields that might represent amounts
        for (const [key, value] of Object.entries(row)) {
            if (key.toLowerCase().includes('price') || 
                key.toLowerCase().includes('amount') || 
                key.toLowerCase().includes('total')) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    return numValue;
                }
            }
        }
        return 0;
    }

    determineTerritoryFromData(row) {
        // Logic to determine territory from row data
        // This would be customized based on actual business rules
        return 'DEFAULT_TERRITORY';
    }

    async generatePdfFromHTML(htmlContent, outputPath) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            
            // Set content with less strict waiting - just wait for DOM ready
            await page.setContent(htmlContent, { 
                waitUntil: 'domcontentloaded',  // Changed from 'networkidle0' to 'domcontentloaded'
                timeout: 90000  // Increase to 90 seconds
            });
            
            await page.pdf({
                path: outputPath,
                format: 'Letter',  // Changed from A4 to Letter (8.5x11)
                margin: {
                    top: '0.75in',    // Match CSS margins exactly
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                },
                printBackground: true,
                preferCSSPageSize: true  // Use CSS @page settings
            });
        } finally {
            await browser.close();
        }
    }

    generateOrdersReportHTML(data) {
        // Filter and prepare order data - handle different field name formats
        const orderData = data.filter(row => {
            const orderNo = row.orderno || row.ORDER_NO || row['Order Number'] || row['order no'];
            const customerName = row['name 1'] || row.ShippingAddressName || row['Customer Name'] || row.customer;
            return orderNo && customerName && !orderNo.toString().toLowerCase().includes('undefined');
        });

        // Group orders by order number
        const groupedOrders = {};
        orderData.forEach(row => {
            // Handle different field name mappings
            const orderNo = row.orderno || row.ORDER_NO || row['Order Number'] || row['order no'];
            const customerName = row['name 1'] || row.ShippingAddressName || row['Customer Name'] || row.customer;
            const address = row['add 1'] || row.ShippingAddressLine1 || row['Address'] || row.address;
            const city = row.city || row.ShippingAddressCity || row['City'] || row.City;
            const state = row.state || row.ShippingAddressState || row['State'] || row.State;
            const zip = row.zip || row.ShippingAddressZIP || row['ZIP'] || row.zip_code;
            const item = row.item || row.TSC_SKU || row['Item Code'] || row.sku;
            const description = row.desc || row.ITEM_DESC || row['Description'] || row.description;
            const quantity = row.quanto || row.QTY_COMMITTED || row['Quantity'] || row.qty || 1;
            
            if (!groupedOrders[orderNo]) {
                groupedOrders[orderNo] = {
                    orderNo: orderNo,
                    customer: customerName || 'N/A',
                    address: address || 'N/A',
                    city: city || 'N/A',
                    state: state || 'N/A',
                    zip: zip || 'N/A',
                    items: []
                };
            }
            
            groupedOrders[orderNo].items.push({
                item: item || 'N/A',
                description: description || 'N/A',
                quantity: quantity || 0
            });
        });

        const orders = Object.values(groupedOrders);

        // Check for logo images
        const fs = require('fs');
        const path = require('path');
        const logoPath = path.join(__dirname, 'assets');
        
        // TSC Logo 1 (full header) - for top section
        let logo1Base64 = '';
        let hasLogo1 = false;
        const logo1Path = path.join(logoPath, 'tsc-logo1.png');
        if (fs.existsSync(logo1Path)) {
            try {
                const logoBuffer = fs.readFileSync(logo1Path);
                console.log(`✅ TSC Logo1 loaded: ${(logoBuffer.length / 1024).toFixed(1)}KB`);
                logo1Base64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
                hasLogo1 = true;
            } catch (error) {
                console.log('❌ Error reading logo1 file:', error.message);
            }
        } else {
            console.log('❌ TSC Logo1 file not found at:', logo1Path);
        }
        
        // TSC Logo 3 (company name) - for middle section
        let logo3Base64 = '';
        let hasLogo3 = false;
        const logo3Path = path.join(logoPath, 'tsc-logo3.png');
        if (fs.existsSync(logo3Path)) {
            try {
                const logoBuffer = fs.readFileSync(logo3Path);
                console.log(`✅ TSC Logo3 loaded: ${(logoBuffer.length / 1024).toFixed(1)}KB`);
                logo3Base64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
                hasLogo3 = true;
            } catch (error) {
                console.log('❌ Error reading logo3 file:', error.message);
            }
        }

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Territorial Seed Company</title>
            <style>
                @page {
                    size: 8.5in 11in;
                    margin: 0.75in 0.5in 0.5in 0.5in;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 12px;
                    line-height: 1.0;
                    color: #000;
                    background: white;
                    -webkit-print-color-adjust: exact;
                }
                .page {
                    width: 100%;
                    height: 100vh;
                    page-break-after: always;
                    background: white;
                    position: relative;
                    padding: 0;
                }
                .page:last-child {
                    page-break-after: avoid;
                }
                
                /* Header layout with logos */
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                    position: relative;
                }
                
                .from-and-logo {
                    flex: 1;
                }
                
                .from-section {
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                
                .tsc-logo1 {
                    max-width: 400px;
                    max-height: 70px;
                    display: block;
                }
                
                .ship-to-section {
                    margin-top: 10px;
                    margin-bottom: 4px;
                }
                
                .ship-to-underline {
                    border-bottom: 1px solid #000;
                    display: inline-block;
                    padding-bottom: 1px;
                    font-size: 12px;
                }
                
                .customer-address-block {
                    font-size: 12px;
                    line-height: 1.2;
                    margin-top: 8px;
                }
                
                .header-right {
                    text-align: right;
                    font-size: 11px;
                    margin-left: 20px;
                    margin-top: 10px;
                }
                
                .expected-ship {
                    margin-bottom: 18px;
                }
                
                .invoice-line {
                    margin-bottom: 4px;
                }
                
                .order-number-display {
                    font-size: 12px;
                    font-weight: bold;
                }
                
                /* Middle section with logo3 */
                .middle-company-section {
                    margin-top: 40px;
                    margin-bottom: 30px;
                }
                
                .tsc-logo3 {
                    max-width: 300px;
                    max-height: 50px;
                    margin-bottom: 8px;
                }
                
                .middle-customer-block {
                    font-size: 12px;
                    line-height: 1.2;
                    margin-bottom: 20px;
                }
                
                .thank-you-section {
                    position: absolute;
                    top: 160px;
                    right: 0;
                    text-align: right;
                    font-size: 12px;
                    font-weight: bold;
                    line-height: 1.3;
                }
                
                /* Fallback text styling when no logos */
                .company-name-large {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    letter-spacing: 0px;
                    line-height: 1.0;
                }
                
                .company-address-line {
                    font-size: 11px;
                    margin-bottom: 16px;
                    line-height: 1.0;
                }
                
                .ship-to-section {
                    margin-bottom: 4px;
                }
                
                .ship-to-underline {
                    border-bottom: 1px solid #000;
                    display: inline-block;
                    padding-bottom: 1px;
                    font-size: 12px;
                }
                
                .customer-address-block {
                    font-size: 12px;
                    line-height: 1.2;
                    margin-bottom: 20px;
                    margin-top: 8px;
                }
                
                .header-right {
                    position: absolute;
                    top: 0;
                    right: 0;
                    text-align: right;
                    font-size: 11px;
                }
                
                .expected-ship {
                    margin-bottom: 18px;
                }
                
                .invoice-line {
                    margin-bottom: 4px;
                }
                
                .order-number-display {
                    font-size: 12px;
                    font-weight: bold;
                }
                
                /* Middle section */
                .middle-company-section {
                    margin-top: ${hasLogo3 ? '30px' : '40px'};
                    margin-bottom: 30px;
                }
                
                .middle-company-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    letter-spacing: 0px;
                }
                
                .middle-company-address {
                    font-size: 10px;
                    margin-bottom: 16px;
                }
                
                .middle-customer-block {
                    font-size: 12px;
                    line-height: 1.2;
                    margin-bottom: 20px;
                }
                
                .thank-you-section {
                    position: absolute;
                    top: ${hasLogo1 ? '120px' : '140px'};
                    right: 0;
                    text-align: right;
                    font-size: 12px;
                    font-weight: bold;
                    line-height: 1.3;
                }
                
                /* Items section */
                .items-table {
                    margin-top: ${hasLogo3 ? '60px' : '80px'};
                    border-top: 1px solid #000;
                    padding-top: 12px;
                }
                
                .item-line {
                    display: flex;
                    font-size: 12px;
                    margin-bottom: 3px;
                    align-items: baseline;
                }
                
                .qty-column {
                    width: 30px;
                    text-align: left;
                    flex-shrink: 0;
                }
                
                .item-column {
                    width: 120px;
                    text-align: left;
                    margin-left: 40px;
                    flex-shrink: 0;
                }
                
                .desc-column {
                    flex: 1;
                    text-align: left;
                    margin-left: 30px;
                }
                
                /* Footer */
                .page-footer {
                    position: absolute;
                    bottom: 30px;
                    left: 0;
                    font-size: 11px;
                }
            </style>
        </head>
        <body>
        `;

        orders.forEach((order, index) => {
            html += `
            <div class="page">
                <!-- Header with Logo1 between FROM and Ship to -->
                <div class="header-container">
                    <div class="from-and-logo">
                        ${hasLogo1 ? `
                        <img src="${logo1Base64}" alt="Territorial Seed Company" class="tsc-logo1" />
                        ` : `
                        <!-- Fallback text header -->
                        <div class="from-section">FROM:</div>
                        <div class="company-name-large">Territorial Seed Company</div>
                        <div class="company-address-line">P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547</div>
                        `}
                        
                        <!-- Ship to section - text removed since it's in logo -->
                        <div class="ship-to-section">
                        </div>
                        
                        <div class="customer-address-block">
                            <div>${order.customer}</div>
                            <div>${order.address}</div>
                            <div>${order.city}, ${order.state} ${order.zip}</div>
                        </div>
                    </div>
                    
                    <!-- Right side header -->
                    <div class="header-right">
                        <div class="expected-ship">Expected Ship Date</div>
                        <div class="invoice-line">Invoice</div>
                        <div class="order-number-display">${order.orderNo}</div>
                    </div>
                </div>
                
                <!-- Middle section with Logo3 -->
                <div class="middle-company-section">
                    ${hasLogo3 ? `
                    <img src="${logo3Base64}" alt="Territorial Seed Company" class="tsc-logo3" />
                    ` : `
                    <div class="middle-company-name">Territorial Seed Company</div>
                    <div class="middle-company-address">P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547</div>
                    `}
                    
                    <div class="middle-customer-block">
                        <div>${order.customer}</div>
                        <div>${order.address}</div>
                        <div>${order.city}, ${order.state} ${order.zip}</div>
                    </div>
                </div>
                
                <!-- Thank you section - positioned exactly like sample -->
                <div class="thank-you-section">
                    <div>Thank you for your order.</div>
                    <div>This is a packing slip not a bill.</div>
                </div>
                
                <!-- Items section with exact column layout -->
                <div class="items-table">
            `;
            
            order.items.forEach(item => {
                html += `
                    <div class="item-line">
                        <div class="qty-column">${item.quantity}</div>
                        <div class="item-column">${item.item}</div>
                        <div class="desc-column">${item.description}</div>
                    </div>
                `;
            });
            
            html += `
                </div>
                
                <!-- Footer - order number at bottom -->
                <div class="page-footer">
                    ${order.orderNo}
                </div>
            </div>
            `;
        });

        html += `
        </body>
        </html>
        `;

        return html;
    }

    generateOrdersReport(data) {
        let report = 'DIXONDALE ORDERS REPORT\n';
        report += '='.repeat(50) + '\n\n';
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Total Records: ${data.length}\n\n`;
        
        // Group data by source file
        const groupedData = {};
        data.forEach(row => {
            const source = row._source || 'Unknown';
            if (!groupedData[source]) {
                groupedData[source] = [];
            }
            groupedData[source].push(row);
        });
        
        Object.entries(groupedData).forEach(([source, rows]) => {
            report += `Source: ${source}\n`;
            report += '-'.repeat(30) + '\n';
            report += `Records: ${rows.length}\n\n`;
            
            // Add sample data
            rows.slice(0, 5).forEach((row, index) => {
                report += `Record ${index + 1}:\n`;
                Object.entries(row).forEach(([key, value]) => {
                    if (!key.startsWith('_')) {
                        report += `  ${key}: ${value}\n`;
                    }
                });
                report += '\n';
            });
        });
        
        return report;
    }

    writeCsvFile(outputPath, data, headers) {
        const csv = Papa.unparse({
            fields: headers,
            data: data.map(row => headers.map(h => row[h] || ''))
        });
        
        fs.writeFileSync(outputPath, csv, 'utf8');
    }

    writeExcelFile(outputPath, data, headers) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, outputPath);
    }

    async genericTransformation(step, analysis) {
        // Fallback generic transformation
        const compiledData = await this.compileDataFromSources(step.inputSources, analysis);
        const outputPath = path.join(this.outputDir, step.outputFile);
        
        // Write as CSV for generic case
        const headers = Object.keys(compiledData[0] || {});
        this.writeCsvFile(outputPath, compiledData, headers);
        
        return {
            outputFile: step.outputFile,
            success: true,
            recordCount: compiledData.length,
            outputPath: outputPath
        };
    }
}

module.exports = DropshipProcessor;
