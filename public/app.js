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
const orientationSelect = document.getElementById('orientation');
const docTitleInput = document.getElementById('doc-title');

// URL input elements
const urlInput = document.getElementById('url-input');
const fetchUrlBtn = document.getElementById('fetch-url-btn');
const urlStatus = document.getElementById('url-status');
const urlStatusIcon = document.getElementById('url-status-icon');
const urlStatusText = document.getElementById('url-status-text');

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
    convertBtn.addEventListener('click', convertToWord);
    document.getElementById('convert-pdf-btn').addEventListener('click', convertToPDF);
    clearBtn.addEventListener('click', clearInput);
    refreshPreviewBtn.addEventListener('click', updatePreview);

    // URL fetch
    if (fetchUrlBtn) {
        fetchUrlBtn.addEventListener('click', fetchFromURL);
    }
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchFromURL();
            }
        });
    }
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

// Fetch HTML from URL
async function fetchFromURL() {
    const url = urlInput.value.trim();

    if (!url) {
        showUrlStatus('error', '❌', 'Please enter a URL');
        return;
    }

    // Basic URL validation
    try {
        new URL(url);
    } catch (e) {
        showUrlStatus('error', '❌', 'Invalid URL format');
        return;
    }

    // Show loading state
    fetchUrlBtn.disabled = true;
    fetchUrlBtn.textContent = 'Fetching...';
    showUrlStatus('loading', '⏳', 'Capturing page... This may take a few seconds');

    try {
        const response = await fetch('/capture-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to capture page');
        }

        // Set the captured HTML
        currentHTML = data.html;

        // Update preview
        updatePreview();

        // Show success
        showUrlStatus('success', '✅', `Captured ${(data.size / 1024).toFixed(1)}KB - Ready to convert!`);
        showStatus('success', '✅', 'Page captured successfully! Click Convert to generate document.');

    } catch (error) {
        console.error('URL fetch error:', error);
        showUrlStatus('error', '❌', error.message || 'Failed to capture page');
    } finally {
        fetchUrlBtn.disabled = false;
        fetchUrlBtn.textContent = 'Fetch Page';
    }
}

// Show URL status message
function showUrlStatus(type, icon, message) {
    if (!urlStatus) return;

    urlStatus.style.display = 'flex';
    urlStatus.className = `url-status ${type}`;
    urlStatusIcon.textContent = icon;
    urlStatusText.textContent = message;
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

// Convert to Word
async function convertToWord() {
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
            title: docTitleInput.value.trim() || 'Converted Document',
            orientation: orientationSelect.value,
        };

        // Send conversion request
        const response = await fetch('/convert', {
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

        // Get filename from response headers or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'converted-document.docx';
        if (contentDisposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        // Ensure .docx extension
        if (!filename.endsWith('.docx')) {
            filename += '.docx';
        }

        // Download the file - IMPROVED METHOD
        const blob = await response.blob();

        // Create docx blob with explicit MIME type
        const docxBlob = new Blob([blob], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Method 1: Try direct download
        try {
            const url = URL.createObjectURL(docxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;

            // Force click
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 1000);

            showStatus('success', '✅', `Word file generated! Check Downloads folder for: ${filename}`);
        } catch (e) {
            // Fallback: Open in new window
            const url = URL.createObjectURL(docxBlob);
            window.open(url, '_blank');
            showStatus('warning', '⚠️', 'Download opened in new tab. Right-click to save.');
        }

    } catch (error) {
        console.error('Conversion error:', error);
        showStatus('error', '❌', error.message || 'Conversion failed. Please try again.');
    } finally {
        // Re-enable button
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalText;
    }
}

// Convert to PDF
async function convertToPDF() {
    if (!currentHTML || currentHTML.trim() === '') {
        showStatus('error', '❌', 'Please enter or upload HTML content');
        return;
    }

    // Disable buttons and show loading
    const convertPDFBtn = document.getElementById('convert-pdf-btn');
    convertPDFBtn.disabled = true;
    const originalText = convertPDFBtn.innerHTML;
    convertPDFBtn.innerHTML = '<span class="btn-icon">⏳</span>Converting...';

    try {
        // Prepare options
        const options = {
            orientation: orientationSelect.value,
            format: 'A4',
        };

        // Determine filename
        let filename = docTitleInput.value.trim();
        if (!filename) {
            filename = 'converted-document.pdf';
        } else if (!filename.endsWith('.pdf')) {
            filename += '.pdf';
        }
        options.filename = filename;

        // Send conversion request to same server (now has both endpoints!)
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
            throw new Error(error.error || 'PDF conversion failed');
        }

        // Download the file - IMPROVED METHOD
        const blob = await response.blob();

        // Create PDF blob with explicit MIME type
        const pdfBlob = new Blob([blob], {
            type: 'application/pdf'
        });

        // Method 1: Try direct download
        try {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;

            // Force click
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 1000);

            showStatus('success', '✅', `PDF generated! Check Downloads folder for: ${filename}`);
        } catch (e) {
            // Fallback: Open PDF in new window (PDFs can be viewed directly)
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
            showStatus('success', '✅', 'PDF opened in new tab. Use browser\'s save/download option.');
        }


    } catch (error) {
        console.error('PDF conversion error:', error);
        showStatus('error', '❌', error.message || 'PDF conversion failed. Please try again.');
    } finally {
        // Re-enable button
        convertPDFBtn.disabled = false;
        convertPDFBtn.innerHTML = originalText;
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
