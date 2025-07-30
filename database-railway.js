const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Railway PostgreSQL connection
let pool;

const connectDB = async () => {
  try {
    // Railway automatically provides DATABASE_URL
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL not found. Make sure Railway PostgreSQL is added.');
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Railway PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Railway PostgreSQL connection error:', error);
    return false;
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const connected = await connectDB();
    if (!connected) return false;
    
    console.log('🔄 Creating database tables...');
    
    // Users table (clinics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        clinic_name VARCHAR(255) NOT NULL,
        doctor_name VARCHAR(255) NOT NULL,
        clinic_address TEXT DEFAULT '',
        clinic_phone VARCHAR(50) DEFAULT '',
        role VARCHAR(20) DEFAULT 'doctor',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Patients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        uhid VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        sex VARCHAR(10) NOT NULL,
        referred_by VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clinic_id, uhid)
      )
    `);
    
    // Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        report_type VARCHAR(20) NOT NULL,
        filename VARCHAR(255) DEFAULT '',
        status VARCHAR(20) DEFAULT 'saved',
        images_count INTEGER DEFAULT 0,
        report_data TEXT DEFAULT '',
        generated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        image_data TEXT NOT NULL,
        size INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Clinic settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinic_settings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'BREATHE CLINIC',
        address TEXT DEFAULT 'Medical Center\\nCity, State - 123456\\nPhone: +91-XXXXXXXXXX',
        logo TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database tables created successfully');
    
    // Create default clinic settings if not exists
    const settingsResult = await pool.query('SELECT COUNT(*) FROM clinic_settings');
    if (parseInt(settingsResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO clinic_settings (name, address) 
        VALUES ('BREATHE CLINIC', 'Medical Center\\nCity, State - 123456\\nPhone: +91-XXXXXXXXXX')
      `);
      console.log('✅ Default clinic settings created');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
};

// User model functions
const User = {
  async create(userData) {
    const { email, password, clinicName, doctorName, clinicAddress, clinicPhone, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(`
      INSERT INTO users (email, password, clinic_name, doctor_name, clinic_address, clinic_phone, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [email, hashedPassword, clinicName, doctorName, clinicAddress || '', clinicPhone || '', role || 'doctor']);
    
    const user = result.rows[0];
    user.comparePassword = async function(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };
    
    return user;
  },
  
  async findOne(query) {
    const { email } = query;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (user) {
      user.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      };
    }
    
    return user || null;
  },
  
  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    
    if (user) {
      user._id = user.id; // MongoDB compatibility
      user.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      };
    }
    
    return user || null;
  },
  
  async save(user) {
    if (user.password && !user.password.startsWith('$2')) {
      user.password = await bcrypt.hash(user.password, 12);
    }
    
    await pool.query(`
      UPDATE users SET 
        last_login = $1,
        password = $2
      WHERE id = $3
    `, [user.lastLogin || new Date(), user.password, user.id]);
    
    return user;
  }
};

// Patient model functions
const Patient = {
  async create(patientData) {
    const { clinicId, name, uhid, age, sex, referredBy } = patientData;
    const result = await pool.query(`
      INSERT INTO patients (clinic_id, name, uhid, age, sex, referred_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [clinicId, name, uhid, age, sex, referredBy || '']);
    
    const patient = result.rows[0];
    patient._id = patient.id; // MongoDB compatibility
    return patient;
  },
  
  async findOne(query) {
    const { clinicId, uhid } = query;
    const result = await pool.query(
      'SELECT * FROM patients WHERE clinic_id = $1 AND uhid = $2',
      [clinicId, uhid]
    );
    
    const patient = result.rows[0];
    if (patient) {
      patient._id = patient.id; // MongoDB compatibility
    }
    
    return patient || null;
  },
  
  async save(patient) {
    await pool.query(`
      UPDATE patients SET 
        name = $1, age = $2, sex = $3, referred_by = $4
      WHERE id = $5
    `, [patient.name, patient.age, patient.sex, patient.referredBy || '', patient.id]);
    
    return patient;
  }
};

// Report model functions
const Report = {
  async create(reportData) {
    const { clinicId, patientId, reportType, filename, status, imagesCount, reportData: data, generatedAt } = reportData;
    const result = await pool.query(`
      INSERT INTO reports (clinic_id, patient_id, report_type, filename, status, images_count, report_data, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [clinicId, patientId, reportType, filename || '', status || 'saved', imagesCount || 0, data || '', generatedAt]);
    
    const report = result.rows[0];
    report._id = report.id; // MongoDB compatibility
    return report;
  },
  
  async find(query) {
    const { clinicId } = query;
    const result = await pool.query(`
      SELECT r.*, p.name as patient_name, p.uhid, p.age, p.sex, p.referred_by
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE r.clinic_id = $1
      ORDER BY r.created_at DESC
    `, [clinicId]);
    
    return result.rows.map(row => ({
      _id: row.id,
      patientId: { 
        name: row.patient_name, 
        uhid: row.uhid, 
        age: row.age, 
        sex: row.sex, 
        referredBy: row.referred_by 
      },
      reportType: row.report_type,
      filename: row.filename,
      status: row.status,
      imagesCount: row.images_count,
      reportData: row.report_data,
      createdAt: row.created_at
    }));
  },
  
  async findOne(query) {
    const { _id, clinicId } = query;
    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND clinic_id = $2',
      [_id, clinicId]
    );
    
    const report = result.rows[0];
    if (report) {
      report._id = report.id;
    }
    
    return report || null;
  },
  
  async findOneAndDelete(query) {
    const { _id, clinicId } = query;
    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1 AND clinic_id = $2 RETURNING *',
      [_id, clinicId]
    );
    
    return result.rows[0] || null;
  },
  
  async save(report) {
    await pool.query(`
      UPDATE reports SET 
        filename = $1, status = $2, generated_at = $3
      WHERE id = $4
    `, [report.filename, report.status, report.generatedAt, report.id]);
    
    return report;
  }
};

// Image model functions
const Image = {
  async create(imageData) {
    const { clinicId, reportId, filename, originalName, imageData: data, size } = imageData;
    const result = await pool.query(`
      INSERT INTO images (clinic_id, report_id, filename, original_name, image_data, size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [clinicId, reportId, filename, originalName, data, size || 0]);
    
    return result.rows[0];
  },
  
  async find(query) {
    const { reportId, clinicId } = query;
    const result = await pool.query(
      'SELECT * FROM images WHERE report_id = $1 AND clinic_id = $2',
      [reportId, clinicId]
    );
    
    return result.rows;
  },
  
  async deleteMany(query) {
    const { reportId, clinicId } = query;
    await pool.query(
      'DELETE FROM images WHERE report_id = $1 AND clinic_id = $2',
      [reportId, clinicId]
    );
  }
};

// Clinic Settings model functions
const ClinicSettings = {
  async findOne() {
    const result = await pool.query('SELECT * FROM clinic_settings LIMIT 1');
    return result.rows[0] || null;
  },
  
  async create(settingsData) {
    const { name, address, logo } = settingsData;
    const result = await pool.query(`
      INSERT INTO clinic_settings (name, address, logo)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, address || '', logo || '']);
    
    return result.rows[0];
  },
  
  async save(settings) {
    await pool.query(`
      UPDATE clinic_settings SET 
        name = $1, address = $2, logo = $3
      WHERE id = $4
    `, [settings.name, settings.address, settings.logo, settings.id]);
    
    return settings;
  }
};

module.exports = {
  pool,
  User,
  Patient,
  Report,
  Image,
  ClinicSettings,
  initializeDatabase,
  connectDB
};