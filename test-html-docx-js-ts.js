// Try html-docx-js-typescript as an alternative
const { HTMLToDocx } = require('html-docx-js-typescript');
const fs = require('fs').promises;

async function testHTMLDocxJSTypescript() {
    console.log('Testing html-docx-js-typescript library...\n');

    const simpleHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Test Document</h1>
  <p>This is a simple test paragraph.</p>
  <p>Text with <strong>bold</strong> and <em>italic</em> formatting.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</body>
</html>`;

    try {
        console.log('Converting HTML...');

        // Convert using html-docx-js-typescript
        const docx = HTMLToDocx(simpleHTML);

        console.log('Conversion successful!');
        console.log('Buffer length:', docx.length);

        // Save to file
        await fs.writeFile('test-html-docx-js-ts.docx', docx);
        console.log('✅ File saved: test-html-docx-js-ts.docx');
        console.log('\nTry opening this file in Word');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testHTMLDocxJSTypescript();
