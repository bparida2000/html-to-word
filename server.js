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

// Capture HTML from URL using Puppeteer with PIXEL-PERFECT computed styles
app.post('/capture-url', async (req, res) => {
    const puppeteer = require('puppeteer');
    let browser = null;

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        console.log(`🔍 Capturing page from: ${url}`);

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });

        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });

        // Navigate to URL with timeout
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Wait for any animations/lazy loading to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📸 Extracting computed styles from all elements...');

        // Get the full HTML content with COMPUTED INLINE STYLES on every element
        const html = await page.evaluate(() => {
            // Function to get all computed styles as inline style string
            function getComputedStyleString(element) {
                const computed = window.getComputedStyle(element);
                const styles = [];

                // Important CSS properties to preserve for pixel-perfect output
                const importantProps = [
                    // Layout
                    'display', 'position', 'float', 'clear',
                    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
                    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                    'top', 'right', 'bottom', 'left',
                    'box-sizing', 'overflow', 'overflow-x', 'overflow-y',

                    // Flexbox
                    'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-basis',
                    'justify-content', 'align-items', 'align-content', 'align-self', 'order', 'gap',

                    // Grid
                    'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap', 'grid-column', 'grid-row',

                    // Typography
                    'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
                    'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration',
                    'text-transform', 'text-indent', 'white-space', 'word-wrap', 'word-break',

                    // Colors & Background
                    'color', 'background', 'background-color', 'background-image', 'background-size',
                    'background-position', 'background-repeat', 'background-attachment',

                    // Border
                    'border', 'border-width', 'border-style', 'border-color',
                    'border-top', 'border-right', 'border-bottom', 'border-left',
                    'border-radius', 'border-top-left-radius', 'border-top-right-radius',
                    'border-bottom-left-radius', 'border-bottom-right-radius',

                    // Effects
                    'box-shadow', 'text-shadow', 'opacity', 'visibility',
                    'transform', 'transform-origin',

                    // List
                    'list-style', 'list-style-type', 'list-style-position', 'list-style-image',

                    // Table
                    'border-collapse', 'border-spacing', 'table-layout', 'vertical-align',

                    // Other
                    'z-index', 'cursor', 'outline'
                ];

                importantProps.forEach(prop => {
                    const value = computed.getPropertyValue(prop);
                    if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px' && value !== 'rgba(0, 0, 0, 0)') {
                        styles.push(`${prop}: ${value}`);
                    }
                });

                return styles.join('; ');
            }

            // Function to convert images to base64
            async function imageToBase64(imgElement) {
                return new Promise((resolve) => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgElement.naturalWidth || imgElement.width;
                        canvas.height = imgElement.naturalHeight || imgElement.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(imgElement, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } catch (e) {
                        resolve(imgElement.src);
                    }
                });
            }

            // Clone the body and process all elements
            const bodyClone = document.body.cloneNode(true);

            // Apply computed styles to all elements in the clone
            const allElements = bodyClone.querySelectorAll('*');
            const originalElements = document.body.querySelectorAll('*');

            allElements.forEach((el, index) => {
                if (originalElements[index]) {
                    const styleString = getComputedStyleString(originalElements[index]);
                    if (styleString) {
                        el.setAttribute('style', styleString);
                    }
                }
            });

            // Apply styles to body itself
            const bodyStyles = getComputedStyleString(document.body);
            bodyClone.setAttribute('style', bodyStyles);

            // Get any @font-face rules
            let fontFaces = '';
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    if (sheet.cssRules) {
                        Array.from(sheet.cssRules).forEach(rule => {
                            if (rule.cssText.includes('@font-face')) {
                                fontFaces += rule.cssText + '\n';
                            }
                        });
                    }
                } catch (e) { }
            });

            // Construct the final HTML
            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Font faces */
        ${fontFaces}
        
        /* Base body styles */
        body {
            ${bodyStyles}
        }
    </style>
</head>
<body style="${bodyStyles}">
${bodyClone.innerHTML}
</body>
</html>`;
        });

        await browser.close();
        browser = null;

        console.log(`✅ Captured ${(html.length / 1024).toFixed(1)}KB of pixel-perfect HTML`);

        res.json({
            success: true,
            html: html,
            url: url,
            size: html.length
        });

    } catch (error) {
        console.error('URL capture error:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({
            error: error.message || 'Failed to capture page from URL'
        });
    }
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
