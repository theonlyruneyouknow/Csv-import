const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class USDAOrganicIntegration {
    constructor() {
        this.baseUrl = 'https://organic.ams.usda.gov/integrity';
        this.searchUrl = `${this.baseUrl}/Home`;
    }

    /**
     * Search for a vendor in the USDA Organic Database
     * @param {string} vendorName - Name of the vendor to search for
     * @returns {Promise<Object>} Search results with vendor details
     */
    async searchVendor(vendorName) {
        try {
            console.log(`🔍 Searching USDA database for: ${vendorName}`);

            // First, get the search page to understand the form structure
            const searchPage = await axios.get(this.searchUrl);
            const $ = cheerio.load(searchPage.data);

            // Extract form data and search parameters
            const formData = new URLSearchParams();
            formData.append('searchText', vendorName);
            formData.append('searchType', 'operation'); // Search for operations

            // Perform the search
            const searchResponse = await axios.post(`${this.baseUrl}/SearchResults`, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': this.searchUrl
                }
            });

            const searchResults = cheerio.load(searchResponse.data);
            const results = [];

            // Parse search results
            searchResults('table tbody tr').each((index, element) => {
                const row = searchResults(element);
                const operationName = row.find('td:nth-child(1)').text().trim();
                const city = row.find('td:nth-child(2)').text().trim();
                const state = row.find('td:nth-child(3)').text().trim();
                const certificateLink = row.find('td:nth-child(4) a').attr('href');

                if (operationName && certificateLink) {
                    results.push({
                        operationName,
                        city,
                        state,
                        certificateLink: `${this.baseUrl}${certificateLink}`
                    });
                }
            });

            return results;
        } catch (error) {
            console.error(`❌ Error searching for ${vendorName}:`, error.message);
            return [];
        }
    }

    /**
     * Get vendor details from their certificate page
     * @param {string} certificateUrl - URL to the vendor's certificate page
     * @returns {Promise<Object>} Vendor details including download links
     */
    async getVendorDetails(certificateUrl) {
        try {
            console.log(`📋 Fetching vendor details from: ${certificateUrl}`);

            const response = await axios.get(certificateUrl);
            const $ = cheerio.load(response.data);

            // Extract vendor information
            const vendorInfo = {
                operationName: $('h2').first().text().trim(),
                address: $('.operation-address').text().trim(),
                certifier: $('.certifier-name').text().trim(),
                certificateNumber: $('.certificate-number').text().trim(),
                effectiveDate: $('.effective-date').text().trim(),
                anniversaryDate: $('.anniversary-date').text().trim(),
                products: []
            };

            // Find download links
            const certificateDownloadLink = $('a:contains("Print Certificate")').attr('href');
            const operationalProfileLink = $('a:contains("Export to PDF")').attr('href');

            if (certificateDownloadLink) {
                vendorInfo.certificateDownloadUrl = `${this.baseUrl}${certificateDownloadLink}`;
            }

            if (operationalProfileLink) {
                vendorInfo.operationalProfileUrl = `${this.baseUrl}${operationalProfileLink}`;
            }

            // Extract certified products
            $('.products-table tbody tr').each((index, element) => {
                const row = $(element);
                const product = {
                    category: row.find('td:nth-child(1)').text().trim(),
                    subcategory: row.find('td:nth-child(2)').text().trim(),
                    product: row.find('td:nth-child(3)').text().trim(),
                    description: row.find('td:nth-child(4)').text().trim()
                };

                if (product.product) {
                    vendorInfo.products.push(product);
                }
            });

            return vendorInfo;
        } catch (error) {
            console.error(`❌ Error fetching vendor details:`, error.message);
            return null;
        }
    }

    /**
     * Download a PDF from USDA database
     * @param {string} downloadUrl - URL to download the PDF
     * @param {string} filename - Local filename to save the PDF
     * @returns {Promise<Buffer>} PDF data as buffer
     */
    async downloadPDF(downloadUrl, filename) {
        try {
            console.log(`📥 Downloading PDF: ${filename}`);

            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'Accept': 'application/pdf,*/*'
                }
            });

            const pdfBuffer = Buffer.from(response.data);

            // Optionally save to local file for debugging
            if (process.env.SAVE_PDFS_LOCALLY === 'true') {
                const localPath = path.join(__dirname, 'downloads', filename);
                fs.mkdirSync(path.dirname(localPath), { recursive: true });
                fs.writeFileSync(localPath, pdfBuffer);
                console.log(`💾 Saved locally: ${localPath}`);
            }

            return pdfBuffer;
        } catch (error) {
            console.error(`❌ Error downloading PDF ${filename}:`, error.message);
            return null;
        }
    }

    /**
     * Convert PDF buffer to base64 for MongoDB storage
     * @param {Buffer} pdfBuffer - PDF data buffer
     * @returns {string} Base64 encoded PDF data
     */
    pdfToBase64(pdfBuffer) {
        return pdfBuffer.toString('base64');
    }

    /**
     * Complete integration: search, fetch details, and download documents
     * @param {string} vendorName - Name of vendor to process
     * @param {string} organicDatabaseId - Optional database ID for direct lookup
     * @returns {Promise<Object>} Complete vendor data with documents
     */
    async processVendor(vendorName, organicDatabaseId = null) {
        try {
            console.log(`\n🌱 Processing vendor: ${vendorName}`);

            let vendorDetails = null;

            if (organicDatabaseId) {
                // Direct lookup using database ID
                const directUrl = `${this.baseUrl}/CP/OPP?cid=45&nopid=${organicDatabaseId}&ret=Home&retName=Home`;
                vendorDetails = await this.getVendorDetails(directUrl);
            } else {
                // Search for vendor
                const searchResults = await this.searchVendor(vendorName);
                if (searchResults.length === 0) {
                    console.log(`❌ No results found for ${vendorName}`);
                    return null;
                }

                // Use the first result (could be enhanced to match better)
                vendorDetails = await this.getVendorDetails(searchResults[0].certificateLink);
            }

            if (!vendorDetails) {
                console.log(`❌ Could not fetch details for ${vendorName}`);
                return null;
            }

            // Download documents
            const documents = {};

            if (vendorDetails.certificateDownloadUrl) {
                const certificateFilename = `${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_certificate.pdf`;
                const certificatePDF = await this.downloadPDF(vendorDetails.certificateDownloadUrl, certificateFilename);

                if (certificatePDF) {
                    documents.certificate = {
                        filename: certificateFilename,
                        data: this.pdfToBase64(certificatePDF),
                        mimeType: 'application/pdf',
                        uploadDate: new Date(),
                        source: 'USDA Organic Database'
                    };
                }
            }

            if (vendorDetails.operationalProfileUrl) {
                const profileFilename = `${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_operational_profile.pdf`;
                const profilePDF = await this.downloadPDF(vendorDetails.operationalProfileUrl, profileFilename);

                if (profilePDF) {
                    documents.operationsProfile = {
                        filename: profileFilename,
                        data: this.pdfToBase64(profilePDF),
                        mimeType: 'application/pdf',
                        uploadDate: new Date(),
                        source: 'USDA Organic Database'
                    };
                }
            }

            return {
                vendorDetails,
                documents,
                certifiedProducts: vendorDetails.products
            };

        } catch (error) {
            console.error(`❌ Error processing vendor ${vendorName}:`, error.message);
            return null;
        }
    }
}

module.exports = USDAOrganicIntegration;
