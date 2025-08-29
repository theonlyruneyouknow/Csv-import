const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const puppeteer = require('puppeteer');

class SimplifiedDropshipProcessor {
    constructor() {
        this.uploadsDir = path.join(__dirname, 'uploads');
        this.processedDir = path.join(__dirname, 'processed');
        this.assetsDir = path.join(__dirname, 'assets');
        this.dataFilePath = path.join(__dirname, 'data.csv');
        
        // Ensure directories exist
        this.ensureDirectoriesExist();
        
        // Load stored data
        this.storedData = this.loadStoredData();
    }

    ensureDirectoriesExist() {
        [this.uploadsDir, this.processedDir, this.assetsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
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
            
            // Step 1: Read and parse input file
            const orderData = this.parseInputFile(inputFilePath);
            console.log(`📊 Parsed ${orderData.length} order items`);
            
            // Step 2: Enrich data with stored information
            const enrichedData = this.enrichOrderData(orderData);
            
            // Step 3: Group data by order for processing
            const groupedOrders = this.groupOrdersByOrderNumber(enrichedData);
            console.log(`📦 Found ${Object.keys(groupedOrders).length} unique orders`);
            
            // Step 4: Generate CSV output (one record per item)
            const csvOutputPath = await this.generateCSVOutput(enrichedData);
            
            // Step 5: Generate PDF packing list
            const pdfOutputPath = await this.generatePDFPackingList(groupedOrders);
            
            return {
                success: true,
                csvOutput: csvOutputPath,
                pdfOutput: pdfOutputPath,
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
        if (order['Company Name']) address += `\\n${order['Company Name']}`;
        if (order.ShippingAddressLine1) address += `\\n${order.ShippingAddressLine1}`;
        if (order.ShippingAddressLine2) address += `\\n${order.ShippingAddressLine2}`;
        if (order.ShippingAddressCity || order.ShippingAddressState || order.ShippingAddressZIP) {
            address += `\\n${order.ShippingAddressCity || ''}, ${order.ShippingAddressState || ''} ${order.ShippingAddressZIP || ''}`.trim();
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
            'Internal ID': item['Internal ID'],
            'ORDER_NO': item.ORDER_NO,
            'Customer Name': item.ShippingAddressName,
            'Company': item['Company Name'] || '',
            'Address Line 1': item.ShippingAddressLine1,
            'Address Line 2': item.ShippingAddressLine2 || '',
            'City': item.ShippingAddressCity,
            'State': item.ShippingAddressState,
            'ZIP': item.ShippingAddressZIP,
            'TSC_SKU': item.TSC_SKU,
            'Item Description': item.ITEM_DESC,
            'Quantity': item.QTY_COMMITTED,
            'Unit Price': item.Unit_Price || '',
            'Line Total': item.Line_Total || '',
            'Category': item.Category || '',
            'Vendor Code': item.Vendor_Code || ''
        }));
        
        const csv = Papa.unparse(csvData);
        fs.writeFileSync(outputPath, csv);
        
        console.log(`✅ CSV output generated: ${path.basename(outputPath)}`);
        return outputPath;
    }

    async generatePDFPackingList(groupedOrders) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const outputPath = path.join(this.processedDir, `Orders_${timestamp}.pdf`);
        
        const html = this.generatePackingListHTML(groupedOrders);
        
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        await page.pdf({
            path: outputPath,
            format: 'A4',
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            printBackground: true
        });
        
        await browser.close();
        
        console.log(`✅ PDF packing list generated: ${path.basename(outputPath)}`);
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
                    margin: 0.5in;
                    size: letter;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
                    line-height: 1.3;
                }
                .page {
                    width: 100%;
                    min-height: 10in;
                    page-break-after: always;
                    position: relative;
                }
                .page:last-child {
                    page-break-after: avoid;
                }
                .header {
                    width: 100%;
                    margin-bottom: 15px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 8px;
                }
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }
                .company-info {
                    flex: 1;
                }
                .company-name {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0;
                    line-height: 1.1;
                }
                .company-address {
                    font-size: 9px;
                    margin: 2px 0 8px 0;
                    color: #333;
                }
                .ship-to-label {
                    font-size: 9px;
                    font-weight: bold;
                    text-decoration: underline;
                }
                .header-right {
                    text-align: right;
                    flex: 0 0 auto;
                    padding-left: 20px;
                }
                .expected-ship {
                    font-size: 9px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .invoice-label {
                    font-size: 9px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .invoice-number {
                    font-size: 11px;
                    font-weight: bold;
                }
                .customer-section {
                    margin: 8px 0 15px 0;
                }
                .customer-name {
                    font-size: 11px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .customer-address {
                    font-size: 10px;
                    line-height: 1.2;
                }
                .divider {
                    border-top: 2px solid #000;
                    margin: 15px 0;
                }
                .middle-section {
                    text-align: center;
                    margin: 20px 0 15px 0;
                }
                .middle-company {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .middle-address {
                    font-size: 9px;
                    margin-bottom: 10px;
                    color: #333;
                }
                .middle-customer {
                    margin: 8px 0;
                }
                .thank-you {
                    text-align: right;
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 10px;
                    line-height: 1.3;
                }
                .items-section {
                    margin-top: 15px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 0;
                }
                .items-table td {
                    padding: 3px 5px;
                    border-bottom: 0.5px solid #ccc;
                    vertical-align: top;
                    font-size: 10px;
                }
                .qty-col {
                    width: 30px;
                    text-align: center;
                    font-weight: bold;
                }
                .sku-col {
                    width: 80px;
                    font-weight: bold;
                }
                .desc-col {
                    padding-left: 8px;
                }
                .footer-invoice {
                    position: absolute;
                    bottom: 15px;
                    left: 0;
                    font-size: 8px;
                    color: #666;
                }
                .thin-divider {
                    border-top: 1px solid #000;
                    margin: 12px 0;
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
                <div class="header">
                    <div class="header-top">
                        <div class="company-info">
                            <div class="company-name">Territorial Seed Company</div>
                            <div class="company-address">P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547</div>
                            <div class="ship-to-label">Ship to</div>
                        </div>
                        <div class="header-right">
                            <div class="expected-ship">Expected Ship Date</div>
                            <div class="invoice-label">Invoice</div>
                            <div class="invoice-number">${invoiceNumber}</div>
                        </div>
                    </div>
                </div>

                <div class="customer-section">
                    <div class="customer-name">JC</div>
                    <div class="customer-address">
                        217 Lewiston Rd<br>
                        MIDDLEPORT, NY 14105
                    </div>
                </div>

                <div class="divider"></div>

                <div class="middle-section">
                    <div class="middle-company">Territorial Seed Company</div>
                    <div class="middle-address">P. O. Box 158 - Cottage Grove, OR 97424 - 541-942-9547</div>
                    
                    <div class="middle-customer">
                        <div class="customer-name">JC</div>
                        <div class="customer-address">
                            217 Lewiston Rd<br>
                            MIDDLEPORT, NY 14105
                        </div>
                    </div>
                    
                    <div class="thank-you">
                        Thank you for your order.<br>
                        This is a packing slip not a bill.
                    </div>
                </div>

                <div class="thin-divider"></div>

                <div class="items-section">
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
