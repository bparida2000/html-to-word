const puppeteer = require('puppeteer');
const fs = require('fs').promises;

/**
 * Convert HTML to PDF using Puppeteer (Pixel-Perfect!)
 * 
 * This renders HTML exactly as Chrome would display it,
 * ensuring perfect fidelity with your original design.
 */
async function convertHTMLToPDF(htmlContent, options = {}) {
    let browser;

    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({
            width: options.width || 1200,
            height: options.height || 1600,
            deviceScaleFactor: 2, // High quality rendering
        });

        console.log('Loading HTML content...');
        await page.setContent(htmlContent, {
            waitUntil: ['networkidle0', 'load'],
            timeout: 30000
        });

        // Wait for any web fonts to load
        await page.evaluateHandle('document.fonts.ready');

        console.log('Generating PDF...');
        const pdfOptions = {
            format: options.format || 'A4',
            printBackground: true, // Include background colors and images
            preferCSSPageSize: true, // Respect CSS @page rules
            margin: options.margin || {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            displayHeaderFooter: false,
        };

        // Landscape orientation if specified
        if (options.orientation === 'landscape') {
            pdfOptions.landscape = true;
        }

        const pdfBuffer = await page.pdf(pdfOptions);

        console.log(`✅ PDF generated (${(pdfBuffer.length / 1024).toFixed(1)}KB)`);

        await browser.close();
        return pdfBuffer;

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('PDF conversion error:', error);
        throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
    }
}

/**
 * Convert HTML file to PDF file
 */
async function convertHTMLFileToPDF(inputPath, outputPath, options = {}) {
    try {
        const htmlContent = await fs.readFile(inputPath, 'utf-8');
        const pdfBuffer = await convertHTMLToPDF(htmlContent, options);

        await fs.writeFile(outputPath, pdfBuffer);

        console.log(`Successfully converted ${inputPath} to ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('File conversion error:', error);
        throw error;
    }
}

/**
 * Validate HTML content
 */
function validateHTML(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return { valid: false, error: 'HTML content must be a non-empty string' };
    }

    if (htmlContent.trim().length === 0) {
        return { valid: false, error: 'HTML content cannot be empty' };
    }

    return { valid: true };
}

module.exports = {
    convertHTMLToPDF,
    convertHTMLFileToPDF,
    validateHTML,
};
