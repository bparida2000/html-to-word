# HTML to Word Converter

High-fidelity HTML to Word (DOCX) converter with modern web interface. Convert HTML documents to Word format while preserving formatting, styles, and layout.

## Features

✅ **High Fidelity Conversion** - Preserves text formatting, colors, fonts, and styles  
✅ **Multiple Input Methods** - Paste HTML or upload files  
✅ **Live Preview** - See your HTML rendered in real-time  
✅ **Comprehensive Format Support** - Tables, lists, images, links, and more  
✅ **Modern Web UI** - Beautiful, intuitive interface with dark mode  
✅ **REST API** - Programmatic access for automation  
✅ **No External Dependencies** - Pure Node.js implementation

## Installation

```bash
# Navigate to project directory
cd /Users/bhagabanparida/Development/HTML\ to\ Word

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

## Usage

### Web Interface

1. Open your browser to `http://localhost:3000`
2. Choose your input method:
   - **Paste Tab**: Copy and paste HTML code directly
   - **Upload Tab**: Upload an HTML file or drag & drop
3. Configure options (optional):
   - Page orientation (Portrait/Landscape)
   - Document title
4. Click "Convert to Word" button
5. Download the generated DOCX file

### Programmatic Usage

#### Convert HTML String

```javascript
const { convertHTML } = require('./converter');

const htmlContent = '<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>';

convertHTML(htmlContent, {
  title: 'My Document',
  orientation: 'portrait'
}).then(docxBuffer => {
  // Save buffer to file or send as response
  require('fs').writeFileSync('output.docx', docxBuffer);
});
```

#### Convert HTML File

```javascript
const { convertHTMLFile } = require('./converter');

convertHTMLFile(
  './samples/simple.html',
  './output/simple.docx',
  { title: 'Simple Document' }
).then(outputPath => {
  console.log('Converted:', outputPath);
});
```

### REST API

#### POST /convert

Convert HTML content to DOCX.

**Request:**
```json
{
  "html": "<h1>Title</h1><p>Content</p>",
  "options": {
    "orientation": "portrait",
    "title": "My Document"
  }
}
```

**Response:** DOCX file download

#### POST /upload

Upload and convert HTML file.

**Request:** multipart/form-data
- `htmlFile`: HTML file
- `orientation`: (optional) "portrait" or "landscape"
- `title`: (optional) Document title

**Response:** DOCX file download

## Supported HTML Elements

### Text Formatting
- **Headings**: `<h1>` through `<h6>`
- **Paragraphs**: `<p>` with spacing and alignment
- **Text styles**: `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`
- **Colors**: Text color and background color via CSS
- **Fonts**: Font family, size, and weight

### Structure
- **Lists**: `<ul>`, `<ol>`, `<li>` (including nested lists)
- **Tables**: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
- **Divs & Spans**: With CSS styling
- **Line breaks**: `<br>`, `<hr>`

### Media & Links
- **Images**: `<img>` (embedded)
- **Links**: `<a href="">` (clickable in Word)

### CSS Support
- Colors (text and background)
- Font properties (family, size, weight, style)
- Text alignment
- Margins and padding
- Borders
- List styles

## Configuration Options

### Conversion Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `orientation` | string | `'portrait'` | Page orientation: 'portrait' or 'landscape' |
| `title` | string | `'Converted Document'` | Document title metadata |
| `marginTop` | number | `1440` | Top margin in twips (1440 = 1 inch) |
| `marginRight` | number | `1440` | Right margin in twips |
| `marginBottom` | number | `1440` | Bottom margin in twips |
| `marginLeft` | number | `1440` | Left margin in twips |
| `pageWidth` | number | `12240` | Page width in twips (A4 default) |
| `pageHeight` | number | `15840` | Page height in twips (A4 default) |

> **Note**: 1 inch = 1440 twips (twentieth of a point)

## Sample Files

The `samples/` directory contains example HTML files:

- **simple.html** - Basic formatting, headings, lists, text styles
- **advanced.html** - Complex tables, nested lists, styled boxes, code snippets
- **business-report.html** - Professional report with cover page, metrics, financial tables

Use these to test the converter:

```bash
# View samples in browser
open samples/simple.html
open samples/advanced.html
open samples/business-report.html
```

## Troubleshooting

### Common Issues

**Issue**: Conversion fails with "Failed to convert HTML to DOCX"  
**Solution**: Ensure HTML is well-formed. Check for unclosed tags or invalid syntax.

**Issue**: Styles not preserved  
**Solution**: Use inline styles or `<style>` tags. External CSS files are not supported.

**Issue**: Images not appearing  
**Solution**: Use absolute paths for images or base64-encoded data URIs.

**Issue**: Table formatting issues  
**Solution**: Use proper table structure with `<thead>`, `<tbody>`, `<th>`, `<td>` tags.

### Validation

Before conversion, the tool validates:
- HTML content is non-empty string
- Content contains HTML tags
- File size within limits (10MB for uploads)

## Technical Details

### Architecture

```
┌─────────────┐
│  Web UI     │ (HTML + CSS + JS)
│  (Client)   │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐
│ Express     │ (REST API)
│ Server      │ /convert, /upload
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Converter   │ (Core logic)
│ Module      │ html-to-docx
└─────────────┘
```

### Technology Stack

- **Backend**: Node.js, Express
- **Conversion Engine**: html-to-docx (v1.8.0)
- **File Upload**: Multer
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Design**: Modern dark theme with gradients and animations

### Performance

- Typical conversion time: < 1 second for most documents
- Maximum file size: 10MB (configurable)
- Memory efficient: Streaming buffer operations
- No external process dependencies

## API Integration Examples

### cURL

```bash
# Convert HTML content
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Test</h1>"}' \
  -o output.docx

# Upload file
curl -X POST http://localhost:3000/upload \
  -F "htmlFile=@sample.html" \
  -o output.docx
```

### JavaScript (Node.js)

```javascript
const fetch = require('node-fetch');
const fs = require('fs');

async function convertHTML() {
  const response = await fetch('http://localhost:3000/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: '<h1>Hello World</h1>',
      options: { title: 'My Doc' }
    })
  });
  
  const buffer = await response.buffer();
  fs.writeFileSync('output.docx', buffer);
}
```

### Python

```python
import requests

html_content = '<h1>Hello World</h1><p>Test document</p>'

response = requests.post('http://localhost:3000/convert',
    json={'html': html_content, 'options': {'title': 'My Doc'}})

with open('output.docx', 'wb') as f:
    f.write(response.content)
```

## Development

### Project Structure

```
HTML to Word/
├── package.json          # Dependencies and scripts
├── server.js             # Express web server
├── converter.js          # Core conversion logic
├── public/               # Frontend assets
│   ├── index.html        # Web UI
│   ├── styles.css        # Styling
│   └── app.js            # Client-side JavaScript
├── samples/              # Example HTML files
│   ├── simple.html
│   ├── advanced.html
│   └── business-report.html
└── README.md             # This file
```

### Running Tests

```bash
# Test basic conversion
node -e "require('./converter').convertHTMLFile('./samples/simple.html', './output/simple.docx')"

# Test server
npm start
# Then open http://localhost:3000
```

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review sample files for examples
3. Verify HTML is well-formed and valid

---

**Built with ❤️ for high-fidelity document conversion**
