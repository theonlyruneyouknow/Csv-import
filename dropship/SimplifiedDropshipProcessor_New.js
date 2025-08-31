const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const puppeteer = require('puppeteer');

class SimplifiedDropshipProcessor {
    constructor() {
        this.baseDir = path.dirname(__filename);
        this.uploadsDir = path.join(this.baseDir, 'uploads');
        this.processedDir = path.join(this.baseDir, 'processed');
        this.assetsDir = path.join(this.baseDir, 'assets');
        this.dataFilePath = path.join(this.baseDir, 'data.csv');
        
        // Ensure directories exist
        [this.uploadsDir, this.processedDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Load stored data from data.csv
        this.storedData = this.loadStoredData();
    }

    loadStoredData() {
        try {
            if (fs.existsSync(this.dataFilePath)) {
                const csvContent = fs.readFileSync(this.dataFilePath, 'utf8');
                const result = Papa.parse(csvContent, { header: true });
                return result.data.reduce((acc, row) => {
                    if (row.SKU) {
                        acc[row.SKU] = row;
                    }
                    return acc;
                }, {});
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
        return {};
    }

    async processDropshipFile(inputFilePath) {
        try {
            console.log('🔄 Processing dropship file:', path.basename(inputFilePath));
            
            // Parse the input file
            const orderData = this.parseInputFile(inputFilePath);
            console.log(`📊 Parsed ${orderData.length} order items`);
            
            // Enrich with stored data
            const enrichedData = this.enrichOrderData(orderData);
            
            // Group orders
            const groupedOrders = this.groupOrdersByOrderNumber(enrichedData);
            console.log(`📦 Found ${Object.keys(groupedOrders).length} unique orders`);
            
            // Generate outputs
            const csvOutput = await this.generateCSVOutput(enrichedData);
            console.log('✅ CSV output generated:', path.basename(csvOutput));
            
            const pdfOutput = await this.generatePDFPackingList(groupedOrders);
            console.log('✅ PDF packing list generated:', path.basename(pdfOutput));
            
            return {
                success: true,
                csvOutput,
                pdfOutput,
                ordersProcessed: Object.keys(groupedOrders).length,
                itemsProcessed: enrichedData.length
            };
            
        } catch (error) {
            console.error('❌ Processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    parseInputFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        if (ext === '.csv') {
            const csvContent = fs.readFileSync(filePath, 'utf8');
            const result = Papa.parse(csvContent, { header: true });
            return result.data;
        } else if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(worksheet);
        } else {
            throw new Error(`Unsupported file format: ${ext}`);
        }
    }

    enrichOrderData(orderData) {
        return orderData.map(order => {
            const enrichedOrder = {};
            
            // Extract SKU and quantity from the simplified format
            const sku = order['Row Labels'];
            const quantity = order['Sum of QTY_ORDERED'] || 0;
            
            // Find matching data from data.csv
            const storedInfo = this.storedData[sku];
            
            if (storedInfo) {
                enrichedOrder.TSC_SKU = sku;
                enrichedOrder['Item Description'] = storedInfo.Description;
                enrichedOrder.Unit_Price = storedInfo.Unit_Price;
                enrichedOrder.Category = storedInfo.Category;
                enrichedOrder.Vendor_Code = storedInfo.Vendor_Code;
                enrichedOrder.Quantity = quantity;
                
                // Calculate line total
                enrichedOrder.Line_Total = (parseFloat(storedInfo.Unit_Price) || 0) * quantity;
            } else {
                // If no stored info found, still include basic data
                enrichedOrder.TSC_SKU = sku;
                enrichedOrder['Item Description'] = '';
                enrichedOrder.Unit_Price = '';
                enrichedOrder.Category = '';
                enrichedOrder.Vendor_Code = '';
                enrichedOrder.Quantity = quantity;
                enrichedOrder.Line_Total = 0;
            }
            
            // Set default order information (since this format doesn't include customer details)
            enrichedOrder['Internal ID'] = '';
            enrichedOrder.ORDER_NO = `ORDER_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
            enrichedOrder['Customer Name'] = 'Bulk Order';
            enrichedOrder.Company = '';
            enrichedOrder['Address Line 1'] = '';
            enrichedOrder['Address Line 2'] = '';
            enrichedOrder.City = '';
            enrichedOrder.State = '';
            enrichedOrder.ZIP = '';
            enrichedOrder.Full_Address = 'Bulk Order Address\nTo Be Determined';
            
            return enrichedOrder;
        });
    }

    formatShippingAddress(order) {
        let address = order.ShippingAddressName || '';
        if (order['Company Name']) address += `\n${order['Company Name']}`;
        if (order.ShippingAddressLine1) address += `\n${order.ShippingAddressLine1}`;
        if (order.ShippingAddressLine2) address += `\n${order.ShippingAddressLine2}`;
        if (order.ShippingAddressCity || order.ShippingAddressState || order.ShippingAddressZIP) {
            address += `\n${order.ShippingAddressCity || ''}, ${order.ShippingAddressState || ''} ${order.ShippingAddressZIP || ''}`.trim();
        }
        return address;
    }

    groupOrdersByOrderNumber(orderData) {
        return orderData.reduce((groups, order) => {
            const orderNo = order.ORDER_NO;
            if (!groups[orderNo]) {
                groups[orderNo] = {
                    orderInfo: {
                        orderNumber: orderNo,
                        customerName: order.ShippingAddressName,
                        company: order['Company Name'],
                        address: order.Full_Address,
                        internalId: order['Internal ID']
                    },
                    items: []
                };
            }
            groups[orderNo].items.push(order);
            return groups;
        }, {});
    }

    async generateCSVOutput(enrichedData) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const outputPath = path.join(this.processedDir, `ONE_RECORD_PER_ITEM_${timestamp}.csv`);
        
        // Prepare CSV data with desired columns
        const csvData = enrichedData.map(item => ({
            'Internal ID': item['Internal ID'] || '',
            'ORDER_NO': item.ORDER_NO || '',
            'Customer Name': item['Customer Name'] || '',
            'Company': item.Company || '',
            'Address Line 1': item['Address Line 1'] || '',
            'Address Line 2': item['Address Line 2'] || '',
            'City': item.City || '',
            'State': item.State || '',
            'ZIP': item.ZIP || '',
            'TSC_SKU': item.TSC_SKU || '',
            'Item Description': item['Item Description'] || '',
            'Quantity': item.Quantity || 0,
            'Unit Price': item.Unit_Price || '',
            'Line Total': item.Line_Total || 0,
            'Category': item.Category || '',
            'Vendor Code': item.Vendor_Code || ''
        }));

        // Convert to CSV
        const csv = Papa.unparse(csvData);
        fs.writeFileSync(outputPath, csv);
        
        return outputPath;
    }

    async generatePDFPackingList(groupedOrders) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const outputPath = path.join(this.processedDir, `Orders_${timestamp}.pdf`);
        
        const html = this.generatePackingListHTML(groupedOrders);
        
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        await page.setContent(html);
        await page.pdf({
            path: outputPath,
            format: 'Letter',
            margin: {
                top: '0.75in',
                right: '0.75in',
                bottom: '0.75in',
                left: '0.75in'
            }
        });
        
        await browser.close();
        return outputPath;
    }

    generatePackingListHTML(groupedOrders) {
        const logoPath1 = path.join(this.assetsDir, 'TSC logo1.png');
        const logoPath3 = path.join(this.assetsDir, 'TSC logo 3.png');
        
        let logoBase64_1 = '';
        let logoBase64_3 = '';
        
        try {
            if (fs.existsSync(logoPath1)) {
                logoBase64_1 = fs.readFileSync(logoPath1).toString('base64');
            }
            if (fs.existsSync(logoPath3)) {
                logoBase64_3 = fs.readFileSync(logoPath3).toString('base64');
            }
        } catch (error) {
            console.warn('Could not load logo files:', error.message);
        }

        const date = new Date().toLocaleDateString();
        const invoiceNumber = `NS${Math.floor(Math.random() * 9000000) + 1000000}`;
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {
                    margin: 0.75in;
                    size: letter;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
                    line-height: 1.2;
                }
                .page {
                    width: 100%;
                    min-height: 9.5in;
                    page-break-after: always;
                    position: relative;
                }
                .page:last-child {
                    page-break-after: avoid;
                }
                .header-logo {
                    text-align: center;
                    margin-bottom: 8px;
                }
                .logo-img {
                    max-width: 350px;
                    height: auto;
                }
                .company-address-header {
                    text-align: center;
                    font-size: 10px;
                    margin-bottom: 20px;
                    color: #333;
                }
                .from-section {
                    margin-bottom: 15px;
                }
                .from-label {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                .from-company-logo {
                    margin-left: 20px;
                    margin-bottom: 5px;
                }
                .from-logo-img {
                    max-width: 200px;
                    height: auto;
                }
                .from-company-address {
                    margin-left: 20px;
                    font-size: 9px;
                    margin-bottom: 15px;
                    color: #333;
                }
                .ship-to-section {
                    margin-left: 20px;
                }
                .ship-to-underline {
                    border-bottom: 2px solid #000;
                    width: 200px;
                    display: inline-block;
                    margin-left: 10px;
                }
                .ship-to-label {
                    font-size: 11px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .customer-info {
                    margin: 15px 0 0 20px;
                    font-size: 11px;
                    line-height: 1.3;
                }
                .customer-name {
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .expected-ship-invoice {
                    position: absolute;
                    top: 0;
                    right: 0;
                    text-align: right;
                    font-size: 10px;
                }
                .expected-ship {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .invoice-label {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .invoice-number {
                    font-size: 12px;
                    font-weight: bold;
                }
                .content-break {
                    margin: 25px 0;
                    border-top: 2px solid #000;
                    padding-top: 20px;
                }
                .center-section {
                    text-align: center;
                    margin: 20px 0;
                }
                .center-logo-img {
                    max-width: 250px;
                    height: auto;
                    margin-bottom: 5px;
                }
                .center-address {
                    font-size: 9px;
                    margin-bottom: 15px;
                    color: #333;
                }
                .center-customer {
                    margin: 10px 0;
                    font-size: 11px;
                }
                .thank-you-msg {
                    text-align: right;
                    font-size: 11px;
                    font-weight: bold;
                    margin: 15px 0;
                    line-height: 1.3;
                }
                .items-divider {
                    border-top: 1px solid #000;
                    margin: 15px 0 10px 0;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0;
                }
                .items-table td {
                    padding: 4px 6px;
                    border-bottom: 0.5px solid #ccc;
                    vertical-align: top;
                    font-size: 10px;
                }
                .qty-col {
                    width: 35px;
                    text-align: center;
                    font-weight: bold;
                }
                .sku-col {
                    width: 85px;
                    font-weight: bold;
                }
                .desc-col {
                    padding-left: 10px;
                }
                .footer-invoice {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    font-size: 8px;
                    color: #666;
                }
            </style>
        </head>
        <body>
        `;

        const orders = Object.values(groupedOrders);
        
        orders.forEach((order, orderIndex) => {
            if (orderIndex > 0) {
                html += '<div style="page-break-before: always;"></div>';
            }
            
            html += `
            <div class="page">
                <!-- Header with logo and address -->
                <div class="header-logo">
                    ${logoBase64_1 ? `<img src="data:image/png;base64,${logoBase64_1}" class="logo-img" alt="Territorial Seed Company">` : '<div style="font-size: 24px; font-weight: bold;">Territorial Seed Company</div>'}
                </div>
                <div class="company-address-header">
                    P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547
                </div>

                <!-- Expected Ship Date and Invoice in top right -->
                <div class="expected-ship-invoice">
                    <div class="expected-ship">Expected Ship Date</div>
                    <div class="invoice-label">Invoice</div>
                    <div class="invoice-number">${invoiceNumber}</div>
                </div>

                <!-- FROM section -->
                <div class="from-section">
                    <div class="from-label">FROM:</div>
                    <div class="from-company-logo">
                        ${logoBase64_3 ? `<img src="data:image/png;base64,${logoBase64_3}" class="from-logo-img" alt="Territorial Seed Company">` : '<div style="font-size: 16px; font-weight: bold;">Territorial Seed Company</div>'}
                    </div>
                    <div class="from-company-address">
                        P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547
                    </div>
                    
                    <!-- Ship to section -->
                    <div class="ship-to-section">
                        <div class="ship-to-label">
                            Ship to<span class="ship-to-underline"></span>
                        </div>
                    </div>
                </div>

                <!-- Customer information -->
                <div class="customer-info">
                    <div class="customer-name">JC</div>
                    <div>217 Lewiston Rd</div>
                    <div>MIDDLEPORT, NY 14105</div>
                </div>

                <!-- Content break -->
                <div class="content-break">
                    <!-- Center section with logo and customer info -->
                    <div class="center-section">
                        ${logoBase64_3 ? `<img src="data:image/png;base64,${logoBase64_3}" class="center-logo-img" alt="Territorial Seed Company">` : '<div style="font-size: 18px; font-weight: bold;">Territorial Seed Company</div>'}
                        <div class="center-address">
                            P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547
                        </div>
                        
                        <div class="center-customer">
                            <div class="customer-name">JC</div>
                            <div>217 Lewiston Rd</div>
                            <div>MIDDLEPORT, NY 14105</div>
                        </div>
                        
                        <div class="thank-you-msg">
                            Thank you for your order.<br>
                            This is a packing slip not a bill.
                        </div>
                    </div>

                    <!-- Items divider -->
                    <div class="items-divider"></div>

                    <!-- Items table -->
                    <table class="items-table">
            `;
            
            order.items.forEach(item => {
                const quantity = item.Quantity || item.QTY_COMMITTED || 0;
                const sku = item.TSC_SKU || item.SKU || '';
                const description = item['Item Description'] || item.ITEM_DESC || '';
                
                html += `
                        <tr>
                            <td class="qty-col">${quantity}</td>
                            <td class="sku-col">${sku}</td>
                            <td class="desc-col">${description}</td>
                        </tr>
                `;
            });
            
            html += `
                    </table>
                </div>

                <!-- Footer invoice number -->
                <div class="footer-invoice">${invoiceNumber}</div>
            </div>
            `;
        });

        html += `
        </body>
        </html>
        `;

        return html;
    }

    // Method to process the latest uploaded file
    async processLatestFile() {
        try {
            const files = fs.readdirSync(this.uploadsDir);
            const excelFiles = files.filter(file => 
                file.toLowerCase().endsWith('.xlsx') || 
                file.toLowerCase().endsWith('.xls') ||
                file.toLowerCase().endsWith('.csv')
            );
            
            if (excelFiles.length === 0) {
                throw new Error('No processable files found in uploads directory');
            }
            
            // Sort by modification time, get the latest
            const latestFile = excelFiles
                .map(file => ({
                    name: file,
                    path: path.join(this.uploadsDir, file),
                    mtime: fs.statSync(path.join(this.uploadsDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime)[0];
            
            console.log(`🔄 Processing latest file: ${latestFile.name}`);
            return await this.processDropshipFile(latestFile.path);
            
        } catch (error) {
            console.error('❌ Error processing latest file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SimplifiedDropshipProcessor;
