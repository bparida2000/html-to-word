const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { convertHTML: convertToWord, convertHTMLFile, validateHTML } = require('./converter-pandoc');
const { convertHTMLToPDF } = require('./converter-pdf');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
            cb(null, true);
        } else {
            cb(new Error('Only HTML files are allowed'));
        }
    },
});

// Routes

// Serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Convert HTML content to DOCX
app.post('/convert', async (req, res) => {
    try {
        const { html, options = {} } = req.body;

        // Validate HTML
        const validation = validateHTML(html);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Convert HTML to DOCX
        const docxBuffer = await convertToWord(html, options);

        // Set headers for file download with RFC 6266 compliance
        const filename = 'converted-document.docx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Length', docxBuffer.length);
        res.setHeader('X-Suggested-Filename', filename);

        // Send the DOCX file
        res.send(docxBuffer);
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: error.message || 'Failed to convert HTML to DOCX' });
    }
});

// Upload and convert HTML file
app.post('/upload', upload.single('htmlFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get HTML content from uploaded file
        const htmlContent = req.file.buffer.toString('utf-8');

        // Validate HTML
        const validation = validateHTML(htmlContent);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Parse options from request
        const options = {};
        if (req.body.orientation) options.orientation = req.body.orientation;
        if (req.body.title) options.title = req.body.title;

        // Convert HTML to Word (DOCX)
        const docxBuffer = await convertToWord(htmlContent, options);

        // Generate filename from original file
        const originalName = path.parse(req.file.originalname).name;
        const outputFilename = `${originalName}.docx`;

        // Set headers for file download with RFC 6266 compliance
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"; filename*=UTF-8''${encodeURIComponent(outputFilename)}`);
        res.setHeader('Content-Length', docxBuffer.length);
        res.setHeader('X-Suggested-Filename', outputFilename);

        // Send the DOCX file
        res.send(docxBuffer);
    } catch (error) {
        console.error('Upload conversion error:', error);
        res.status(500).json({ error: error.message || 'Failed to convert uploaded file' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'HTML to Word Converter' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
        }
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
});

// Convert HTML to PDF (NEW!)
app.post('/convert-pdf', async (req, res) => {
    try {
        const { html, options = {} } = req.body;

        // Validate HTML
        const validation = validateHTML(html);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Convert HTML to PDF using Puppeteer
        console.log('Converting to PDF...');
        const pdfBuffer = await convertHTMLToPDF(html, options);

        // Set headers for file download
        const filename = options.filename || 'converted-document.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send the PDF file as binary buffer
        res.end(pdfBuffer, 'binary');

    } catch (error) {
        console.error('PDF conversion error:', error);
        res.status(500).json({
            error: error.message || 'Failed to convert HTML to PDF'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 HTML Converter Server`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`✅ Word conversion: Pandoc`);
    console.log(`✅ PDF conversion: Puppeteer (pixel-perfect!)`);
    console.log(`\nBoth converters ready!\n`);
});

module.exports = app;
