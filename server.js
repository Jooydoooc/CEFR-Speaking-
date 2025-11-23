require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + sanitizedName;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Basic file filter - allow all file types
        cb(null, true);
    }
});

// In-memory storage for file metadata
let files = [];

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'File Manager API is running',
        timestamp: new Date().toISOString()
    });
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        const fileInfo = {
            id: generateId(),
            name: req.file.originalname,
            size: req.file.size,
            path: req.file.path,
            uploadDate: new Date().toISOString(),
            type: req.file.mimetype
        };

        files.push(fileInfo);

        res.json({
            message: 'File uploaded successfully',
            file: fileInfo,
            totalFiles: files.length
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'UPLOAD_ERROR'
        });
    }
});

// Get all files
app.get('/api/files', (req, res) => {
    try {
        res.json({
            files: files,
            count: files.length
        });
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'FILES_ERROR'
        });
    }
});

// Download file
app.get('/api/files/:id', (req, res) => {
    try {
        const fileId = req.params.id;
        const file = files.find(f => f.id === fileId);

        if (!file) {
            return res.status(404).json({
                error: 'File not found',
                code: 'NOT_FOUND',
                id: fileId
            });
        }

        if (!fs.existsSync(file.path)) {
            return res.status(404).json({
                error: 'File not found on server',
                code: 'FILE_MISSING'
            });
        }

        res.download(file.path, file.name);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'DOWNLOAD_ERROR'
        });
    }
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
    try {
        const fileId = req.params.id;
        const fileIndex = files.findIndex(f => f.id === fileId);

        if (fileIndex === -1) {
            return res.status(404).json({
                error: 'File not found',
                code: 'NOT_FOUND'
            });
        }

        const file = files[fileIndex];

        // Remove file from filesystem
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // Remove from memory
        files.splice(fileIndex, 1);

        res.json({
            message: 'File deleted successfully',
            deletedFile: file.name
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'DELETE_ERROR'
        });
    }
});

// Clear all files (for testing)
app.delete('/api/files', (req, res) => {
    try {
        // Remove all files from filesystem
        files.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });

        const deletedCount = files.length;
        files = [];

        res.json({
            message: 'All files deleted successfully',
            deletedCount: deletedCount
        });

    } catch (error) {
        console.error('Clear files error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'CLEAR_ERROR'
        });
    }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
        availableEndpoints: [
            'GET /api/health',
            'POST /api/upload',
            'GET /api/files',
            'GET /api/files/:id',
            'DELETE /api/files/:id'
        ]
    });
});

// Utility function to generate unique IDs
function generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Something went wrong!',
        code: 'INTERNAL_ERROR'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ./uploads/`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
