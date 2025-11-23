// Global variables
const API_BASE_URL = 'http://localhost:3000/api';
let currentFiles = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('File Manager App Started');
    loadFiles();
});

// Display messages to user
function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `
        <div class="${type === 'error' ? 'error-message' : 'success-message'}">
            ${message}
        </div>
    `;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 3000);
    }
}

// Upload file function
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    if (files.length === 0) {
        showMessage('Please select a file to upload.');
        return;
    }

    try {
        showLoading('Uploading file...');
        
        for (let file of files) {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);
        }

        showMessage('File uploaded successfully!', 'success');
        fileInput.value = ''; // Clear input
        loadFiles(); // Refresh file list
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(`Upload failed: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Load files from server
async function loadFiles() {
    try {
        showLoading('Loading files...');
        
        const response = await fetch(`${API_BASE_URL}/files`);
        
        if (!response.ok) {
            throw new Error(`Failed to load files: ${response.status}`);
        }

        const files = await response.json();
        currentFiles = files;
        displayFiles(files);
        
    } catch (error) {
        console.error('Load files error:', error);
        
        if (error.message.includes('404')) {
            showMessage('Server endpoint not found. Please check if the server is running.');
        } else {
            showMessage(`Failed to load files: ${error.message}`);
        }
        
        displayFiles([]);
    } finally {
        hideLoading();
    }
}

// Display files in the UI
function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    
    if (!files || files.length === 0) {
        fileList.innerHTML = '<p>No files found. Upload some files to get started!</p>';
        return;
    }

    fileList.innerHTML = files.map(file => `
        <div class="file-item">
            <div>
                <strong>${file.name}</strong>
                <br>
                <small>Size: ${formatFileSize(file.size)}</small>
                <br>
                <small>Uploaded: ${new Date(file.uploadDate).toLocaleDateString()}</small>
            </div>
            <div>
                <button onclick="downloadFile('${file.id}')" class="btn" style="padding: 8px 15px; margin-bottom: 5px;">Download</button>
                <button onclick="deleteFile('${file.id}')" class="btn" style="padding: 8px 15px; background: #dc3545;">Delete</button>
            </div>
        </div>
    `).join('');
}

// Download file function
async function downloadFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const file = currentFiles.find(f => f.id === fileId);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Download error:', error);
        showMessage(`Download failed: ${error.message}`);
    }
}

// Delete file function
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
        }

        showMessage('File deleted successfully!', 'success');
        loadFiles(); // Refresh file list
        
    } catch (error) {
        console.error('Delete error:', error);
        showMessage(`Delete failed: ${error.message}`);
    }
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Loading indicator functions
function showLoading(message = 'Loading...') {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = `<div class="loading">${message}</div>`;
}

function hideLoading() {
    // Loading will be hidden when files are displayed
}
