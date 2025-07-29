# MongoDB Setup Guide for Medical Imaging System

## Option 1: Local MongoDB Installation (Recommended for Development)

### Windows Installation:
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. Choose "Complete" installation
4. Install MongoDB as a Windows Service (recommended)
5. Install MongoDB Compass (GUI tool) when prompted

### Start MongoDB Service:
```cmd
net start MongoDB
```

### Verify Installation:
```cmd
mongo --version
```

## Option 2: MongoDB Atlas (Cloud Database)

### Setup MongoDB Atlas:
1. Go to https://www.mongodb.com/atlas
2. Create a free account
3. Create a new cluster (free tier available)
4. Create a database user with read/write permissions
5. Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)
6. Get your connection string

### Environment Variable:
Create a `.env` file in your project root:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical_imaging?retryWrites=true&w=majority
```

## Installation Steps:

1. **Install Dependencies:**
```cmd
npm install
```

2. **Start MongoDB (if using local installation):**
```cmd
net start MongoDB
```

3. **Run the Application:**
```cmd
npm start
```

## Database Configuration:

The application will automatically:
- Connect to MongoDB (local or Atlas)
- Create the required collections
- Set up default clinic settings

## Collections Created:
- `patients` - Patient information
- `reports` - Medical reports
- `images` - Medical images (stored as base64)
- `clinicsettings` - Clinic configuration

## Connection Details:
- **Local MongoDB:** `mongodb://localhost:27017/medical_imaging`
- **MongoDB Atlas:** Use your connection string in MONGODB_URI environment variable

## Troubleshooting:

### MongoDB Service Not Starting:
```cmd
# Check if MongoDB is running
tasklist /fi "imagename eq mongod.exe"

# Start MongoDB manually
mongod --dbpath "C:\data\db"
```

### Connection Issues:
- Ensure MongoDB service is running
- Check firewall settings
- Verify connection string format
- For Atlas: Check IP whitelist and credentials

### Port Conflicts:
- Default MongoDB port: 27017
- Application will auto-detect available ports starting from 3000

## Benefits of MongoDB:
- ✅ No schema migration issues
- ✅ Flexible document structure
- ✅ Better scalability
- ✅ JSON-like data storage
- ✅ Built-in replication and sharding
- ✅ Cloud-ready with MongoDB Atlas