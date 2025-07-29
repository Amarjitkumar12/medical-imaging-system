const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const connectDB = async () => {
  try {
    // Use MongoDB Atlas connection string or local MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_imaging';
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

// User/Clinic Schema for Authentication
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  clinicName: {
    type: String,
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  clinicAddress: {
    type: String,
    default: ''
  },
  clinicPhone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'doctor'],
    default: 'doctor'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Patient Schema with Clinic Separation
const patientSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  uhid: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  sex: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  referredBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound unique index: UHID unique per clinic
patientSchema.index({ clinicId: 1, uhid: 1 }, { unique: true });

// Report Schema with Clinic Separation
const reportSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  reportType: {
    type: String,
    enum: ['xray', 'ultrasound'],
    required: true
  },
  filename: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['saved', 'generated'],
    default: 'saved'
  },
  imagesCount: {
    type: Number,
    default: 0
  },
  reportData: {
    type: String, // Store JSON data for saved reports
    default: ''
  },
  generatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Image Schema with Clinic Separation
const imageSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  imageData: {
    type: String, // Store base64 image data
    required: true
  },
  size: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Clinic Settings Schema
const clinicSettingsSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'BREATHE CLINIC'
  },
  address: {
    type: String,
    default: 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX'
  },
  logo: {
    type: String, // Store base64 logo data
    default: ''
  }
}, {
  timestamps: true
});

// Create models
const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Report = mongoose.model('Report', reportSchema);
const Image = mongoose.model('Image', imageSchema);
const ClinicSettings = mongoose.model('ClinicSettings', clinicSettingsSchema);

// Database initialization
async function initializeDatabase() {
  try {
    const connected = await connectDB();
    if (!connected) return false;
    
    console.log('✅ Database models initialized.');
    
    // Create default clinic settings if not exists
    const settingsCount = await ClinicSettings.countDocuments();
    if (settingsCount === 0) {
      await ClinicSettings.create({
        name: 'BREATHE CLINIC',
        address: 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX'
      });
      console.log('✅ Default clinic settings created.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

module.exports = {
  mongoose,
  User,
  Patient,
  Report,
  Image,
  ClinicSettings,
  initializeDatabase,
  connectDB
};