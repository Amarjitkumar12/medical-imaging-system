// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');
const { User, Patient, Report, Image, ClinicSettings, initializeDatabase } = require('../database');

const app = express();

// JWT Secret
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
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/', apiLimiter);

// Initialize database connection
let dbInitialized = false;

async function ensureDbConnection() {
    if (!dbInitialized) {
        try {
            await initializeDatabase();
            dbInitialized = true;
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, JWT_SECRET);
        
        await ensureDbConnection();
        const user = await User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive) {
            return res.status(403).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Helper function to sanitize filenames
function sanitizeFilename(name) {
    return name
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length to 50 characters
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Authentication Routes
app.post('/api/register', authLimiter, async (req, res) => {
    try {
        await ensureDbConnection();
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

        console.log(`✅ New clinic registered: ${clinicName} (${email})`);
        res.status(201).json({ 
            message: 'Account created successfully',
            user: {
                email: user.email,
                clinicName: user.clinicName,
                doctorName: user.doctorName
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
    try {
        await ensureDbConnection();
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
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`✅ User logged in: ${user.clinicName} (${user.email})`);
        res.json({
            token,
            user: {
                email: user.email,
                clinicName: user.clinicName,
                doctorName: user.doctorName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            user: {
                email: req.user.email,
                clinicName: req.user.clinicName,
                doctorName: req.user.doctorName,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('❌ Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Get clinic settings
app.get('/settings', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
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
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update clinic settings
app.post('/settings', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
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
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Save report endpoint
app.post('/save-report', authenticateToken, upload.array('images'), async (req, res) => {
    try {
        await ensureDbConnection();
        const { patientData, imagesPerPage, clinicData, reportType, imageSize } = req.body;
        const images = req.files || [];

        // Find or create patient (within this clinic)
        let patient = await Patient.findOne({ 
            clinicId: req.user._id,
            uhid: patientData.uhid 
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
                filename: images[i].originalname,
                originalName: images[i].originalname,
                imageData: images[i].buffer.toString('base64'),
                size: images[i].size
            });
        }

        console.log(`✅ Report saved to database: Patient ${patientData.name}, Report ID ${report._id}`);
        res.json({ success: true, reportId: report._id });

    } catch (error) {
        console.error('❌ Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report', details: error.message });
    }
});

// Get all reports
app.get('/reports', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
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
        console.error('❌ Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Delete report endpoint
app.delete('/reports/:id', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        const reportId = req.params.id;

        // Find the report (only from this clinic)
        const report = await Report.findOne({ 
            _id: reportId, 
            clinicId: req.user._id 
        });
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Delete associated images from database
        await Image.deleteMany({ 
            reportId: reportId,
            clinicId: req.user._id 
        });

        // Delete the report
        await Report.findOneAndDelete({ 
            _id: reportId, 
            clinicId: req.user._id 
        });

        console.log(`✅ Report deleted from database: ID ${reportId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// Alias for delete report (frontend compatibility)
app.delete('/delete-report/:id', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        const reportId = req.params.id;
        
        // Find the report (only from this clinic)
        const report = await Report.findOne({ 
            _id: reportId, 
            clinicId: req.user._id 
        });
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        // Delete associated images from database
        await Image.deleteMany({ 
            reportId: reportId,
            clinicId: req.user._id 
        });
        
        // Delete the report
        await Report.findOneAndDelete({ 
            _id: reportId, 
            clinicId: req.user._id 
        });
        
        console.log(`✅ Report deleted from database: ID ${reportId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await ensureDbConnection();
        res.json({ 
            success: true, 
            message: 'Server is healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            environment: 'vercel-serverless'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// Note: PDF generation with Puppeteer is not supported in Vercel serverless functions
// due to the binary size limitations. For PDF generation, consider:
// 1. Using a different deployment platform (Railway, Render, etc.)
// 2. Using a PDF generation service API
// 3. Moving PDF generation to a separate microservice

// Catch-all route for SPA
app.get('*', (req, res) => {
    // Check if it's an API route
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // For non-API routes, serve the login page
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Export for Vercel
module.exports = app;