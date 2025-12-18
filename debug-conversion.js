const { convertHTML } = require('./converter');

async function testConversion() {
    console.log('Testing HTML to DOCX conversion...\n');

    const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Test Heading</h1>
  <p>This is a simple paragraph.</p>
  <p>Another paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
  <ul>
    <li>First item</li>
    <li>Second item</li>
  </ul>
</body>
</html>`;

    try {
        console.log('Converting HTML...');
        const buffer = await convertHTML(testHTML);

        console.log('\n✅ Conversion successful!');
        console.log('Buffer size:', buffer.length, 'bytes');

        const fs = require('fs');
        fs.writeFileSync('debug-test.docx', buffer);
        console.log('✅ Saved to: debug-test.docx');
        console.log('\nPlease open debug-test.docx and check if content appears!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

testConversion();
