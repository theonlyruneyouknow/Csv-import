const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DropshipFileAnalyzer = require('../dropship/DropshipFileAnalyzer');
const DropshipProcessor = require('../dropship/DropshipProcessor');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../dropship/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original filename with timestamp prefix
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept various file types (CSV, Excel, PDF, etc.)
        const allowedTypes = /csv|xlsx|xls|pdf|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || 
                        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.mimetype === 'application/vnd.ms-excel' ||
                        file.mimetype === 'text/csv' ||
                        file.mimetype === 'application/pdf';
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only CSV, Excel, PDF, and text files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Dashboard route
router.get('/', (req, res) => {
    // Get list of uploaded files
    const uploadsDir = path.join(__dirname, '../dropship/uploads');
    const processedDir = path.join(__dirname, '../dropship/processed');
    
    let uploadedFiles = [];
    let processedFiles = [];
    
    if (fs.existsSync(uploadsDir)) {
        uploadedFiles = fs.readdirSync(uploadsDir).map(filename => {
            const filepath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filepath);
            return {
                filename: filename,
                originalName: filename.split('-').slice(1).join('-'), // Remove timestamp prefix
                size: (stats.size / 1024).toFixed(2) + ' KB',
                uploadDate: stats.mtime.toLocaleDateString()
            };
        });
    }

    if (fs.existsSync(processedDir)) {
        processedFiles = fs.readdirSync(processedDir)
            .filter(file => file !== '.gitkeep')
            .map(filename => {
                const filepath = path.join(processedDir, filename);
                const stats = fs.statSync(filepath);
                const ext = path.extname(filename).toLowerCase();
                
                return {
                    filename: filename,
                    size: (stats.size / 1024).toFixed(2) + ' KB',
                    extension: ext,
                    modified: stats.mtime.toLocaleDateString()
                };
            });
    }
    
    res.render('dropship-dashboard', { uploadedFiles, processedFiles });
});

// File upload route - handles multiple files
router.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: (file.size / 1024).toFixed(2) + ' KB',
            path: file.path
        }));

        res.json({ 
            success: true, 
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// File analysis route
router.get('/analyze/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../dropship/uploads', filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    try {
        const analyzer = new DropshipFileAnalyzer(path.join(__dirname, '../dropship/uploads'));
        const originalName = filename.split('-').slice(1).join('-');
        const analysis = await analyzer.analyzeFile(filepath, originalName);
        
        res.json({ 
            success: true, 
            analysis: analysis,
            isOutputFile: analyzer.isOutputFile(originalName)
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed: ' + error.message });
    }
});

// Full analysis route - analyze all files and their relationships
router.get('/analyze-all', async (req, res) => {
    try {
        const analyzer = new DropshipFileAnalyzer(path.join(__dirname, '../dropship/uploads'));
        const fullAnalysis = await analyzer.analyzeAllFiles();
        const plan = analyzer.generateProcessingPlan(fullAnalysis);
        
        res.json({ 
            success: true, 
            analysis: fullAnalysis,
            processingPlan: plan
        });
    } catch (error) {
        console.error('Full analysis error:', error);
        res.status(500).json({ error: 'Analysis failed: ' + error.message });
    }
});

// Delete file route
router.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../dropship/uploads', filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    try {
        fs.unlinkSync(filepath);
        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Process files route - POST method
router.post('/process', async (req, res) => {
    console.log('🔄 Processing request received (POST)...');
    
    const uploadsDir = path.join(__dirname, '../dropship/uploads');
    console.log('📁 Uploads directory:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('❌ Uploads directory not found');
        return res.status(400).json({ error: 'No uploads directory found' });
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log('📄 Files found:', files.length, files);
    
    if (files.length === 0) {
        console.log('❌ No files to process');
        return res.status(400).json({ error: 'No files to process' });
    }
    
    try {
        console.log('🚀 Starting dropship file processing...');
        const processor = new DropshipProcessor(uploadsDir);
        console.log('✅ DropshipProcessor created successfully');
        
        const results = await processor.processAllFiles();
        console.log('✅ Processing completed:', results.success);
        
        if (results.success) {
            res.json({
                success: true,
                message: 'Files processed successfully',
                analysis: results.analysis,
                processingPlan: results.plan,
                results: results.results
            });
        } else {
            console.log('❌ Processing failed:', results.error);
            res.status(500).json({
                success: false,
                error: results.error
            });
        }
    } catch (error) {
        console.error('💥 Processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Processing failed: ' + error.message
        });
    }
});

// Process files route - GET method
router.get('/process', async (req, res) => {
    console.log('🔄 Processing request received (GET)...');
    
    const uploadsDir = path.join(__dirname, '../dropship/uploads');
    console.log('📁 Uploads directory:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('❌ Uploads directory not found');
        return res.status(400).json({ error: 'No uploads directory found' });
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log('📄 Files found:', files.length, files);
    
    if (files.length === 0) {
        console.log('❌ No files to process');
        return res.status(400).json({ error: 'No files to process' });
    }
    
    try {
        console.log('🚀 Starting dropship file processing...');
        const processor = new DropshipProcessor(uploadsDir);
        console.log('✅ DropshipProcessor created successfully');
        
        const results = await processor.processAllFiles();
        console.log('✅ Processing completed:', results.success);
        
        if (results.success) {
            res.json({
                success: true,
                message: 'Files processed successfully',
                analysis: results.analysis,
                processingPlan: results.plan,
                results: results.results
            });
        } else {
            console.log('❌ Processing failed:', results.error);
            res.status(500).json({
                success: false,
                error: results.error
            });
        }
    } catch (error) {
        console.error('💥 Processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Processing failed: ' + error.message
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    console.log('🧪 Test endpoint hit!');
    res.json({ success: true, message: 'Test endpoint working!' });
});

// Download processed file
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const processedDir = path.join(__dirname, '../dropship/processed');
        const filePath = path.join(processedDir, filename);

        // Security check - ensure file is in processed directory
        if (!filePath.startsWith(processedDir)) {
            return res.status(400).json({ success: false, error: 'Invalid file path' });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Set appropriate headers for download
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.csv') {
            contentType = 'text/csv';
        } else if (ext === '.xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (ext === '.pdf') {
            contentType = 'application/pdf';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send file
        res.sendFile(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ success: false, error: 'Download failed: ' + error.message });
    }
});

// Preview file content
router.get('/preview/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const processedDir = path.join(__dirname, '../dropship/processed');
        const filePath = path.join(processedDir, filename);

        // Security check - ensure file is in processed directory
        if (!filePath.startsWith(processedDir)) {
            return res.status(400).json({ success: false, error: 'Invalid file path' });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        const ext = path.extname(filename).toLowerCase();
        
        if (ext === '.csv' || ext === '.txt') {
            // Read text file content
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({
                success: true,
                content: content,
                fileType: ext.substring(1)
            });
        } else if (ext === '.xlsx') {
            // For Excel files, we'll convert to CSV for preview
            const XLSX = require('xlsx');
            const workbook = XLSX.readFile(filePath);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvContent = XLSX.utils.sheet_to_csv(worksheet);
            
            res.json({
                success: true,
                content: csvContent,
                fileType: 'csv'
            });
        } else if (ext === '.pdf') {
            // For PDF files, send the actual PDF for browser preview
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            const pdfBuffer = fs.readFileSync(filePath);
            res.send(pdfBuffer);
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'File type not supported for preview' 
            });
        }
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Preview failed: ' + error.message 
        });
    }
});

// Delete uploaded file
router.delete('/file/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const uploadsDir = path.join(__dirname, '../dropship/uploads');
        const filePath = path.join(uploadsDir, filename);

        // Security check
        if (!filePath.startsWith(uploadsDir)) {
            return res.status(400).json({ success: false, error: 'Invalid file path' });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'File deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete file: ' + error.message });
    }
});

// Move uploaded file to archive
router.post('/file/:filename/archive', (req, res) => {
    try {
        const filename = req.params.filename;
        const uploadsDir = path.join(__dirname, '../dropship/uploads');
        const archiveDir = path.join(__dirname, '../dropship/archive');
        const filePath = path.join(uploadsDir, filename);
        const archivePath = path.join(archiveDir, filename);

        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        // Security check
        if (!filePath.startsWith(uploadsDir)) {
            return res.status(400).json({ success: false, error: 'Invalid file path' });
        }

        if (fs.existsSync(filePath)) {
            // Move file to archive
            fs.renameSync(filePath, archivePath);
            res.json({ success: true, message: 'File archived successfully' });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('Archive error:', error);
        res.status(500).json({ success: false, error: 'Failed to archive file: ' + error.message });
    }
});

// Delete processed file
router.delete('/processed/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const processedDir = path.join(__dirname, '../dropship/processed');
        const filePath = path.join(processedDir, filename);

        // Security check
        if (!filePath.startsWith(processedDir)) {
            return res.status(400).json({ success: false, error: 'Invalid file path' });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Processed file deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete processed file error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete processed file: ' + error.message });
    }
});

module.exports = router;
