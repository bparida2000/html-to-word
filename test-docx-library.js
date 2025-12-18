// Test using the 'docx' library directly - this is the most reliable approach
const docx = require('docx');
const fs = require('fs').promises;

async function testDocxLibrary() {
    console.log('Testing docx library (most reliable for Word compatibility)...\n');

    try {
        // Create a simple document using the docx library
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: "Test Document",
                                bold: true,
                                size: 32, // 16pt (size is in half-points)
                                color: "2563eb",
                            }),
                        ],
                        heading: docx.HeadingLevel.HEADING_1,
                    }),
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun("This is a simple test paragraph. "),
                            new docx.TextRun({
                                text: "This text is bold",
                                bold: true,
                            }),
                            new docx.TextRun(" and "),
                            new docx.TextRun({
                                text: "this text is italic",
                                italics: true,
                            }),
                            new docx.TextRun("."),
                        ],
                    }),
                    new docx.Paragraph({
                        text: "This is a second paragraph with normal text.",
                    }),
                ],
            }],
        });

        // Generate buffer
        const buffer = await docx.Packer.toBuffer(doc);

        console.log('✅ Document created successfully!');
        console.log('Buffer length:', buffer.length);

        // Save to file
        await fs.writeFile('test-docx-lib.docx', buffer);
        console.log('✅ File saved: test-docx-lib.docx');
        console.log('\nPlease try opening this file in Word - it should work perfectly!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

testDocxLibrary();
