# MongoDB Deployment Guide

## 🚀 Deployment Options

### 1. Railway Deployment with MongoDB Atlas

#### Step 1: Setup MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Create a database user with read/write permissions
4. Whitelist all IP addresses (0.0.0.0/0) for Railway
5. Get your connection string

#### Step 2: Deploy to Railway
1. Push your code to GitHub
2. Connect your GitHub repo to Railway
3. Add environment variable:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical_imaging?retryWrites=true&w=majority
   ```
4. Deploy automatically

### 2. Render Deployment with MongoDB Atlas

#### Step 1: Setup MongoDB Atlas (same as above)

#### Step 2: Deploy to Render
1. Connect your GitHub repo to Render
2. Choose "Web Service"
3. Add environment variable:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical_imaging?retryWrites=true&w=majority
   ```
4. Deploy

### 3. Local Production Setup

#### Prerequisites:
- MongoDB installed and running
- Node.js 14+ installed

#### Setup:
```bash
# Install dependencies
npm install

# Start MongoDB service
net start MongoDB

# Start application
npm start
```

## 📋 Environment Variables

### Required for Cloud Deployment:
```env
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
PORT=3000
```

### Optional:
```env
MONGODB_DB_NAME=medical_imaging
```

## 🔧 Configuration Files

### package.json (Production Scripts)
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "echo 'No build step required'",
    "migrate": "node migrate-to-mongodb.js"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### railway.json (Railway Configuration)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🗄️ Database Collections

The application creates these MongoDB collections:
- `patients` - Patient information
- `reports` - Medical reports
- `images` - Medical images (base64 encoded)
- `clinicsettings` - Clinic configuration

## 🔒 Security Considerations

### MongoDB Atlas Security:
- Use strong passwords for database users
- Enable IP whitelisting when possible
- Use connection string encryption
- Enable MongoDB Atlas monitoring

### Application Security:
- Environment variables for sensitive data
- Input validation and sanitization
- File upload size limits (10MB)
- CORS configuration

## 📊 Performance Optimization

### Database Indexing:
```javascript
// Recommended indexes for better performance
db.patients.createIndex({ "uhid": 1 }, { unique: true })
db.reports.createIndex({ "patientId": 1 })
db.reports.createIndex({ "createdAt": -1 })
db.images.createIndex({ "reportId": 1 })
```

### Connection Pooling:
MongoDB driver automatically handles connection pooling.

## 🔍 Monitoring

### MongoDB Atlas Monitoring:
- Built-in performance monitoring
- Real-time metrics
- Alert configuration
- Query profiler

### Application Monitoring:
```javascript
// Add to server.js for basic monitoring
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

## 🚨 Troubleshooting

### Common Issues:

#### Connection Timeout:
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Ensure network connectivity

#### Authentication Failed:
- Verify username/password in connection string
- Check database user permissions
- Ensure database name is correct

#### Memory Issues:
- Monitor image storage (base64 can be large)
- Consider implementing image compression
- Use MongoDB GridFS for large files if needed

### Debug Commands:
```bash
# Test MongoDB connection
node -e "const {connectDB} = require('./database'); connectDB();"

# Check database status
node -e "const {mongoose} = require('./database'); mongoose.connection.on('connected', () => console.log('Connected')); require('./database').connectDB();"
```

## 📈 Scaling Considerations

### Horizontal Scaling:
- MongoDB Atlas supports automatic scaling
- Use MongoDB sharding for large datasets
- Consider read replicas for read-heavy workloads

### Vertical Scaling:
- Upgrade MongoDB Atlas cluster tier
- Increase server resources on Railway/Render

## 💾 Backup Strategy

### MongoDB Atlas:
- Automatic continuous backups
- Point-in-time recovery
- Cross-region backup replication

### Manual Backup:
```bash
# Export data
mongodump --uri="mongodb+srv://..." --db=medical_imaging

# Import data
mongorestore --uri="mongodb+srv://..." dump/
```

## 🎯 Best Practices

1. **Use MongoDB Atlas for production**
2. **Enable authentication and encryption**
3. **Monitor database performance**
4. **Implement proper error handling**
5. **Use environment variables for configuration**
6. **Regular backups and testing**
7. **Keep MongoDB driver updated**
8. **Use connection pooling efficiently**