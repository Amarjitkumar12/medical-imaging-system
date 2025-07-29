# Medical Imaging Report System

A professional X-ray and Ultrasound reporting system that generates PDF reports with patient information and medical images.

## Features

- 📋 **Patient Information Management** - Name, UHID, Age, Sex
- 🖼️ **Medical Image Upload** - Support for X-ray and Ultrasound images
- 📄 **PDF Report Generation** - Professional medical report layout
- 🔧 **Clinic Settings** - Customizable clinic name, address, and logo
- 📊 **Report History** - Save and view generated reports
- 🖨️ **Print Preview** - Preview reports before printing
- 📐 **Image Sizing** - Adjustable image size with slider (50%-150%)
- 📑 **Flexible Layout** - 1-4 images per page options
- 🌐 **Landscape Mode** - Automatic landscape orientation for ultrasound reports

## Quick Start

### Option 1: MongoDB Setup (Recommended)
1. Double-click `setup-mongodb.bat` to install MongoDB and dependencies
2. Run `npm start` to start the application
3. Open your browser to `http://localhost:3000`

### Option 2: Manual Setup
```bash
# Install dependencies
npm install

# Start MongoDB service (Windows)
net start MongoDB

# Start the application
npm start
```

### Option 3: Development Mode
```bash
# Start with auto-reload
npm run dev
```

## 🗄️ Database

The system uses **MongoDB** for better scalability and flexibility:
- **Local MongoDB**: `mongodb://localhost:27017/medical_imaging`
- **MongoDB Atlas**: Cloud database option available
- **Migration**: Automatic migration from SQLite if existing data found

### MongoDB Setup:
1. **Install MongoDB**: Download from https://www.mongodb.com/try/download/community
2. **Run Setup**: Use `setup-mongodb.bat` for automated setup
3. **Migrate Data**: Existing SQLite data will be automatically migrated

## Usage

1. **Fill Patient Information**
   - Enter patient name, UHID, age, and sex
   - Select report type (X-ray or Ultrasound)

2. **Upload Medical Images**
   - Click "Upload Medical Images" and select image files
   - Adjust image size using the slider (50%-150%)
   - Choose images per page (1-4 images)

3. **Generate Reports**
   - **Print Preview**: Preview the report before generating
   - **Save to History**: Save report data for later PDF generation
   - **Generate PDF**: Create and download the PDF report immediately

4. **Manage Reports**
   - Click "View Reports" to see all saved/generated reports
   - Generate PDFs from saved reports
   - View existing PDF reports

5. **Configure Settings**
   - Click "Settings" to configure clinic information
   - Upload clinic logo
   - Set clinic name and address

## System Requirements

- **Node.js** 14.0.0 or higher
- **Windows/Mac/Linux** operating system
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Minimum 2GB RAM** for PDF generation
- **500MB free disk space** for reports and images

## File Structure

```
medical-imaging-system/
├── server.js              # Main server application
├── package.json           # Dependencies and scripts
├── start-app.bat          # Windows startup script
├── README.md              # This file
├── public/                # Web interface files
│   ├── index.html         # Main web page
│   ├── styles.css         # Styling
│   └── script.js          # Client-side functionality
├── reports/               # Generated PDF reports (auto-created)
├── settings/              # Application settings (auto-created)
│   ├── clinic.json        # Clinic configuration
│   └── reports.json       # Reports history
└── uploads/               # Temporary image uploads (auto-created)
```

## Default Settings

- **Port**: 3000
- **Clinic Name**: BREATHE CLINIC (customizable)
- **Image Size**: 100% (adjustable 50%-150%)
- **Images Per Page**: 2 (selectable 1-4)
- **Report Format**: A4 Portrait (Landscape for Ultrasound)

## Troubleshooting

### Port Already in Use
If you see "Port 3000 is already in use":
1. Close other applications using port 3000
2. Wait a moment and try again
3. Or set a different port: `PORT=3001 npm run app`

### PDF Generation Issues
- Ensure sufficient RAM (minimum 2GB)
- Check that images are not corrupted
- Verify image file formats (JPG, PNG supported)

### Dependencies Installation Failed
```bash
# Clean install
npm run clean
```

## Support

For technical support or feature requests, please check the application logs in the console where you started the server.

## Version

Current Version: 1.0.0

---

**Medical Imaging Report System** - Professional healthcare documentation solution