const puppeteer = require('puppeteer');
const docx = require('docx');
const fs = require('fs');
const { validateHTML } = require('./converter-pandoc');

// Helper to convert px to Docx generic sizes (pixels generally)
const pxToTwip = (px) => Math.round(px * 15);
const pxToHp = (px) => Math.max(2, Math.round(px * 1.5)); // half-points for font sizes

async function convertHTMLToWordHF(htmlContent, options = {}) {
    let browser;
    try {
        console.log('🚀 Starting Natural Flow High-Fidelity Word Conversion...');

        // Define page dimensions
        let pageWidthPx = 794;  // A4 Portrait width in px (at 96 DPI)
        let pageHeightPx = 1123; // A4 Portrait height in px

        if (options.format === 'slide') {
            pageWidthPx = 960;  // 10 inches
            pageHeightPx = 540; // 5.625 inches
        } else if (options.orientation === 'landscape') {
            pageWidthPx = 1123;
            pageHeightPx = 794;
        }

        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        // Set viewport to the exact width we want
        await page.setViewport({ width: pageWidthPx, height: pageHeightPx, deviceScaleFactor: 2 });

        // Load the HTML
        await page.setContent(htmlContent, { waitUntil: ['load', 'networkidle0'], timeout: 60000 });

        // Extract layout data (text nodes)
        console.log('📏 Extracting logical document stream...');
        const layoutData = await page.evaluate(() => {
            const items = [];

            function toHex(c) {
                const hex = parseInt(c).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            }

            // Walk the DOM for all visible text nodes in flow order
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, null, false);
            let node;
            let lastY = 0;

            while (node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (!text) continue;

                    const parent = node.parentElement;
                    if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT') continue;

                    const range = document.createRange();
                    range.selectNodeContents(node);
                    const rect = range.getBoundingClientRect();

                    if (rect.width === 0 || rect.height === 0) continue;

                    const style = window.getComputedStyle(parent);

                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

                    // Parse color
                    let colorHex = '000000';
                    const match = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (match) {
                        colorHex = toHex(match[1]) + toHex(match[2]) + toHex(match[3]);
                    }

                    // Calculate vertical gap from the previous block to create spacing equivalents
                    const gapY = Math.max(0, rect.top - lastY);
                    lastY = rect.bottom;

                    items.push({
                        text: text,
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height,
                        gapY: gapY,
                        fontSize: parseFloat(style.fontSize),
                        fontFamily: style.fontFamily,
                        color: colorHex,
                        bold: style.fontWeight >= 600 || style.fontWeight === 'bold',
                        italic: style.fontStyle === 'italic',
                        alignment: style.textAlign
                    });
                }
            }
            return items;
        });

        // Determine total height and number of pages
        let totalHeightPx = await page.evaluate(() => document.documentElement.scrollHeight);

        for (const item of layoutData) {
            if (item.y + item.height > totalHeightPx) {
                totalHeightPx = item.y + item.height;
            }
        }

        totalHeightPx = Math.max(pageHeightPx, totalHeightPx);
        const numPages = Math.ceil(totalHeightPx / pageHeightPx);
        console.log(`📄 Document will be ${numPages} page(s). Total height: ${totalHeightPx}px`);

        // Hide text and capture screenshots for each page
        await page.addStyleTag({ content: '* { color: transparent !important; text-shadow: none !important; } ::placeholder { color: transparent !important; }' });
        await new Promise(r => setTimeout(r, 200));

        const pageImages = [];
        console.log('📸 Capturing background images...');
        for (let i = 0; i < numPages; i++) {
            const clip = {
                x: 0,
                y: i * pageHeightPx,
                width: pageWidthPx,
                height: pageHeightPx
            };
            const buffer = await page.screenshot({ type: 'jpeg', quality: 90, clip });
            pageImages.push(buffer);
        }

        await browser.close();
        browser = null;

        console.log('🔨 Assembling high-fidelity Word document...');

        // Create document Sections
        const docSections = [];

        for (let i = 0; i < numPages; i++) {
            const pageYStart = i * pageHeightPx;
            const pageYEnd = (i + 1) * pageHeightPx;

            // Background image for this entire section
            const backgroundParagraph = new docx.Paragraph({
                children: [
                    new docx.ImageRun({
                        data: pageImages[i],
                        transformation: { width: pageWidthPx, height: pageHeightPx },
                        floating: {
                            horizontalPosition: { offset: 0 },
                            verticalPosition: { offset: 0 },
                            wrap: { type: docx.TextWrappingType.NONE },
                            behindDocument: true
                        }
                    })
                ]
            });

            // Isolate items on this page
            const pageTexts = layoutData.filter(item => {
                const centerY = item.y + (item.height / 2);
                return centerY >= pageYStart && centerY < pageYEnd;
            });

            // Map layout items to NORMAL flowing paragraphs (NO text boxes)
            const textParagraphs = pageTexts.map((item, index) => {
                let align = docx.AlignmentType.LEFT;
                if (item.alignment === 'center') align = docx.AlignmentType.CENTER;
                else if (item.alignment === 'right') align = docx.AlignmentType.RIGHT;
                else if (item.alignment === 'justify') align = docx.AlignmentType.JUSTIFIED;

                // Emulate visual gaps and margins directly in the paragraph spacing and indentation
                // So the text ends up exactly where the design elements are, but perfectly editable.
                return new docx.Paragraph({
                    alignment: align,
                    indent: { left: pxToTwip(item.x) },
                    spacing: {
                        before: index === 0 ? pxToTwip(item.y - pageYStart) : pxToTwip(item.gapY),
                    },
                    children: [
                        new docx.TextRun({
                            text: item.text,
                            size: pxToHp(item.fontSize),
                            color: item.color,
                            bold: item.bold,
                            italics: item.italic,
                            font: "Arial"
                        })
                    ]
                });
            });

            docSections.push({
                properties: {
                    page: {
                        size: { width: pxToTwip(pageWidthPx), height: pxToTwip(pageHeightPx) },
                        margin: { top: 0, right: 0, bottom: 0, left: 0 }
                    }
                },
                children: [backgroundParagraph, ...textParagraphs]
            });
        }

        const doc = new docx.Document({ sections: docSections });
        const finalBuffer = await docx.Packer.toBuffer(doc);

        console.log(`✅ Flow High-Fidelity Word document generated (${(finalBuffer.length / 1024).toFixed(1)} KB)`);
        return finalBuffer;

    } catch (error) {
        if (browser) await browser.close();
        console.error('HF Conversion Error:', error);
        throw new Error(`Failed to create high-fidelity Word doc: ${error.message}`);
    }
}

async function convertHTMLFileToWordHF(inputPath, outputPath, options = {}) {
    const htmlContent = await fs.promises.readFile(inputPath, 'utf-8');
    const buffer = await convertHTMLToWordHF(htmlContent, options);
    await fs.promises.writeFile(outputPath, buffer);
    return outputPath;
}

module.exports = { convertHTMLToWordHF, convertHTMLFileToWordHF, validateHTML };
