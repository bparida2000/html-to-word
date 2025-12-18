const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Convert HTML to DOCX using Pandoc
 */
async function convertHTML(htmlContent, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create temp files
            const tempDir = os.tmpdir();
            const timestamp = Date.now();
            const tempHTML = path.join(tempDir, `html2word-${timestamp}.html`);
            const tempDOCX = path.join(tempDir, `html2word-${timestamp}.docx`);

            // Write HTML to temp file
            await fs.writeFile(tempHTML, htmlContent, 'utf-8');

            // Build pandoc arguments
            const pandocArgs = [
                tempHTML,
                '-f', 'html',
                '-t', 'docx',
                '-o', tempDOCX,
                '--standalone',
            ];

            // Add title if provided
            if (options.title) {
                pandocArgs.push('--metadata', `title=${options.title}`);
            }

            // Add orientation if provided
            if (options.orientation === 'landscape') {
                pandocArgs.push('--variable', 'geometry:landscape');
            }

            console.log('Running pandoc...');

            // Run pandoc
            const pandoc = spawn('pandoc', pandocArgs);

            let stderr = '';

            pandoc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pandoc.on('error', async (error) => {
                try { await fs.unlink(tempHTML); } catch (e) { }
                reject(new Error(`Pandoc execution failed: ${error.message}`));
            });

            pandoc.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const buffer = await fs.readFile(tempDOCX);
                        await fs.unlink(tempHTML);
                        await fs.unlink(tempDOCX);
                        console.log(`✅ Word conversion successful! ${buffer.length} bytes`);
                        resolve(buffer);
                    } catch (error) {
                        reject(new Error(`Failed to read DOCX: ${error.message}`));
                    }
                } else {
                    try { await fs.unlink(tempHTML); } catch (e) { }
                    try { await fs.unlink(tempDOCX); } catch (e) { }
                    reject(new Error(`Pandoc failed: ${stderr}`));
                }
            });

        } catch (error) {
            reject(new Error(`Conversion error: ${error.message}`));
        }
    });
}

/**
 * Convert HTML file to DOCX file
 */
async function convertHTMLFile(inputPath, outputPath, options = {}) {
    try {
        const htmlContent = await fs.readFile(inputPath, 'utf-8');
        const docxBuffer = await convertHTML(htmlContent, options);

        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        await fs.writeFile(outputPath, docxBuffer);

        console.log(`Converted ${inputPath} to ${outputPath}`);
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

    const hasHTMLTags = /<[^>]+>/.test(htmlContent);
    if (!hasHTMLTags) {
        return { valid: false, error: 'Content does not appear to contain HTML tags' };
    }

    return { valid: true };
}

module.exports = {
    convertHTML,
    convertHTMLFile,
    validateHTML,
};
