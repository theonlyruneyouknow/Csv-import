const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Papa = require('papaparse');

class DropshipFileAnalyzer {
    constructor(uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    // Analyze all files and understand the data structure
    async analyzeAllFiles() {
        const files = fs.readdirSync(this.uploadsDir);
        const analysis = {
            inputFiles: [],
            outputFiles: [],
            dataStructure: {},
            relationships: []
        };

        for (const filename of files) {
            const filepath = path.join(this.uploadsDir, filename);
            const originalName = filename.split('-').slice(1).join('-');
            
            try {
                const fileAnalysis = await this.analyzeFile(filepath, originalName);
                
                // Categorize files
                if (this.isOutputFile(originalName)) {
                    analysis.outputFiles.push(fileAnalysis);
                } else {
                    analysis.inputFiles.push(fileAnalysis);
                }
                
                analysis.dataStructure[originalName] = fileAnalysis;
            } catch (error) {
                console.error(`Error analyzing ${filename}:`, error.message);
            }
        }

        return analysis;
    }

    // Determine if a file is an output/results file
    isOutputFile(filename) {
        const outputIndicators = [
            'dixondale postback', 'dixondale tracking', 'territorial_', 'orders 4.14.25.pdf'
        ];
        const lowerFilename = filename.toLowerCase();
        
        return outputIndicators.some(indicator => 
            lowerFilename.includes(indicator.toLowerCase())
        );
    }

    // Analyze individual file structure
    async analyzeFile(filepath, originalName) {
        const ext = path.extname(filepath).toLowerCase();
        const stats = fs.statSync(filepath);
        
        const analysis = {
            filename: originalName,
            extension: ext,
            size: stats.size,
            headers: [],
            sampleData: [],
            rowCount: 0,
            structure: {}
        };

        try {
            switch (ext) {
                case '.csv':
                    analysis.data = this.analyzeCsvFile(filepath);
                    break;
                case '.xlsx':
                case '.xls':
                    analysis.data = this.analyzeExcelFile(filepath);
                    break;
                case '.pdf':
                    analysis.data = { type: 'PDF', note: 'PDF analysis requires special handling' };
                    break;
                default:
                    analysis.data = { type: 'Unknown', note: 'Unsupported file type' };
            }
        } catch (error) {
            analysis.error = error.message;
        }

        return analysis;
    }

    // Analyze CSV files
    analyzeCsvFile(filepath) {
        const content = fs.readFileSync(filepath, 'utf8');
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
        
        return {
            type: 'CSV',
            headers: parsed.meta.fields || [],
            rowCount: parsed.data.length,
            sampleData: parsed.data.slice(0, 5), // First 5 rows
            allData: parsed.data
        };
    }

    // Analyze Excel files
    analyzeExcelFile(filepath) {
        const workbook = XLSX.readFile(filepath);
        const sheetNames = workbook.SheetNames;
        const analysis = {
            type: 'Excel',
            sheets: {}
        };

        sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
                const headers = jsonData[0] || [];
                const dataRows = jsonData.slice(1);
                
                analysis.sheets[sheetName] = {
                    headers: headers,
                    rowCount: dataRows.length,
                    sampleData: dataRows.slice(0, 5),
                    allData: dataRows
                };
            }
        });

        return analysis;
    }

    // Map relationships between input and output files
    mapDataRelationships(analysis) {
        const relationships = [];
        
        // Look for common column names between input and output files
        analysis.outputFiles.forEach(outputFile => {
            if (outputFile.data && outputFile.data.headers) {
                const outputHeaders = outputFile.data.headers;
                
                analysis.inputFiles.forEach(inputFile => {
                    if (inputFile.data && inputFile.data.type === 'Excel') {
                        Object.keys(inputFile.data.sheets).forEach(sheetName => {
                            const inputHeaders = inputFile.data.sheets[sheetName].headers;
                            const commonFields = this.findCommonFields(inputHeaders, outputHeaders);
                            
                            if (commonFields.length > 0) {
                                relationships.push({
                                    inputFile: inputFile.filename,
                                    inputSheet: sheetName,
                                    outputFile: outputFile.filename,
                                    commonFields: commonFields,
                                    similarity: commonFields.length / Math.max(inputHeaders.length, outputHeaders.length)
                                });
                            }
                        });
                    } else if (inputFile.data && inputFile.data.headers) {
                        const commonFields = this.findCommonFields(inputFile.data.headers, outputHeaders);
                        if (commonFields.length > 0) {
                            relationships.push({
                                inputFile: inputFile.filename,
                                outputFile: outputFile.filename,
                                commonFields: commonFields,
                                similarity: commonFields.length / Math.max(inputFile.data.headers.length, outputHeaders.length)
                            });
                        }
                    }
                });
            }
        });

        return relationships.sort((a, b) => b.similarity - a.similarity);
    }

    // Find common field names between two arrays
    findCommonFields(headers1, headers2) {
        if (!headers1 || !headers2) return [];
        
        return headers1.filter(header1 => 
            headers2.some(header2 => 
                this.normalizeFieldName(header1) === this.normalizeFieldName(header2)
            )
        );
    }

    // Normalize field names for comparison
    normalizeFieldName(fieldName) {
        if (!fieldName) return '';
        return fieldName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Generate processing plan based on analysis
    generateProcessingPlan(analysis) {
        const relationships = this.mapDataRelationships(analysis);
        
        const plan = {
            summary: {
                inputFiles: analysis.inputFiles.length,
                outputFiles: analysis.outputFiles.length,
                totalRelationships: relationships.length
            },
            steps: [],
            outputTargets: analysis.outputFiles.map(file => ({
                filename: file.filename,
                type: file.data?.type || 'Unknown',
                structure: file.data?.headers || []
            }))
        };

        // Generate processing steps for each output file
        analysis.outputFiles.forEach(outputFile => {
            const relevantInputs = relationships.filter(rel => rel.outputFile === outputFile.filename);
            
            plan.steps.push({
                outputFile: outputFile.filename,
                inputSources: relevantInputs,
                processingMethod: this.determineProcessingMethod(outputFile, relevantInputs),
                requiredTransformations: this.identifyTransformations(outputFile, relevantInputs)
            });
        });

        // 🔥 NEW: Generate outputs from input data if no output files exist
        if (analysis.outputFiles.length === 0 && analysis.inputFiles.length > 0) {
            console.log('🎯 No output files detected. Checking input files for order data...');
            
            // Look for order data in input files
            for (const inputFile of analysis.inputFiles) {
                if (this.containsOrderData(inputFile)) {
                    console.log(`📦 Found order data in ${inputFile.filename}. Generating PDF report step...`);
                    
                    // Add step to generate Orders PDF report
                    plan.steps.push({
                        outputFile: 'Orders ' + new Date().toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: '2-digit' 
                        }).replace(/\//g, '.') + '.pdf',
                        inputSources: [{
                            inputFile: inputFile.filename,
                            relationship: 'contains_order_data',
                            confidence: 0.95
                        }],
                        processingMethod: 'pdf_report_generation',
                        requiredTransformations: ['group_by_order', 'format_packing_slips', 'add_logos']
                    });
                    
                    // Update summary
                    plan.summary.outputFiles = 1;
                    plan.outputTargets.push({
                        filename: 'Orders ' + new Date().toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: '2-digit' 
                        }).replace(/\//g, '.') + '.pdf',
                        type: 'PDF',
                        structure: ['Packing Slips with Logos']
                    });
                    
                    break; // Only need one orders file
                }
            }
        }

        return plan;
    }

    // Check if a file contains order data suitable for generating packing slips
    containsOrderData(inputFile) {
        if (!inputFile.data || inputFile.data.type !== 'Excel') {
            return false;
        }
        
        // Look through all sheets in the Excel file
        for (const [sheetName, sheetData] of Object.entries(inputFile.data.sheets || {})) {
            const headers = sheetData.headers || [];
            
            // Check for order-related headers
            const hasOrderNumber = headers.some(h => 
                h && (h.toLowerCase().includes('order') || h.toLowerCase().includes('document'))
            );
            const hasCustomerInfo = headers.some(h => 
                h && (h.toLowerCase().includes('customer') || h.toLowerCase().includes('shipping') || h.toLowerCase().includes('name'))
            );
            const hasItemInfo = headers.some(h => 
                h && (h.toLowerCase().includes('item') || h.toLowerCase().includes('sku') || h.toLowerCase().includes('desc'))
            );
            const hasQuantity = headers.some(h => 
                h && (h.toLowerCase().includes('qty') || h.toLowerCase().includes('quantity') || h.toLowerCase().includes('committed'))
            );
            
            // Must have sufficient data rows
            const hasData = sheetData.rowCount > 10;
            
            if (hasOrderNumber && hasCustomerInfo && hasItemInfo && hasQuantity && hasData) {
                console.log(`✅ Sheet "${sheetName}" in ${inputFile.filename} contains order data:`, {
                    hasOrderNumber, hasCustomerInfo, hasItemInfo, hasQuantity, 
                    rowCount: sheetData.rowCount,
                    headers: headers.slice(0, 5) + '...'
                });
                return true;
            }
        }
        
        return false;
    }

    // Determine the best processing method for each output
    determineProcessingMethod(outputFile, inputSources) {
        if (outputFile.filename.toLowerCase().includes('postback')) {
            return 'postback_generation';
        } else if (outputFile.filename.toLowerCase().includes('tracking')) {
            return 'tracking_compilation';
        } else if (outputFile.filename.toLowerCase().includes('territorial')) {
            return 'territorial_mapping';
        } else if (outputFile.filename.toLowerCase().includes('orders')) {
            return 'pdf_report_generation';
        }
        return 'generic_transformation';
    }

    // Identify required data transformations
    identifyTransformations(outputFile, inputSources) {
        const transformations = [];
        
        // Basic transformations based on file patterns
        if (outputFile.filename.toLowerCase().includes('postback')) {
            transformations.push('aggregate_order_data', 'format_for_vendor', 'calculate_totals');
        }
        
        if (outputFile.filename.toLowerCase().includes('tracking')) {
            transformations.push('extract_tracking_info', 'format_shipping_data');
        }
        
        if (inputSources.length > 1) {
            transformations.push('merge_multiple_sources');
        }
        
        transformations.push('validate_data', 'format_output');
        
        return transformations;
    }
}

module.exports = DropshipFileAnalyzer;
