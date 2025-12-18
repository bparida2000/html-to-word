const { convertHTMLFile } = require('./converter');
const path = require('path');

async function runTests() {
    console.log('🧪 Testing HTML to Word Converter...\n');

    const tests = [
        {
            name: 'Simple HTML',
            input: './samples/simple.html',
            output: './output/simple.docx'
        },
        {
            name: 'Advanced HTML',
            input: './samples/advanced.html',
            output: './output/advanced.docx'
        },
        {
            name: 'Business Report',
            input: './samples/business-report.html',
            output: './output/business-report.docx'
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name}...`);
            await convertHTMLFile(test.input, test.output, {
                title: test.name
            });
            console.log(`✅ PASS: ${test.name} -> ${test.output}\n`);
            passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${test.name}`);
            console.log(`   Error: ${error.message}\n`);
            failed++;
        }
    }

    console.log('═'.repeat(50));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('═'.repeat(50));

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Files created in output/ directory');
        console.log('Open the .docx files in Microsoft Word, Google Docs, or LibreOffice to verify.');
    }
}

runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
