const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { exec } = require('child_process');
const { Patient, Report, Image, ClinicSettings, initializeDatabase } = require('./database');

// Helper function to sanitize filenames
function sanitizeFilename(name) {
    return name
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length to 50 characters
}

// Helper function for Puppeteer configuration
async function createBrowser() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
        ],
        timeout: 60000,
        protocolTimeout: 60000
    });
    return browser;
}

// Helper function for PDF generation with retry logic
async function generatePDFWithRetry(page, pdfOptions) {
    let retries = 3;
    while (retries > 0) {
        try {
            const pdf = await page.pdf(pdfOptions);
            return pdf;
        } catch (error) {
            retries--;
            console.log(`PDF generation attempt failed, retries left: ${retries}`, error.message);
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
    }
}

// Load configuration
let config = {};
try {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (error) {
    console.log('⚠️  Config file not found, using defaults');
    config = {
        app: { defaultPort: 3000, autoOpenBrowser: true },
        clinic: { defaultName: 'BREATHE CLINIC', defaultAddress: 'Medical Center' }
    };
}

const app = express();
let PORT = process.env.PORT || config.app.defaultPort || 3000;

// Function to check if port is available
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        server.on('error', () => resolve(false));
    });
}

// Function to find available port
async function findAvailablePort(startPort) {
    let port = startPort;
    while (port < startPort + 10) {
        if (await isPortAvailable(port)) {
            return port;
        }
        port++;
    }
    throw new Error('No available ports found');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create directories if they don't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('reports')) {
    fs.mkdirSync('reports');
}
if (!fs.existsSync('settings')) {
    fs.mkdirSync('settings');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.array('images', 10), (req, res) => {
    try {
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: file.path
        }));
        res.json({ success: true, files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/generate-pdf', async (req, res) => {
    let browser;
    try {
        const { patientData, images, imagesPerPage, clinicData, reportType, previewOnly, imageSize } = req.body;

        console.log('Generating PDF for patient:', patientData.name);
        console.log('Number of images:', images.length);
        console.log('Report type:', reportType);

        browser = await createBrowser();
        const page = await browser.newPage();
        
        // Set page timeout
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        const html = generateReportHTML(patientData, images, imagesPerPage, clinicData, reportType, imageSize);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Determine page format based on report type
        const isLandscape = reportType === 'ultrasound';
        const pdfOptions = {
            format: 'A4',
            landscape: isLandscape,
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        };

        const pdf = await generatePDFWithRetry(page, pdfOptions);
        await browser.close();

        // Save report if not preview
        if (!previewOnly) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // Create filename with patient name (sanitized for file system)
            const sanitizedPatientName = sanitizeFilename(patientData.name);
            const filename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_${timestamp}.pdf`;
            const filepath = path.join('reports', filename);

            fs.writeFileSync(filepath, pdf);

            // Find or create patient
            let patient = await Patient.findOne({ where: { uhid: patientData.uhid } });
            if (!patient) {
                patient = await Patient.create({
                    name: patientData.name,
                    uhid: patientData.uhid,
                    age: patientData.age,
                    sex: patientData.sex
                });
            }

            // Create report in database
            const report = await Report.create({
                patientId: patient.id,
                reportType,
                filename,
                status: 'generated',
                imagesCount: images.length,
                generatedAt: new Date()
            });

            // Save images to database
            for (let i = 0; i < images.length; i++) {
                await Image.create({
                    reportId: report.id,
                    filename: images[i].name,
                    originalName: images[i].name,
                    imageData: images[i].data,
                    size: images[i].data.length
                });
            }

            console.log(`✅ Report generated and saved to database: Patient ${patientData.name}, Report ID ${report.id}`);
        }

        const sanitizedPatientName = sanitizeFilename(patientData.name);
        const downloadFilename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_report.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${previewOnly ? 'inline' : 'attachment'}; filename="${downloadFilename}"`);
        res.send(pdf);

    } catch (error) {
        console.error('PDF generation error:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Settings routes - using database
app.get('/settings', async (req, res) => {
    try {
        let settings = await ClinicSettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = await ClinicSettings.create({
                name: 'BREATHE CLINIC',
                address: 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX'
            });
        }
        
        res.json({
            name: settings.name,
            address: settings.address,
            logo: settings.logo
        });
        
    } catch (error) {
        console.error('Error fetching settings from database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/settings', async (req, res) => {
    try {
        const { name, address, logo } = req.body;
        
        let settings = await ClinicSettings.findOne();
        if (settings) {
            // Update existing settings
            await settings.update({ name, address, logo });
        } else {
            // Create new settings
            settings = await ClinicSettings.create({ name, address, logo });
        }
        
        console.log('✅ Clinic settings updated in database');
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error saving settings to database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save report to database without generating PDF
app.post('/save-report', async (req, res) => {
    try {
        const { patientData, reportType, images } = req.body;
        
        // Find or create patient
        let patient = await Patient.findOne({ where: { uhid: patientData.uhid } });
        if (!patient) {
            patient = await Patient.create({
                name: patientData.name,
                uhid: patientData.uhid,
                age: patientData.age,
                sex: patientData.sex,
                referredBy: patientData.referredBy
            });
        } else {
            // Update patient info if changed
            await patient.update({
                name: patientData.name,
                age: patientData.age,
                sex: patientData.sex,
                referredBy: patientData.referredBy
            });
        }
        
        // Create report
        const report = await Report.create({
            patientId: patient.id,
            reportType,
            status: 'saved',
            imagesCount: images.length,
            reportData: JSON.stringify(req.body) // Store full report data for later PDF generation
        });
        
        // Save images
        for (let i = 0; i < images.length; i++) {
            await Image.create({
                reportId: report.id,
                filename: images[i].name,
                originalName: images[i].name,
                imageData: images[i].data,
                size: images[i].data.length
            });
        }
        
        console.log(`✅ Report saved to database: Patient ${patientData.name}, Report ID ${report.id}`);
        res.json({ success: true, reportId: report.id });
        
    } catch (error) {
        console.error('Error saving report to database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all reports from database
app.get('/reports', async (req, res) => {
    try {
        const reports = await Report.findAll({
            include: [
                {
                    model: Patient,
                    as: 'patient',
                    attributes: ['name', 'uhid', 'age', 'sex', 'referredBy']
                },
                {
                    model: Image,
                    as: 'images',
                    attributes: ['id', 'filename', 'originalName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        // Format reports for frontend
        const formattedReports = reports.map(report => ({
            id: report.id,
            filename: report.filename || `report-${report.id}.pdf`,
            patientName: report.patient.name,
            uhid: report.patient.uhid,
            age: report.patient.age,
            sex: report.patient.sex,
            referredBy: report.patient.referredBy,
            reportType: report.reportType,
            date: report.createdAt.toISOString(),
            imagesCount: report.imagesCount,
            status: report.status,
            reportData: report.reportData ? JSON.parse(report.reportData) : null
        }));
        
        res.json(formattedReports);
        
    } catch (error) {
        console.error('Error fetching reports from database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/reports/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join('reports', filename);
    if (fs.existsSync(filepath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ error: 'Report not found' });
    }
});

// Delete report from database
app.delete('/delete-report/:id', async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        
        // Find the report
        const report = await Report.findByPk(reportId, {
            include: [{ model: Image, as: 'images' }]
        });
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        // Delete the PDF file if it exists
        if (report.filename) {
            const pdfPath = path.join('reports', report.filename);
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }
        }
        
        // Delete associated images from database
        await Image.destroy({ where: { reportId: reportId } });
        
        // Delete the report
        await report.destroy();
        
        console.log(`✅ Report deleted from database: ID ${reportId}`);
        res.json({ success: true, message: 'Report deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting report from database:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate PDF from saved report
app.post('/generate-from-saved/:id', async (req, res) => {
    let browser;
    try {
        const reportId = parseInt(req.params.id);
        
        // Find the saved report in database
        const report = await Report.findByPk(reportId, {
            include: [
                { model: Patient, as: 'patient' },
                { model: Image, as: 'images' }
            ]
        });
        
        if (!report || !report.reportData) {
            return res.status(404).json({ error: 'Saved report not found' });
        }
        
        const savedReportData = JSON.parse(report.reportData);
        const { patientData, imagesPerPage, clinicData, reportType, imageSize } = savedReportData;
        
        // Get images from database
        const images = report.images.map(img => ({
            name: img.originalName,
            data: img.imageData
        }));
        
        browser = await createBrowser();
        const page = await browser.newPage();
        
        // Set page timeout
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        
        const html = generateReportHTML(patientData, images, imagesPerPage, clinicData, reportType, imageSize);
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const isLandscape = reportType === 'ultrasound';
        const pdfOptions = {
            format: 'A4',
            landscape: isLandscape,
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        };
        
        const pdf = await generatePDFWithRetry(page, pdfOptions);
        await browser.close();
        
        // Save the generated PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Create filename with patient name (sanitized for file system)
        const sanitizedPatientName = sanitizeFilename(report.patient.name);
        const pdfFilename = `${sanitizedPatientName}_${report.patient.uhid}_${reportType}_${timestamp}.pdf`;
        const pdfFilepath = path.join('reports', pdfFilename);
        fs.writeFileSync(pdfFilepath, pdf);
        
        // Update the report status to 'generated'
        await report.update({
            status: 'generated',
            filename: pdfFilename,
            generatedAt: new Date()
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
        res.send(pdf);
        
    } catch (error) {
        console.error('Error generating PDF from saved report:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateReportHTML(patientData, images, imagesPerPage, clinicData, reportType, imageSize = 120) {
    // Adjust image size based on report type
    let adjustedImageSize = imageSize;
    if (reportType === 'xray') {
        adjustedImageSize = Math.max(imageSize, 120); // X-rays should be at least 120%
    } else if (reportType === 'ultrasound') {
        adjustedImageSize = Math.max(imageSize, 100); // Ultrasounds can be smaller
    }
    
    const imagesHTML = generateImagesHTML(images, imagesPerPage, adjustedImageSize);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 15px; font-size: 12px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .header-left { flex: 0 0 auto; }
            .header-right { flex: 1; text-align: right; padding-left: 15px; }
            .logo { max-height: 80px; max-width: 250px; }
            .clinic-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 3px; }
            .clinic-address { font-size: 11px; color: #666; line-height: 1.3; }
            .patient-info { background: #f5f5f5; padding: 12px; border-radius: 5px; margin-bottom: 20px; }
            .patient-info h3 { margin-top: 0; color: #333; margin-bottom: 10px; font-size: 14px; }
            .patient-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            .info-row { display: flex; margin-bottom: 6px; }
            .info-label { font-weight: bold; width: 50px; margin-right: 8px; font-size: 12px; }
            .info-value { flex: 1; font-size: 12px; }
            .images-section { margin-top: 30px; }
            .images-grid { display: grid; gap: 20px; margin-bottom: 40px; }
            .images-grid-1 { grid-template-columns: 1fr; }
            .images-grid-2 { grid-template-columns: 1fr 1fr; }
            .images-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
            .images-grid-4 { grid-template-columns: 1fr 1fr; }
            .image-container { text-align: center; padding: 10px; }
            .image-container img:hover { transform: scale(1.02); transition: transform 0.3s ease; }
            .image-container img { max-width: ${Math.max(adjustedImageSize, 80)}%; height: auto; border: 1px solid #ddd; min-height: 300px; object-fit: contain; }
            .single-image { display: flex; justify-content: center; align-items: center; min-height: 500px; }
            .single-image img { max-width: ${Math.max(adjustedImageSize, 85)}%; max-height: 700px; object-fit: contain; }
            .page-break { page-break-before: always; }
            .footer { position: fixed; bottom: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
            .page-number::after { content: counter(page); }
            .page-total::after { content: counter(pages); }
            @page { margin-bottom: 60px; counter-increment: page; }
            body { counter-reset: page; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                ${clinicData.logo ? `<img src="${clinicData.logo}" alt="Clinic Logo" class="logo">` : ''}
            </div>
            <div class="header-right">
                <div class="clinic-name">${clinicData.name || 'Medical Clinic'}</div>
                <div class="clinic-address">${clinicData.address || ''}</div>
            </div>
        </div>
        
        <div class="patient-info">
            <h3>Patient Information</h3>
            <div class="patient-details">
                <div>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${patientData.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${patientData.age}</span>
                    </div>
                </div>
                <div>
                    <div class="info-row">
                        <span class="info-label">UHID:</span>
                        <span class="info-value">${patientData.uhid}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Sex:</span>
                        <span class="info-value">${patientData.sex}</span>
                    </div>
                </div>
                <div>
                    ${patientData.referredBy ? `
                    <div class="info-row">
                        <span class="info-label">Ref by:</span>
                        <span class="info-value">${patientData.referredBy}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="images-section">
            ${imagesHTML}
        </div>
        
        <div class="footer">
            <div class="report-info">
                <strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
            <div class="page-info">
                <strong>Page:</strong> <span class="page-number"></span>
            </div>
        </div>
    </body>
    </html>
    `;
}

function generateImagesHTML(images, imagesPerPage, imageSize = 120) {
    let html = '';
    
    if (imagesPerPage === 1) {
        // Single image per page
        for (let i = 0; i < images.length; i++) {
            if (i > 0) html += '<div class="page-break"></div>';
            const imageData = images[i].data.startsWith('data:') ? images[i].data : `data:image/jpeg;base64,${images[i].data}`;
            html += `
                <div class="single-image">
                    <img src="${imageData}" alt="Medical Image ${i + 1}">
                </div>
            `;
        }
    } else {
        // Multiple images per page - consistent number on all pages
        const gridClass = `images-grid-${imagesPerPage}`;
        let currentPageImages = 0;
        let pageStarted = false;
        
        for (let i = 0; i < images.length; i++) {
            // Start new page if needed
            if (currentPageImages === 0) {
                if (pageStarted) html += '<div class="page-break"></div>';
                html += `<div class="images-grid ${gridClass}">`;
                pageStarted = true;
            }
            
            const imageData = images[i].data.startsWith('data:') ? images[i].data : `data:image/jpeg;base64,${images[i].data}`;
            html += `
                <div class="image-container">
                    <img src="${imageData}" alt="Medical Image ${i + 1}">
                </div>
            `;
            
            currentPageImages++;
            
            // Close page if we've reached the limit or it's the last image
            if (currentPageImages === imagesPerPage || i === images.length - 1) {
                html += '</div>';
                currentPageImages = 0;
            }
        }
    }

    return html;
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server with automatic port finding
async function startServer() {
    try {
        // Find available port
        PORT = await findAvailablePort(PORT);
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('='.repeat(60));
            console.log('🏥 MEDICAL IMAGING REPORT SYSTEM');
            console.log('='.repeat(60));
            // Get local IP address
            const networkInterfaces = require('os').networkInterfaces();
            let localIP = 'localhost';
            for (const interfaceName in networkInterfaces) {
                const interfaces = networkInterfaces[interfaceName];
                for (const iface of interfaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIP = iface.address;
                        break;
                    }
                }
            }
            
            console.log(`🚀 Server running on:`);
            console.log(`   📱 Local:    http://localhost:${PORT}`);
            console.log(`   🌐 Network:  http://${localIP}:${PORT}`);
            console.log(`📁 Reports saved in: ${path.resolve('./reports/')}`);
            console.log(`⚙️  Settings saved in: ${path.resolve('./settings/')}`);
            console.log(`📤 Uploads folder: ${path.resolve('./uploads/')}`);
            console.log('='.repeat(60));
            console.log('💡 Access from other devices using the Network URL');
            console.log('⏹️  Press Ctrl+C to stop the server');
            console.log('='.repeat(60));
            
            // Try to open browser automatically
            if (config.app.autoOpenBrowser !== false) {
                setTimeout(() => {
                    const url = `http://localhost:${PORT}`;
                    const start = process.platform === 'darwin' ? 'open' : 
                                 process.platform === 'win32' ? 'start' : 'xdg-open';
                    exec(`${start} ${url}`, (err) => {
                        if (err) console.log(`💡 Please manually open ${url} in your browser`);
                    });
                }, 1000);
            }
        });

        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.log('💡 Please check if ports 3000-3010 are available');
        process.exit(1);
    }
}

// Initialize database and start server
async function initializeApp() {
    const dbInitialized = await initializeDatabase();
    if (dbInitialized) {
        await startServer();
    } else {
        console.error('❌ Failed to initialize database. Exiting...');
        process.exit(1);
    }
}

// Start the application
initializeApp();