# 🏥 Medical Imaging System - Installation Guide

## 📋 **Requirements**
- **Windows PC** (Windows 7 or later)
- **Node.js** (Download from https://nodejs.org/)
- **2GB RAM** minimum
- **500MB free disk space**

## 🚀 **Quick Installation**

### **Option 1: Automatic Setup (Recommended)**
1. **Copy the entire project folder** to the new PC
2. **Double-click `Medical-Imaging-App.bat`**
3. **Wait for automatic installation** (first time only)
4. **App opens automatically** in your browser

### **Option 2: Manual Installation**
1. **Install Node.js** from https://nodejs.org/
2. **Copy all project files** to a folder on the new PC
3. **Open Command Prompt** in the project folder
4. **Run:** `npm install`
5. **Run:** `npm start`

## 🌐 **Network Access**

The app now supports network access! When you start the app, you'll see:

```
🚀 Server running on:
   📱 Local:    http://localhost:3000
   🌐 Network:  http://192.168.1.100:3000
```

### **Access from Other Devices:**
- **Same PC:** Use `http://localhost:3000`
- **Other devices on same network:** Use the Network URL
- **Tablets/Phones:** Use the Network URL in mobile browser

## 📁 **File Structure**
```
Medical-Imaging-System/
├── 🚀 Medical-Imaging-App.bat    (Main launcher)
├── 📄 server.js                  (Application server)
├── 📄 package.json               (Dependencies)
├── 📄 config.json                (Configuration)
├── 📁 public/                    (Web interface)
├── 📁 reports/                   (Generated PDFs - auto-created)
├── 📁 settings/                  (App settings - auto-created)
└── 📁 uploads/                   (Temp files - auto-created)
```

## 🔧 **Configuration**

Edit `config.json` to customize:
- **Default port:** Change `defaultPort`
- **Clinic info:** Update `defaultName` and `defaultAddress`
- **PDF settings:** Modify margins and image settings

## 🆘 **Troubleshooting**

### **Port Already in Use**
- App automatically finds available port (3000-3010)
- Or set custom port: `PORT=3001 npm start`

### **Node.js Not Found**
- Download and install from https://nodejs.org/
- Choose LTS (Long Term Support) version
- Restart Command Prompt after installation

### **Dependencies Failed**
- Check internet connection
- Run: `npm clean-install`
- Or delete `node_modules` folder and run `npm install`

### **Browser Doesn't Open**
- Manually open browser
- Go to `http://localhost:3000`
- Check console for the correct port number

## 📞 **Support**

If you encounter issues:
1. **Check the console** for error messages
2. **Verify Node.js installation:** `node --version`
3. **Check network connectivity** for dependencies
4. **Restart the application**

## 🔒 **Security Notes**

- **Local Network Only:** App is designed for local network use
- **No Internet Required:** Works completely offline after setup
- **Data Privacy:** All data stays on your local machine
- **Firewall:** Windows may ask for firewall permission (allow it)

---

**Medical Imaging Report System v1.0**  
Professional healthcare documentation solution