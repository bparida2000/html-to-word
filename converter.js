const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, UnderlineType } = require('docx');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Parse HTML color to hex format
 */
function parseColor(colorStr) {
  if (!colorStr) return undefined;

  // Remove # if present
  colorStr = colorStr.replace('#', '');

  // Convert rgb() to hex
  const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return r + g + b;
  }

  return colorStr.toUpperCase();
}

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

/**
 * Parse a text node and its parent styling
 */
function parseTextNode(node, parentStyles = {}) {
  const text = node.textContent || '';
  if (!text.trim()) return null;

  const runOptions = {
    text: text,
    bold: parentStyles.bold || false,
    italics: parentStyles.italics || false,
    underline: parentStyles.underline ? {} : undefined,
  };

  if (parentStyles.color) {
    runOptions.color = parseColor(parentStyles.color);
  }

  if (parentStyles.size) {
    runOptions.size = parentStyles.size;
  }

  console.log('DEBUG parseTextNode: text="' + text.substring(0, 30) + '"');
  return new TextRun(runOptions);
}

/**
 * Parse inline elements (strong, em, span, etc.)
 */
function parseInlineElement(element, parentStyles = {}) {
  const tagName = element.tagName?.toLowerCase();
  const style = element.style || {};
  const computedStyle = { ...parentStyles };

  // Apply styling based on tag
  switch (tagName) {
    case 'strong':
    case 'b':
      computedStyle.bold = true;
      break;
    case 'em':
    case 'i':
      computedStyle.italics = true;
      break;
    case 'u':
      computedStyle.underline = true;
      break;
  }

  // Apply inline styles
  if (style.color) {
    computedStyle.color = style.color;
  }
  if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600) {
    computedStyle.bold = true;
  }
  if (style.fontStyle === 'italic') {
    computedStyle.italics = true;
  }
  if (style.textDecoration?.includes('underline')) {
    computedStyle.underline = true;
  }

  const textRuns = [];
  element.childNodes.forEach(child => {
    if (child.nodeType === 3) { // Text node
      const run = parseTextNode(child, computedStyle);
      if (run) textRuns.push(run);
    } else if (child.nodeType === 1) { // Element node
      const childRuns = parseInlineElement(child, computedStyle);
      textRuns.push(...childRuns);
    }
  });

  return textRuns;
}

/**
 * Parse a paragraph element
 */
async function parseParagraph(element) {
  const children = [];

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 3) { // Text node
      const run = parseTextNode(child, {});
      if (run) children.push(run);
    } else if (child.nodeType === 1) { // Element node
      const tagName = child.tagName?.toLowerCase();

      // Handle images
      if (tagName === 'img') {
        const imageRun = await parseImage(child);
        if (imageRun) children.push(imageRun);
      } else {
        const runs = parseInlineElement(child, {});
        children.push(...runs);
      }
    }
  }

  if (children.length === 0) {
    children.push(new TextRun(''));
  }

  // DEBUG
  console.log('DEBUG parseParagraph: children count:', children.length, 'types:', children.map(c => c.constructor.name));

  const options = { children };

  // Apply paragraph styling
  const style = element.style || {};
  if (style.textAlign) {
    const alignment = style.textAlign.toLowerCase();
    if (alignment === 'center') options.alignment = AlignmentType.CENTER;
    else if (alignment === 'right') options.alignment = AlignmentType.RIGHT;
    else if (alignment === 'justify') options.alignment = AlignmentType.JUSTIFIED;
  }

  return new Paragraph(options);
}

/**
 * Parse a heading element
 */
function parseHeading(element, level) {
  const children = [];

  element.childNodes.forEach(child => {
    if (child.nodeType === 3) {
      const run = parseTextNode(child, {});
      if (run) children.push(run);
    } else if (child.nodeType === 1) {
      const runs = parseInlineElement(child, {});
      children.push(...runs);
    }
  });

  if (children.length === 0) {
    children.push(new TextRun(element.textContent || ''));
  }

  const headingLevels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  const result = new Paragraph({
    children,
    heading: headingLevels[level - 1] || HeadingLevel.HEADING_1,
  });

  console.log('DEBUG parseHeading: level', level, 'children count:', children.length);
  return result;
}

/**
 * Parse a list (ul or ol)
 */
function parseList(element, isOrdered = false) {
  const paragraphs = [];
  const items = element.querySelectorAll(':scope > li');

  items.forEach((li, index) => {
    const children = [];

    li.childNodes.forEach(child => {
      if (child.nodeType === 3) {
        const run = parseTextNode(child, {});
        if (run) children.push(run);
      } else if (child.nodeType === 1 && !['ul', 'ol'].includes(child.tagName?.toLowerCase())) {
        const runs = parseInlineElement(child, {});
        children.push(...runs);
      }
    });

    if (children.length === 0) {
      children.push(new TextRun(li.textContent || ''));
    }

    paragraphs.push(new Paragraph({
      children,
      bullet: isOrdered ? undefined : { level: 0 },
      numbering: isOrdered ? { reference: 'default-numbering', level: 0 } : undefined,
    }));

    // Handle nested lists
    const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol');
    nestedLists.forEach(nestedList => {
      const nestedParagraphs = parseList(nestedList, nestedList.tagName.toLowerCase() === 'ol');
      paragraphs.push(...nestedParagraphs);
    });
  });

  return paragraphs;
}

/**
 * Parse a table element
 */
function parseTable(element) {
  const rows = [];
  const tableRows = element.querySelectorAll('tr');

  tableRows.forEach(tr => {
    const cells = [];
    const tableCells = tr.querySelectorAll('td, th');

    tableCells.forEach(cell => {
      const cellParagraphs = [];
      const children = [];

      cell.childNodes.forEach(child => {
        if (child.nodeType === 3) {
          const run = parseTextNode(child, cell.tagName?.toLowerCase() === 'th' ? { bold: true } : {});
          if (run) children.push(run);
        } else if (child.nodeType === 1) {
          const runs = parseInlineElement(child, cell.tagName?.toLowerCase() === 'th' ? { bold: true } : {});
          children.push(...runs);
        }
      });

      if (children.length === 0) {
        children.push(new TextRun(cell.textContent || ''));
      }

      cellParagraphs.push(new Paragraph({ children }));

      cells.push(new TableCell({
        children: cellParagraphs,
        width: { size: 100 / tableCells.length, type: WidthType.PERCENTAGE },
      }));
    });

    rows.push(new TableRow({ children: cells }));
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Convert HTML string to DOCX buffer using docx library
 */
async function convertHTML(htmlContent, options = {}) {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const body = document.body;

    const docElements = [];

    // Parse each child element in the body
    const children = Array.from(body.children);

    for (const element of children) {
      const tagName = element.tagName?.toLowerCase();
      console.log('DEBUG: Processing element:', tagName);

      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = parseInt(tagName.charAt(1));
          docElements.push(parseHeading(element, level));
          break;

        case 'p':
          docElements.push(await parseParagraph(element));
          break;

        case 'img':
          // Handle standalone images
          const imageRun = await parseImage(element);
          if (imageRun) {
            docElements.push(new Paragraph({ children: [imageRun] }));
          }
          break;

        case 'ul':
          docElements.push(...parseList(element, false));
          break;

        case 'ol':
          docElements.push(...parseList(element, true));
          break;

        case 'table':
          docElements.push(parseTable(element));
          break;

        case 'div':
        case 'section':
          // For div/section, parse children recursively
          const divChildren = Array.from(element.children);
          for (const child of divChildren) {
            const childTag = child.tagName?.toLowerCase();
            if (childTag === 'p') {
              docElements.push(await parseParagraph(child));
            } else if (childTag?.match(/^h[1-6]$/)) {
              const lvl = parseInt(childTag.charAt(1));
              docElements.push(parseHeading(child, lvl));
            } else if (childTag === 'img') {
              const imgRun = await parseImage(child);
              if (imgRun) {
                docElements.push(new Paragraph({ children: [imgRun] }));
              }
            } else if (childTag === 'ul') {
              docElements.push(...parseList(child, false));
            } else if (childTag === 'ol') {
              docElements.push(...parseList(child, true));
            } else if (childTag === 'table') {
              docElements.push(parseTable(child));
            }
          }
          break;

        case 'br':
          docElements.push(new Paragraph({ children: [new TextRun('')] }));
          break;

        default:
          // For unhandled elements, try to extract text
          if (element.textContent?.trim()) {
            docElements.push(await parseParagraph(element));
          }
      }
    }

    // DEBUG: Log what we parsed
    console.log('DEBUG: Parsed elements count:', docElements.length);
    console.log('DEBUG: Element types:', docElements.map(e => e.constructor.name));

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docElements.length > 0 ? docElements : [new Paragraph({ children: [new TextRun('')] })],
      }],
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        }],
      },
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;

  } catch (error) {
    console.error('Conversion error:', error);
    throw new Error(`Failed to convert HTML to DOCX: ${error.message}`);
  }
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
