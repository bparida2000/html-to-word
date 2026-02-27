const puppeteer = require('puppeteer');
const babel = require('@babel/core');
const fs = require('fs').promises;

/**
 * Compile JSX/React code to plain JavaScript on the SERVER using @babel/core.
 * This is the only reliable approach with Puppeteer — no browser Babel needed.
 */
function compileJSX(jsxCode) {
    // Strip import/export statements that don't work in a browser IIFE
    let cleanCode = jsxCode
        .replace(/import\s+.*?\s+from\s+['"].*?['"];?\n?/g, '')
        .replace(/export\s+default\s+[a-zA-Z0-9_]+;?\n?/g, '')
        .replace(/export\s+/g, '');

    const result = babel.transformSync(cleanCode, {
        presets: [['@babel/preset-react', { runtime: 'classic' }]],
        filename: 'component.jsx',
    });

    return result.code;
}

/**
 * Detect the top-level React component name (PascalCase) from source.
 */
function detectComponentName(jsxCode) {
    const exportMatch = jsxCode.match(/export\s+default\s+([A-Z][a-zA-Z0-9_]*)/);
    if (exportMatch) return exportMatch[1];
    const match = jsxCode.match(/(?:const|function|let|var)\s+([A-Z][a-zA-Z0-9_]*)/);
    return match ? match[1] : 'App';
}

/**
 * Return true only for genuine React/JSX source code — NOT plain HTML documents.
 */
function isReactCode(content) {
    if (!content) return false;

    const trimmed = content.trim();

    // Plain HTML documents always start with these — never treat them as JSX
    if (
        /^<!DOCTYPE\s+html/i.test(trimmed) ||
        /^<html/i.test(trimmed) ||
        /<head[\s>]/i.test(trimmed) ||
        /<body[\s>]/i.test(trimmed)
    ) {
        return false;
    }

    // Genuine JSX signals
    return (
        content.includes('import React') ||
        content.includes('export default') ||
        (/className\s*=\s*["'`{]/.test(content) && content.includes('=>')) ||
        (content.includes('=>') && content.includes('return (') && content.includes('</'))
    );
}

/**
 * Build a fully self-contained HTML page with pre-compiled React JavaScript.
 * React + ReactDOM load from CDN; no browser-side Babel at all.
 */
function buildReactHTML(compiledJS, componentName) {
    // Prevent </script> inside injected code from closing the script tag early
    const safeJS = compiledJS.replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Component PDF</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    #root { width: 100%; }
    ::-webkit-scrollbar { display: none; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function (React, ReactDOM) {
      // Expose React hooks as globals so compiled code can reference them
      var useState    = React.useState;
      var useEffect   = React.useEffect;
      var useRef      = React.useRef;
      var useCallback = React.useCallback;
      var useMemo     = React.useMemo;
      var useContext  = React.useContext;
      var useReducer  = React.useReducer;
      var createContext = React.createContext;
      var Fragment    = React.Fragment;

      try {
        // --- Pre-compiled component (server-side Babel) ---
        ${safeJS}
        // --------------------------------------------------

        var rootEl = document.getElementById('root');
        var root   = ReactDOM.createRoot(rootEl);
        root.render(React.createElement(${componentName}));

        // Signal Puppeteer that rendering is done
        setTimeout(function () { window.__reactReady__ = true; }, 300);

      } catch (err) {
        document.getElementById('root').innerHTML =
          '<div style="color:red;padding:20px;font-family:monospace;background:#fff1f1;border-radius:8px;">' +
          '<h2 style="margin-top:0">&#x26A0;&#xFE0F; React Render Error</h2>' +
          '<pre style="white-space:pre-wrap">' + err.message + '</pre></div>';
        window.__reactReady__ = true; // still capture the error page as PDF
      }
    })(window.React, window.ReactDOM);
  </script>
</body>
</html>`;
}

/**
 * Convert HTML (or React JSX) to PDF using Puppeteer.
 */
async function convertHTMLToPDF(htmlContent, options = {}) {
    let browser;

    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setViewport({
            width: options.width || 1200,
            height: options.height || 1600,
            deviceScaleFactor: 2,
        });

        // --- Determine what to render ---
        const isReact = isReactCode(htmlContent);
        let contentToRender = htmlContent;

        if (isReact) {
            console.log('React/JSX detected — compiling on server side...');
            try {
                const compiled = compileJSX(htmlContent);
                const componentName = detectComponentName(htmlContent);
                contentToRender = buildReactHTML(compiled, componentName);
                console.log('Component:', componentName);
            } catch (babelErr) {
                // If Babel fails (e.g. false-positive detection), fall back to plain HTML
                console.warn('Babel failed, falling back to plain HTML render:', babelErr.message);
                contentToRender = htmlContent;
            }
        }

        // --- Load page ---
        console.log('Loading page in Puppeteer...');
        await page.setContent(contentToRender, {
            waitUntil: ['load', 'domcontentloaded'],
            timeout: 60000,
        });

        // --- For React: wait until component signals it has rendered ---
        if (isReact) {
            console.log('Waiting for React render...');
            try {
                await page.waitForFunction(
                    () => window.__reactReady__ === true,
                    { timeout: 15000, polling: 200 }
                );
                await new Promise(r => setTimeout(r, 500)); // CSS settle
            } catch (e) {
                console.warn('React render timed out — proceeding anyway.');
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // Inject print layout rules to fix pagination and overflow
        console.log('Injecting print styles for perfect pagination...');
        await page.addStyleTag({
            content: `
            @media print {
                html, body, #root {
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                
                /* Reset any scrolling containers that might cut off content */
                [class*="overflow"], [class*="scroll"], [style*="overflow"] {
                    overflow: visible !important;
                }

                /* Prevent page breaking inside typical blocks */
                table, img, svg, pre, blockquote, tr, ul, ol, li, .prevent-break, .card {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                /* Keep headings joined with their content */
                h1, h2, h3, h4, h5, h6 {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    page-break-inside: avoid !important;
                }
                
                /* Force background colors */
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
            `
        });

        // Wait for web fonts
        await page.evaluateHandle('document.fonts.ready').catch(() => { });

        // --- Generate PDF ---
        console.log('Generating PDF...');
        const pdfOptions = {
            printBackground: true,
            preferCSSPageSize: true,
            margin: options.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
            displayHeaderFooter: false,
        };
        
        if (options.format === 'slide') {
            pdfOptions.width = '10in';
            pdfOptions.height = '5.625in';
            pdfOptions.landscape = true;
            pdfOptions.margin = { top: '0', right: '0', bottom: '0', left: '0' }; // Use the margin from the CSS @page
        } else {
            pdfOptions.format = options.format || 'A4';
            if (options.orientation === 'landscape') pdfOptions.landscape = true;
        }

        const pdfBuffer = await page.pdf(pdfOptions);
        console.log(`✅ PDF generated (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

        await browser.close();
        return Buffer.from(pdfBuffer); // Puppeteer returns Uint8Array; wrap for Express
    } catch (error) {
        if (browser) await browser.close();
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
        console.log(`Converted ${inputPath} → ${outputPath}`);
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

module.exports = { convertHTMLToPDF, convertHTMLFileToPDF, validateHTML };
