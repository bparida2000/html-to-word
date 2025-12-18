// Direct docx library test - bypassing all my parsing
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');

async function directTest() {
    console.log('Testing docx library directly...\n');

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    text: "Simple text using text property",
                }),
                new Paragraph({
                    children: [
                        new TextRun("Text using children array"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Text using TextRun with options",
                        }),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('direct-test.docx', buffer);
    console.log('✅ Created direct-test.docx');
    console.log('Please open this file and tell me what you see!');
}

directTest();
