const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');
const { User, Patient, Report, Image, ClinicSettings, initializeDatabase } = require('./database');

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
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

const app = express();

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/api/', apiLimiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    try {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' });
    }
  });
};

// Create necessary directories
const dirs = ['uploads', 'reports'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication endpoints
app.post('/api/register', authLimiter, async (req, res) => {
    try {
        const { email, password, clinicName, doctorName, clinicAddress, clinicPhone } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            clinicName,
            doctorName,
            clinicAddress: clinicAddress || '',
            clinicPhone: clinicPhone || '',
            role: 'doctor'
        });
        
        console.log(`âœ… New clinic registered: ${clinicName} (${email})`);
        res.status(201).json({ 
            success: true, 
            message: 'Account created successfully',
            userId: user._id 
        });
        
    } catch (error) {
        console.error('âŒ Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, clinicName: user.clinicName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`âœ… User logged in: ${user.clinicName} (${email})`);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                clinicName: user.clinicName,
                doctorName: user.doctorName,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('âŒ Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Generate PDF endpoint for JSON data (used by frontend)
app.post('/generate-pdf', authenticateToken, async (req, res) => {
    let browser;
    try {
        const { patientData, images, imagesPerPage, clinicData, reportType, imageSize, previewOnly } = req.body;
        
        console.log(`ðŸ“‹ Generating ${reportType} ${previewOnly ? 'preview' : 'report'} for patient: ${patientData.name}`);

        // Convert base64 images to buffer format
        const imageBuffers = images.map(img => ({
            buffer: Buffer.from(img.data, 'base64'),
            originalname: img.name
        }));

        // Create browser instance
        browser = await createBrowser();
        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });

        // Generate HTML content
        const htmlContent = generateReportHTML(patientData, imageBuffers, imagesPerPage, clinicData, reportType, imageSize);
        
        // Set content and wait for images to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

        // Generate PDF
        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        };

        const pdf = await generatePDFWithRetry(page, pdfOptions);

        // If not preview only, save to database
        if (!previewOnly) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const sanitizedPatientName = sanitizeFilename(patientData.name);
            const filename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_${timestamp}.pdf`;
            const filepath = path.join('reports', filename);

            fs.writeFileSync(filepath, pdf);

            // Find or create patient
            let patient = await Patient.findOne({ 
                uhid: patientData.uhid,
                clinicId: req.user._id 
            });
            if (!patient) {
                patient = await Patient.create({
                    clinicId: req.user._id,
                    name: patientData.name,
                    uhid: patientData.uhid,
                    age: patientData.age,
                    sex: patientData.sex,
                    referredBy: patientData.referredBy || ''
                });
            }

            // Create report in database
            const report = await Report.create({
                clinicId: req.user._id,
                patientId: patient._id,
                reportType,
                filename,
                status: 'generated',
                imagesCount: images.length,
                generatedAt: new Date()
            });

            // Save images to database
            for (let i = 0; i < images.length; i++) {
                await Image.create({
                    clinicId: req.user._id,
                    reportId: report._id,
                    filename: images[i].name,
                    originalName: images[i].name,
                    imageData: images[i].data,
                    size: Buffer.from(images[i].data, 'base64').length
                });
            }

            console.log(`âœ… Report generated and saved: Patient ${patientData.name}, Report ID ${report._id}`);
        }

        const sanitizedPatientName = sanitizeFilename(patientData.name);
        const downloadFilename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_${previewOnly ? 'preview' : 'report'}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${previewOnly ? 'inline' : 'attachment'}; filename="${downloadFilename}"`);
        res.send(pdf);

    } catch (error) {
        console.error('âŒ Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF report', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Generate PDF report endpoint
app.post('/generate-report', upload.array('images'), async (req, res) => {
    let browser;
    try {
        const { patientData, imagesPerPage, clinicData, reportType, imageSize } = req.body;
        const images = req.files || [];

        console.log(`ðŸ“‹ Generating ${reportType} report for patient: ${patientData.name}`);

        // Create browser instance
        browser = await createBrowser();
        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });

        // Generate HTML content
        const htmlContent = generateReportHTML(patientData, images, imagesPerPage, clinicData, reportType, imageSize);
        
        // Set content and wait for images to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

        // Generate PDF
        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        };

        const pdf = await generatePDFWithRetry(page, pdfOptions);

        // Save to database if requested
        if (req.body.saveToDatabase === 'true') {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const sanitizedPatientName = sanitizeFilename(patientData.name);
            const filename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_${timestamp}.pdf`;
            const filepath = path.join('reports', filename);

            fs.writeFileSync(filepath, pdf);

            // Find or create patient
            let patient = await Patient.findOne({ uhid: patientData.uhid });
            if (!patient) {
                patient = await Patient.create({
                    name: patientData.name,
                    uhid: patientData.uhid,
                    age: patientData.age,
                    sex: patientData.sex,
                    referredBy: patientData.referredBy || ''
                });
            }

            // Create report in database
            const report = await Report.create({
                patientId: patient._id,
                reportType,
                filename,
                status: 'generated',
                imagesCount: images.length,
                generatedAt: new Date()
            });

            // Save images to database
            for (let i = 0; i < images.length; i++) {
                await Image.create({
                    reportId: report._id,
                    filename: images[i].originalname,
                    originalName: images[i].originalname,
                    imageData: images[i].buffer.toString('base64'),
                    size: images[i].size
                });
            }

            console.log(`âœ… Report generated and saved to database: Patient ${patientData.name}, Report ID ${report._id}`);
        }

        const sanitizedPatientName = sanitizeFilename(patientData.name);
        const downloadFilename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_report.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.send(pdf);

    } catch (error) {
        console.error('âŒ Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF report', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Get clinic settings
app.get('/settings', authenticateToken, async (req, res) => {
    try {
        let settings = await ClinicSettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = await ClinicSettings.create({
                name: 'BREATHE CLINIC',
                address: 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX'
            });
        }
        res.json(settings);
    } catch (error) {
        console.error('âŒ Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update clinic settings
app.post('/settings', authenticateToken, async (req, res) => {
    try {
        const { name, address, logo } = req.body;
        
        let settings = await ClinicSettings.findOne();
        if (settings) {
            // Update existing settings
            settings.name = name;
            settings.address = address;
            settings.logo = logo;
            await settings.save();
        } else {
            // Create new settings
            settings = await ClinicSettings.create({ name, address, logo });
        }
        
        res.json({ success: true, settings });
    } catch (error) {
        console.error('âŒ Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Save report endpoint (JSON data)
app.post('/save-report', authenticateToken, async (req, res) => {
    try {
        const { patientData, images, imagesPerPage, clinicData, reportType, imageSize } = req.body;
        
        // Find or create patient
        let patient = await Patient.findOne({ 
            uhid: patientData.uhid,
            clinicId: req.user._id 
        });
        if (!patient) {
            patient = await Patient.create({
                clinicId: req.user._id,
                name: patientData.name,
                uhid: patientData.uhid,
                age: patientData.age,
                sex: patientData.sex,
                referredBy: patientData.referredBy || ''
            });
        } else {
            // Update patient info if changed
            patient.name = patientData.name;
            patient.age = patientData.age;
            patient.sex = patientData.sex;
            patient.referredBy = patientData.referredBy || '';
            await patient.save();
        }
        
        // Create report
        const report = await Report.create({
            clinicId: req.user._id,
            patientId: patient._id,
            reportType,
            status: 'saved',
            imagesCount: images.length,
            reportData: JSON.stringify({ patientData, imagesPerPage, clinicData, reportType, imageSize })
        });

        // Save images
        for (let i = 0; i < images.length; i++) {
            await Image.create({
                clinicId: req.user._id,
                reportId: report._id,
                filename: images[i].name,
                originalName: images[i].name,
                imageData: images[i].data,
                size: Buffer.from(images[i].data, 'base64').length
            });
        }
        
        console.log(`âœ… Report saved to database: Patient ${patientData.name}, Report ID ${report._id}`);
        res.json({ success: true, reportId: report._id });
        
    } catch (error) {
        console.error('âŒ Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report', details: error.message });
    }
});

// Save report endpoint (legacy - form data)
app.post('/save-report-form', upload.array('images'), async (req, res) => {
    try {
        const { patientData, imagesPerPage, clinicData, reportType, imageSize } = req.body;
        const images = req.files || [];
        
        // Find or create patient
        let patient = await Patient.findOne({ uhid: patientData.uhid });
        if (!patient) {
            patient = await Patient.create({
                name: patientData.name,
                uhid: patientData.uhid,
                age: patientData.age,
                sex: patientData.sex,
                referredBy: patientData.referredBy || ''
            });
        } else {
            // Update patient info if changed
            patient.name = patientData.name;
            patient.age = patientData.age;
            patient.sex = patientData.sex;
            patient.referredBy = patientData.referredBy || '';
            await patient.save();
        }
        
        // Create report
        const report = await Report.create({
            patientId: patient._id,
            reportType,
            status: 'saved',
            imagesCount: images.length,
            reportData: JSON.stringify({ patientData, imagesPerPage, clinicData, reportType, imageSize })
        });

        // Save images
        for (let i = 0; i < images.length; i++) {
            await Image.create({
                reportId: report._id,
                filename: images[i].originalname,
                originalName: images[i].originalname,
                imageData: images[i].buffer.toString('base64'),
                size: images[i].size
            });
        }
        
        console.log(`âœ… Report saved to database: Patient ${patientData.name}, Report ID ${report._id}`);
        res.json({ success: true, reportId: report._id });
        
    } catch (error) {
        console.error('âŒ Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report', details: error.message });
    }
});

// Get all reports
app.get('/reports', authenticateToken, async (req, res) => {
    try {
        const reports = await Report.find({ clinicId: req.user._id })
            .populate('patientId', 'name uhid age sex referredBy')
            .sort({ createdAt: -1 });

        // Format reports for frontend
        const formattedReports = reports.map(report => ({
            id: report._id,
            filename: report.filename || `report-${report._id}.pdf`,
            patientName: report.patientId.name,
            uhid: report.patientId.uhid,
            age: report.patientId.age,
            sex: report.patientId.sex,
            referredBy: report.patientId.referredBy,
            reportType: report.reportType,
            date: report.createdAt.toISOString(),
            imagesCount: report.imagesCount,
            status: report.status,
            reportData: report.reportData ? JSON.parse(report.reportData) : null
        }));
        
        res.json(formattedReports);
    } catch (error) {
        console.error('âŒ Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Delete report endpoint
app.delete('/reports/:id', async (req, res) => {
    try {
        const reportId = req.params.id;
        
        // Find the report
        const report = await Report.findById(reportId);
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
        await Image.deleteMany({ reportId: reportId });
        
        // Delete the report
        await Report.findByIdAndDelete(reportId);
        
        console.log(`âœ… Report deleted from database: ID ${reportId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('âŒ Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// Generate PDF from saved report
app.post('/generate-from-saved/:id', async (req, res) => {
    let browser;
    try {
        const reportId = req.params.id;
        
        // Find the saved report in database
        const report = await Report.findById(reportId)
            .populate('patientId', 'name uhid age sex referredBy');
        
        if (!report || !report.reportData) {
            return res.status(404).json({ error: 'Saved report not found' });
        }
        
        const savedReportData = JSON.parse(report.reportData);
        const { patientData, imagesPerPage, clinicData, reportType, imageSize } = savedReportData;
        
        // Get images from database
        const images = await Image.find({ reportId: reportId });
        const imageBuffers = images.map(img => ({
            buffer: Buffer.from(img.imageData, 'base64'),
            originalname: img.originalName
        }));

        console.log(`ðŸ“‹ Generating PDF from saved ${reportType} report for patient: ${patientData.name}`);

        // Create browser instance
        browser = await createBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600 });

        // Generate HTML content
        const htmlContent = generateReportHTML(patientData, imageBuffers, imagesPerPage, clinicData, reportType, imageSize);
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        };

        const pdf = await generatePDFWithRetry(page, pdfOptions);

        // Update report status and save PDF file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sanitizedPatientName = sanitizeFilename(patientData.name);
        const filename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_${timestamp}.pdf`;
        const filepath = path.join('reports', filename);

        fs.writeFileSync(filepath, pdf);

        // Update report in database
        report.filename = filename;
        report.status = 'generated';
        report.generatedAt = new Date();
        await report.save();

        const downloadFilename = `${sanitizedPatientName}_${patientData.uhid}_${reportType}_report.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.send(pdf);

    } catch (error) {
        console.error('âŒ Error generating PDF from saved report:', error);
        res.status(500).json({ error: 'Failed to generate PDF from saved report', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// HTML generation function
function generateReportHTML(patientData, images, imagesPerPage, clinicData, reportType, imageSize) {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const reportTitle = reportType === 'xray' ? 'X-RAY REPORT' : 'ULTRASOUND REPORT';
    
    // Convert image size percentage to actual size
    const sizePercentage = parseInt(imageSize) || 100;
    console.log(`ðŸ“ Server received image size: ${imageSize}%, calculated: ${sizePercentage}%`);
    
    const baseWidth = 500; // Increased base width for better scaling
    const baseHeight = 400; // Increased base height for better scaling
    const imageWidth = Math.round(baseWidth * (sizePercentage / 100));
    const imageHeight = Math.round(baseHeight * (sizePercentage / 100));
    
    console.log(`ðŸ“ Calculated image dimensions: ${imageWidth}px x ${imageHeight}px`);
    
    let imagesHTML = '';
    
    if (images && images.length > 0) {
        const totalPages = Math.ceil(images.length / imagesPerPage);
        
        for (let page = 0; page < totalPages; page++) {
            const startIndex = page * imagesPerPage;
            const endIndex = Math.min(startIndex + imagesPerPage, images.length);
            const pageImages = images.slice(startIndex, endIndex);
            
            if (page > 0) {
                imagesHTML += '<div style="page-break-before: always;"></div>';
            }
            
            imagesHTML += '<div class="images-container">';
            
            pageImages.forEach((image, index) => {
                const imageData = image.buffer ? 
                    `data:image/jpeg;base64,${image.buffer.toString('base64')}` : 
                    `data:image/jpeg;base64,${image}`;
                
                imagesHTML += `
                    <div class="image-item">
                        <img src="${imageData}" 
                             style="width: ${imageWidth}px; height: ${imageHeight}px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px;" 
                             alt="Medical Image ${startIndex + index + 1}">
                        <p class="image-caption">Image ${startIndex + index + 1}</p>
                    </div>
                `;
            });
            
            imagesHTML += '</div>';
        }
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
                color: #333;
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                border-bottom: 2px solid #2c5aa0;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .clinic-logo {
                max-width: 250px;
                max-height: 80px;
                object-fit: contain;
                flex-shrink: 0;
            }
            .clinic-info {
                text-align: center;
                flex-grow: 1;
            }
            .clinic-name {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 5px;
            }
            .clinic-address {
                font-size: 12px;
                color: #666;
                white-space: pre-line;
                margin-bottom: 10px;
            }
            .report-title {
                font-size: 20px;
                font-weight: bold;
                color: #2c5aa0;
                margin-top: 10px;
            }
            .patient-info {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .info-group {
                display: flex;
                flex-direction: column;
            }
            .info-label {
                font-weight: bold;
                font-size: 11px;
                color: #555;
                margin-bottom: 3px;
            }
            .info-value {
                font-size: 13px;
                color: #333;
                padding: 3px 0;
            }
            .date-section {
                text-align: right;
                margin-bottom: 20px;
                font-size: 12px;
            }
            .images-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 20px 0;
                justify-items: center;
                align-items: start;
            }
            .image-item {
                text-align: center;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .image-caption {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
                font-weight: bold;
            }
            .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                font-size: 10px;
                color: #666;
                text-align: center;
            }
            @media print {
                body { margin: 0; }
                .page-break { page-break-before: always; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            ${clinicData.logo ? `<img src="${clinicData.logo}" alt="Clinic Logo" class="clinic-logo">` : ''}
            <div class="clinic-info">
                <div class="clinic-name">${clinicData.name}</div>
                <div class="clinic-address">${clinicData.address}</div>
                <div class="report-title">${reportTitle}</div>
            </div>
        </div>

        <div class="date-section">
            <strong>Date: ${currentDate}</strong>
        </div>

        <div class="patient-info">
            <div class="info-group">
                <div class="info-label">PATIENT NAME</div>
                <div class="info-value">${patientData.name}</div>
            </div>
            <div class="info-group">
                <div class="info-label">UHID</div>
                <div class="info-value">${patientData.uhid}</div>
            </div>
            <div class="info-group">
                <div class="info-label">AGE/SEX</div>
                <div class="info-value">${patientData.age}/${patientData.sex}</div>
            </div>
            ${patientData.referredBy ? `
            <div class="info-group">
                <div class="info-label">REFERRED BY</div>
                <div class="info-value">${patientData.referredBy}</div>
            </div>
            ` : ''}
        </div>

        ${imagesHTML}

        <div class="footer">
            <p>This is a computer generated report.</p>
        </div>
    </body>
    </html>
    `;
}

// Auto-detect available port
async function findAvailablePort(startPort = 3000) {
    return new Promise((resolve) => {
        const server = app.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        }).on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// Start server
// Start server
async function startServer() {
    try {
        // Initialize database (don't crash if it fails)
        try {
            const dbInitialized = await initializeDatabase();
            if (dbInitialized) {
                console.log('✅ Database initialized successfully');
            } else {
                console.log('⚠️  Database initialization failed, but server will continue');
                console.log('💡 Please check Railway PostgreSQL connection and add DATABASE_URL');
            }
        } catch (dbError) {
            console.log('⚠️  Database connection failed, but server will continue');
            console.log('💡 Database will be initialized on first request');
            console.log(`🔍 Database error: ${dbError.message}`);
        }

        // Use Railway's PORT or fallback to 3000
        const port = process.env.PORT || 3000;

        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Medical Imaging Report System running on port ${port}`);
            console.log(`🚂 Database: Railway PostgreSQL`);
            console.log(`📁 Reports saved to: ./reports/`);
            console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

            // Only auto-open browser in local development
            if (process.env.NODE_ENV !== 'production' && process.platform === 'win32') {
                exec(`start http://localhost:${port}`);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        // Don't exit in production, just log the error
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Server will continue running despite startup error');
        } else {
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

// Start the server
startServer();