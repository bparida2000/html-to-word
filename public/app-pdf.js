// DOM Elements
const htmlInput = document.getElementById('html-input');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const previewFrame = document.getElementById('preview-frame');
const previewEmpty = document.getElementById('preview-empty');
const charCount = document.getElementById('char-count');
const convertBtn = document.getElementById('convert-btn');
const clearBtn = document.getElementById('clear-btn');
const browseBtn = document.getElementById('browse-btn');
const removeFileBtn = document.getElementById('remove-file-btn');
const refreshPreviewBtn = document.getElementById('refresh-preview');
const statusMessage = document.getElementById('status-message');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');

const pdfFormat = document.getElementById('pdf-format');
const pdfOrientation = document.getElementById('pdf-orientation');
const pdfFilename = document.getElementById('pdf-filename');

// Tab switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

let currentFile = null;
let currentHTML = '';

// Initialize
function init() {
    setupEventListeners();
    updateCharCount();
}

// Event Listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // HTML input
    htmlInput.addEventListener('input', () => {
        currentHTML = htmlInput.value;
        updateCharCount();
        updatePreview();
    });

    // File upload
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);

    // Drag and drop
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Buttons
    convertBtn.addEventListener('click', convertToPDF);
    clearBtn.addEventListener('click', clearInput);
    refreshPreviewBtn.addEventListener('click', updatePreview);
}

// Tab Switching
function switchTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Update current HTML based on active tab
    if (tabName === 'paste') {
        currentHTML = htmlInput.value;
    } else if (tabName === 'upload' && currentFile) {
        // HTML is already set from file
    }

    updatePreview();
}

// Character Count
function updateCharCount() {
    const count = htmlInput.value.length;
    charCount.textContent = `${count.toLocaleString()} characters`;
}

// File Handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.html')) {
        loadFile(file);
    } else {
        showStatus('error', '❌', 'Please drop an HTML file');
    }
}

function loadFile(file) {
    currentFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        currentHTML = e.target.result;
        fileName.textContent = file.name;
        document.querySelector('.upload-content').style.display = 'none';
        fileInfo.style.display = 'flex';
        updatePreview();
    };

    reader.onerror = () => {
        showStatus('error', '❌', 'Failed to read file');
    };

    reader.readAsText(file);
}

function removeFile() {
    currentFile = null;
    currentHTML = '';
    fileInput.value = '';
    document.querySelector('.upload-content').style.display = 'flex';
    fileInfo.style.display = 'none';
    updatePreview();
}

// Clear Input
function clearInput() {
    htmlInput.value = '';
    currentHTML = '';
    updateCharCount();
    updatePreview();
}

// Preview
function updatePreview() {
    if (!currentHTML || currentHTML.trim() === '') {
        previewFrame.classList.remove('visible');
        previewEmpty.classList.remove('hidden');
        return;
    }

    try {
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write(currentHTML);
        previewDoc.close();

        previewFrame.classList.add('visible');
        previewEmpty.classList.add('hidden');
    } catch (error) {
        console.error('Preview error:', error);
        showStatus('warning', '⚠️', 'Preview failed, but conversion should still work');
    }
}

// Convert to PDF
async function convertToPDF() {
    if (!currentHTML || currentHTML.trim() === '') {
        showStatus('error', '❌', 'Please enter or upload HTML content');
        return;
    }

    // Disable button and show loading
    convertBtn.disabled = true;
    const originalText = convertBtn.innerHTML;
    convertBtn.innerHTML = '<span class="btn-icon">⏳</span>Converting...';

    try {
        // Prepare options
        const options = {
            format: pdfFormat.value,
            orientation: pdfOrientation.value,
        };

        // Determine filename
        let filename = pdfFilename.value.trim();
        if (!filename) {
            filename = 'converted-document.pdf';
        } else if (!filename.endsWith('.pdf')) {
            filename += '.pdf';
        }
        options.filename = filename;

        // Send conversion request
        const response = await fetch('/convert-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: currentHTML,
                options: options,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        // Download the file
        const blob = await response.blob();

        // Create PDF blob with explicit MIME type
        const pdfBlob = new Blob([blob], {
            type: 'application/pdf'
        });

        const url = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        a.setAttribute('download', filename);

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        showStatus('success', '✅', `PDF generated successfully! File: ${filename}`);

    } catch (error) {
        console.error('Conversion error:', error);
        showStatus('error', '❌', error.message || 'Conversion failed. Please try again.');
    } finally {
        // Re-enable button
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalText;
    }
}

// Status Messages
function showStatus(type, icon, message) {
    statusMessage.className = `status-message ${type}`;
    statusIcon.textContent = icon;
    statusText.textContent = message;
    statusMessage.style.display = 'flex';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Initialize app
init();
