// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { initializeDatabase, User, Patient, Report } = require('../database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

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

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'medical-imaging-super-secret-key-2024', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        await ensureDbConnection();
        
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'medical-imaging-super-secret-key-2024',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create patient endpoint
app.post('/api/patients', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        
        const { name, age, gender, contact, medicalHistory } = req.body;

        if (!name || !age || !gender) {
            return res.status(400).json({ error: 'Name, age, and gender are required' });
        }

        const patient = new Patient({
            name,
            age: parseInt(age),
            gender,
            contact: contact || '',
            medicalHistory: medicalHistory || '',
            createdAt: new Date()
        });

        await patient.save();
        res.json({ success: true, patient });

    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({ error: 'Failed to create patient' });
    }
});

// Get patients endpoint
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.json({ success: true, patients });

    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});

// Upload image and create report endpoint
app.post('/api/reports', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureDbConnection();
        
        const { patientId, reportType, findings, recommendations } = req.body;

        if (!patientId || !reportType) {
            return res.status(400).json({ error: 'Patient ID and report type are required' });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        let imageData = null;
        if (req.file) {
            imageData = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
                filename: req.file.originalname
            };
        }

        const report = new Report({
            patientId,
            patientName: patient.name,
            reportType,
            findings: findings || '',
            recommendations: recommendations || '',
            image: imageData,
            createdAt: new Date()
        });

        await report.save();
        res.json({ success: true, report: { ...report.toObject(), image: undefined } });

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

// Get reports endpoint
app.get('/api/reports', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        
        const reports = await Report.find()
            .select('-image.data') // Exclude image data for list view
            .sort({ createdAt: -1 });
        
        res.json({ success: true, reports });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Get report image endpoint
app.get('/api/reports/:id/image', authenticateToken, async (req, res) => {
    try {
        await ensureDbConnection();
        
        const report = await Report.findById(req.params.id);
        if (!report || !report.image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.set('Content-Type', report.image.contentType);
        res.send(report.image.data);

    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({ error: 'Failed to fetch image' });
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
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// Export for Vercel
module.exports = app;