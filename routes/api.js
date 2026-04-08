const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const db = require('../database');

// Configure Multer for JPEG only
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '.jpg')
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG images are allowed'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// POST /upload -> handle image upload with validation
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a valid JPEG image.' });
    }
    res.json({ message: 'Image uploaded successfully', filename: req.file.filename });
});

// POST /submit -> save data + generate PDF
router.post('/submit', (req, res) => {
    const { name, filename } = req.body;
    
    if (!name || !filename) {
        return res.status(400).json({ error: 'Name and image are required.' });
    }

    const imagePath = `uploads/${filename}`;
    
    db.run(`INSERT INTO applications (name, image_path) VALUES (?, ?)`, [name, imagePath], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        const appId = this.lastID;
        
        // Generate PDF
        const doc = new PDFDocument();
        const pdfFileName = `application_${appId}.pdf`;
        const pdfRelativePath = `uploads/${pdfFileName}`;
        const pdfPath = path.join(__dirname, '..', 'uploads', pdfFileName);
        
        // Save the PDF path in the database
        db.run(`UPDATE applications SET pdf_path = ? WHERE id = ?`, [pdfRelativePath, appId]);
        
        doc.pipe(fs.createWriteStream(pdfPath));
        
        doc.fontSize(25).text('SMCET', { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text('Application', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(16).text(`User Name: ${name}`, { align: 'center' });
        doc.moveDown(2);
        
        const fullImagePath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullImagePath)) {
            // Calculate center position for the image
            const imageWidth = 250;
            const centerX = (doc.page.width - imageWidth) / 2;
            
            doc.image(fullImagePath, centerX, doc.y, {
                fit: [imageWidth, 300],
                align: 'center'
            });
        }
        
        doc.end();
        
        res.json({ 
            message: 'Application submitted successfully', 
            id: appId,
            pdfUrl: `/api/download/${pdfFileName}`
        });
    });
});

// GET /image/:id -> fetch stored image
router.get('/image/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT image_path FROM applications WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Image not found' });
        }
        res.sendFile(path.resolve(__dirname, '..', row.image_path));
    });
});

// Extra route to download PDF
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const file = path.resolve(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(file)) {
        return res.status(404).json({ error: 'PDF not found' });
    }
    res.download(file);
});

module.exports = router;
