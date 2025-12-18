const { spawn } = require('child_process');
const fs = require('fs');

console.log('Testing pandoc directly...\n');

// Write test HTML
fs.writeFileSync('/tmp/test.html', '<h1>Test</h1><p>Hello <strong>World</strong></p>');

// Run pandoc
const pandoc = spawn('pandoc', [
    '/tmp/test.html',
    '-f', 'html',
    '-t', 'docx',
    '-o', '/tmp/test.docx',
    '--standalone'
]);

pandoc.stdout.on('data', (data) => console.log('STDOUT:', data.toString()));
pandoc.stderr.on('data', (data) => console.log('STDERR:', data.toString()));

pandoc.on('close', (code) => {
    console.log('Pandoc exit code:', code);

    if (code === 0 && fs.existsSync('/tmp/test.docx')) {
        const buffer = fs.readFileSync('/tmp/test.docx');
        fs.writeFileSync('quick-pandoc-test.docx', buffer);
        console.log('✅ Success! Created quick-pandoc-test.docx, size:', buffer.length);
    } else {
        console.log('❌ Failed');
    }
});
