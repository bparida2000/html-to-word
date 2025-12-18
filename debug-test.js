// Test the html-to-docx library directly with minimal code
const HTMLtoDOCX = require('html-to-docx');
const fs = require('fs').promises;

async function testConversion() {
    console.log('Testing html-to-docx library...\n');

    // Very simple HTML
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
</body>
</html>`;

    try {
        console.log('Converting HTML...');

        // Try without options first
        const buffer = await HTMLtoDOCX(simpleHTML);

        console.log('Conversion successful!');
        console.log('Buffer length:', buffer.length);
        console.log('Buffer type:', typeof buffer);
        console.log('Is Buffer:', Buffer.isBuffer(buffer));

        // Save to file
        await fs.writeFile('test-output.docx', buffer);
        console.log('\n✅ File saved: test-output.docx');
        console.log('Try opening this file in Word');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

testConversion();
