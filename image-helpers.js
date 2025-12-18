// Image helper functions (add after parseColor function)

/**
 * Download image from URL or parse base64
 */
async function getImageBuffer(src) {
    try {
        // Check if it's a base64 image
        if (src.startsWith('data:image/')) {
            const base64Data = src.split(',')[1];
            return Buffer.from(base64Data, 'base64');
        }

        // Download from URL
        if (src.startsWith('http://') || src.startsWith('https://')) {
            const response = await axios.get(src, {
                responseType: 'arraybuffer',
                timeout: 10000 // 10 second timeout
            });
            return Buffer.from(response.data);
        }

        // Try as local file path (if provided)
        if (src.startsWith('/') || src.startsWith('./')) {
            return await fs.readFile(src);
        }

        return null;
    } catch (error) {
        console.error(`Failed to load image from: ${src}`, error.message);
        return null;
    }
}

/**
 * Parse image element
 */
async function parseImage(img) {
    const src = img.getAttribute('src');
    if (!src) return null;

    try {
        const imageBuffer = await getImageBuffer(src);
        if (!imageBuffer) return null;

        // Get dimensions from HTML attributes or use defaults
        const widthAttr = img.getAttribute('width');
        const heightAttr = img.getAttribute('height');
        const style = img.getAttribute('style') || '';

        let width = 600; // default width in pixels
        let height = 400; // default height in pixels

        // Parse width from attribute or style
        if (widthAttr) {
            width = parseInt(widthAttr);
        } else if (style.includes('width:')) {
            const widthMatch = style.match(/width:\s*(\d+)px/);
            if (widthMatch) width = parseInt(widthMatch[1]);
        }

        // Parse height from attribute or style
        if (heightAttr) {
            height = parseInt(heightAttr);
        } else if (style.includes('height:')) {
            const heightMatch = style.match(/height:\s*(\d+)px/);
            if (heightMatch) height = parseInt(heightMatch[1]);
        }

        // Create image run
        return new ImageRun({
            data: imageBuffer,
            transformation: {
                width: Math.min(width, 600), // Max 600px width
                height: Math.min(height, 800), // Max 800px height
            },
        });
    } catch (error) {
        console.error('Image parsing error:', error);
        return null;
    }
}
