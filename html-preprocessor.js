const { JSDOM } = require('jsdom');
const axios = require('axios');

/**
 * Font Awesome to Unicode mapping
 * Maps common Font Awesome icons to Unicode equivalents
 */
const iconMap = {
    // Business & UI
    'fa-eye': '👁️',
    'fa-bullseye': '🎯',
    'fa-handshake': '🤝',
    'fa-shield-alt': '🛡️',
    'fa-rupee-sign': '₹',
    'fa-truck-loading': '🚚',
    'fa-hard-hat': '👷',
    'fa-bolt': '⚡',
    'fa-sync-alt': '🔄',
    'fa-chart-line': '📈',
    'fa-user-tie': '👔',
    'fa-phone-alt': '📞',
    'fa-envelope': '✉️',
    'fa-globe': '🌐',
    'fa-map-marker-alt': '📍',

    // Checkmarks
    'fa-check': '✓',
    'fa-check-circle': '✔️',

    // Social Media
    'fa-facebook-f': 'f',
    'fa-linkedin-in': 'in',
    'fa-twitter': '🐦',
    'fa-instagram': '📷',
    'fa-youtube': '▶️',
};

/**
 * Replace Font Awesome icons with Unicode
 */
function replaceFontAwesomeIcons(html) {
    console.log('Replacing Font Awesome icons with Unicode...');

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Find all <i> elements with Font Awesome classes
    const icons = doc.querySelectorAll('i[class*="fa-"]');
    let replaced = 0;

    icons.forEach(icon => {
        const classes = icon.className.split(' ');
        const iconClass = classes.find(c => c.startsWith('fa-') && c !== 'fa' && c !== 'fas' && c !== 'far' && c !== 'fab');

        if (iconClass && iconMap[iconClass]) {
            // Replace with Unicode
            const span = doc.createElement('span');
            span.textContent = iconMap[iconClass] + ' ';
            span.style.fontSize = '14pt';
            icon.replaceWith(span);
            replaced++;
        } else if (iconClass) {
            // Unknown icon - replace with bullet or leave text
            console.log(`  Unknown icon: ${iconClass}`);
            const span = doc.createElement('span');
            span.textContent = '• ';
            icon.replaceWith(span);
        }
    });

    console.log(`  Replaced ${replaced} icons`);
    return dom.serialize();
}

/**
 * Download and embed external images as base64
 */
async function embedExternalImages(html) {
    console.log('Embedding external images...');

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const images = doc.querySelectorAll('img[src^="http"]');

    for (const img of images) {
        try {
            const src = img.getAttribute('src');
            console.log(`  Downloading: ${src.substring(0, 50)}...`);

            const response = await axios.get(src, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const base64 = Buffer.from(response.data).toString('base64');
            const contentType = response.headers['content-type'] || 'image/jpeg';
            const dataUri = `data:${contentType};base64,${base64}`;

            img.setAttribute('src', dataUri);
            console.log(`  ✓ Embedded (${(base64.length / 1024).toFixed(1)}KB)`);

        } catch (error) {
            console.error(`  ✗ Failed to download image: ${error.message}`);
            // Remove broken image
            img.remove();
        }
    }

    return dom.serialize();
}

/**
 * Replace CSS variables with actual values
 */
function replaceCSSVariables(html) {
    console.log('Replacing CSS variables...');

    const variableMap = {
        '--brand-red': '#f80000',
        '--brand-blue': '#0c5492',
        '--brand-green': '#08A04B',
        '--brand-orange': '#FFA500',
        '--brand-teal': '#0d333b',
        '--bg-sky': '#bae6fd',
        '--text-dark': '#1a1a1a',
        '--text-grey': '#4a5568',
        '--text-light': '#ffffff',
    };

    // Replace in inline styles
    for (const [varName, value] of Object.entries(variableMap)) {
        const varRegex = new RegExp(`var\\(${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        html = html.replace(varRegex, value);
    }

    // Also replace in CSS blocks
    html = html.replace(/:root\s*\{[^}]+\}/g, ''); // Remove :root block

    return html;
}

/**
 * Simplify complex layouts for Word
 */
function simplifyLayout(html) {
    console.log('Simplifying layouts...');

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Remove problematic CSS properties
    const allElements = doc.querySelectorAll('[style]');
    allElements.forEach(el => {
        let style = el.getAttribute('style');
        if (style) {
            // Remove: position, float, display:flex/grid, transform
            style = style.replace(/position:\s*[^;]+;?/g, '');
            style = style.replace(/float:\s*[^;]+;?/g, '');
            style = style.replace(/display:\s*(flex|grid)[^;]*;?/g, 'display: block;');
            style = style.replace(/transform:\s*[^;]+;?/g, '');
            style = style.replace(/grid-template-[^;]+;?/g, '');
            style = style.replace(/flex(-[^:]+)?:\s*[^;]+;?/g, '');

            el.setAttribute('style', style);
        }
    });

    // Convert grid-2 and grid-3 classes to simple blocks
    const grids = doc.querySelectorAll('.grid-2, .grid-3');
    grids.forEach(grid => {
        grid.style.display = 'block';
        // Add spacing between children
        const children = grid.children;
        for (let i = 0; i < children.length; i++) {
            children[i].style.marginBottom = '15px';
            children[i].style.display = 'block';
        }
    });

    return dom.serialize();
}

/**
 * Enhance tables for better Word compatibility
 */
function enhanceTables(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
        // Ensure table has borders
        table.setAttribute('border', '1');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';

        // Ensure cells have padding
        const cells = tablequerySelectorAll('td, th');
        cells.forEach(cell => {
            if (!cell.style.padding) {
                cell.style.padding = '8px';
            }
        });
    });

    return dom.serialize();
}

/**
 * Main preprocessing pipeline
 */
async function preprocessHTML(html) {
    console.log('\n=== Starting HTML Pre-Processing ===\n');

    try {
        // Step 1: Replace CSS variables
        html = replaceCSSVariables(html);

        // Step 2: Replace Font Awesome icons
        html = replaceFontAwesomeIcons(html);

        // Step 3: Embed external images
        html = await embedExternalImages(html);

        // Step 4: Simplify layouts
        html = simplifyLayout(html);

        // Step 5: Enhance tables
        html = enhanceTables(html);

        console.log('\n=== Pre-Processing Complete ===\n');
        return html;

    } catch (error) {
        console.error('Pre-processing error:', error);
        throw error;
    }
}

module.exports = {
    preprocessHTML,
    replaceFontAwesomeIcons,
    embedExternalImages,
    replaceCSSVariables,
    simplifyLayout,
};
