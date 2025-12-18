const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { convertHTMLToPDF, convertHTMLFileToPDF, validateHTML } = require('./converter-pdf');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'HTML to PDF Converter' });
});


// Convert HTML content to PDF
app.post('/convert-pdf', async (req, res) => {
    try {
        const { html, options = {} } = req.body;

        // Validate HTML
        const validation = validateHTML(html);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Convert HTML to PDF
        const pdfBuffer = await convertHTMLToPDF(html, options);

        // Set headers for file download with RFC 6266 compliance
        const filename = options.filename || 'converted-document.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('X-Suggested-Filename', filename);

        // Send the PDF file
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({
            error: error.message || 'Failed to convert HTML to PDF'
        });
    }
});

// Upload and convert HTML file to PDF
app.post('/upload-pdf', upload.single('htmlFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const htmlContent = req.file.buffer.toString('utf-8');

        // Validate HTML
        const validation = validateHTML(htmlContent);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Get options from form data
        const options = {
            format: req.body.format || 'A4',
            orientation: req.body.orientation || 'portrait',
        };

        // Convert to PDF
        const pdfBuffer = await convertHTMLToPDF(htmlContent, options);

        // Generate output filename
        const originalName = path.parse(req.file.originalname).name;
        const outputFilename = `${originalName}.pdf`;

        // Set headers for file download with RFC 6266 compliance
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"; filename*=UTF-8''${encodeURIComponent(outputFilename)}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('X-Suggested-Filename', outputFilename);

        // Send the PDF file
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Upload conversion error:', error);
        res.status(500).json({
            error: error.message || 'Failed to convert uploaded file to PDF'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 HTML to PDF Converter Server`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`✅ Ready to convert HTML to pixel-perfect PDFs!\n`);
});

module.exports = app;
