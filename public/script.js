// File Manager Application - Frontend JavaScript
class FileManager {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/api';
        this.currentFiles = [];
        this.init();
    }

    init() {
        console.log('🚀 File Manager App Started');
        this.setupEventListeners();
        this.checkServerHealth();
        this.loadFiles();
    }

    setupEventListeners() {
        // File input click handler
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.showMessage(`Selected ${files.length} file(s) for upload`, 'success');
            }
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.showMessage(`Selected ${e.target.files.length} file(s) for upload`, 'success');
            }
        });
    }

    async checkServerHealth() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/health`);
            const data = await response.json();
            document.getElementById('serverStatus').textContent = '🟢 Connected';
            document.getElementById('serverStatus').style.color = '#27ae60';
        } catch (error) {
            console.error('Server health check failed:', error);
            document.getElementById('serverStatus').textContent = '🔴 Disconnected';
            document.getElementById('serverStatus').style.color = '#e74c3c';
            this.showMessage('Cannot connect to server. Please make sure the server is running.', 'error');
        }
    }

    showMessage(message, type = 'error') {
        const messageArea = document.getElementById('messageArea');
        const messageClass = type === 'error' ? 'error-message' : 'success-message';
        
        messageArea.innerHTML = `<div class="${messageClass}">${message}</div>`;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageArea.innerHTML.includes(message)) {
                    messageArea.innerHTML = '';
                }
            }, 5000);
        }
    }

    showLoading(message = 'Loading...') {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = `<div class="loading">${message}</div>`;
    }

    async uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;

        if (files.length === 0) {
            this.showMessage('Please select at least one file to upload.');
            return;
        }

        try {
            this.showLoading(`Uploading ${files.length} file(s)...`);
            
            let successCount = 0;
            let errorCount = 0;

            for (let file of files) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch(`${this.API_BASE_URL}/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('Upload successful:', result);
                    successCount++;
                    
                } catch (error) {
                    console.error(`Upload error for ${file.name}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                this.showMessage(`Successfully uploaded ${successCount} file(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 'success');
            }
            if (errorCount > 0) {
                this.showMessage(`Failed to upload ${errorCount} file(s)`, 'error');
            }

            fileInput.value = ''; // Clear input
            this.loadFiles(); // Refresh file list
            
        } catch (error) {
            console.error('Upload process error:', error);
            this.showMessage(`Upload failed: ${error.message}`);
        }
    }

    async loadFiles() {
        try {
            this.showLoading('Loading files...');
            
            const response = await fetch(`${this.API_BASE_URL}/files`);
            
            if (!response.ok) {
                throw new Error(`Failed to load files: ${response.status}`);
            }

            const data = await response.json();
            this.currentFiles = data.files || [];
            this.displayFiles(this.currentFiles);
            
        } catch (error) {
            console.error('Load files error:', error);
            
            if (error.message.includes('404')) {
                this.showMessage('Server endpoint not found. Please check if the server is running.');
            } else if (error.message.includes('Failed to fetch')) {
                this.showMessage('Cannot connect to server. Please make sure the server is running.');
            } else {
                this.showMessage(`Failed to load files: ${error.message}`);
            }
            
            this.displayFiles([]);
        }
    }

    displayFiles(files) {
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        fileCount.textContent = files.length;

        if (!files || files.length === 0) {
            fileList.innerHTML = '<div class="empty-state">No files found. Upload some files to get started!</div>';
            return;
        }

        fileList.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        Size: ${this.formatFileSize(file.size)} | 
                        Type: ${file.type || 'Unknown'} | 
                        Uploaded: ${new Date(file.uploadDate).toLocaleDateString()}
                    </div>
                </div>
                <div class="file-actions">
                    <button onclick="fileManager.downloadFile('${file.id}')" class="btn">📥 Download</button>
                    <button onclick="fileManager.deleteFile('${file.id}')" class="btn btn-danger">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    async downloadFile(fileId) {
        try {
            const file = this.currentFiles.find(f => f.id === fileId);
            if (!file) {
                this.showMessage('File not found');
                return;
            }

            this.showMessage(`Downloading ${file.name}...`, 'success');
            
            const response = await fetch(`${this.API_BASE_URL}/files/${fileId}`);
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showMessage(`Download failed: ${error.message}`);
        }
    }

    async deleteFile(fileId) {
        const file = this.currentFiles.find(f => f.id === fileId);
        if (!file) {
            this.showMessage('File not found');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/files/${fileId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }

            this.showMessage(`"${file.name}" deleted successfully!`, 'success');
            this.loadFiles(); // Refresh file list
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showMessage(`Delete failed: ${error.message}`);
        }
    }

    async clearAllFiles() {
        if (this.currentFiles.length === 0) {
            this.showMessage('No files to clear');
            return;
        }

        if (!confirm(`Are you sure you want to delete ALL ${this.currentFiles.length} files? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/files`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Clear failed: ${response.status}`);
            }

            const result = await response.json();
            this.showMessage(`All files (${result.deletedCount}) deleted successfully!`, 'success');
            this.loadFiles(); // Refresh file list
            
        } catch (error) {
            console.error('Clear files error:', error);
            this.showMessage(`Clear failed: ${error.message}`);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the application
const fileManager = new FileManager();

// Global functions for HTML onclick handlers
function uploadFile() {
    fileManager.uploadFile();
}

function clearAllFiles() {
    fileManager.clearAllFiles();
}
