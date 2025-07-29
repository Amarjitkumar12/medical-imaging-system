const express = require('express');
const { User, Patient, Report, Image, ClinicSettings, initializeDatabase } = require('./database');

const app = express();

// Initialize database and start admin server
async function startAdmin() {
    await initializeDatabase();
    
    app.get('/', async (req, res) => {
        try {
            // Get counts
            const userCount = await User.countDocuments();
            const patientCount = await Patient.countDocuments();
            const reportCount = await Report.countDocuments();
            const imageCount = await Image.countDocuments();
            const clinicCount = await ClinicSettings.countDocuments();

            // Get recent data
            const recentPatients = await Patient.find().sort({ createdAt: -1 }).limit(10);
            const recentReports = await Report.find().sort({ createdAt: -1 }).limit(10);
            const clinicSettings = await ClinicSettings.findOne();
            const users = await User.find().select('email createdAt');

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Database Admin - Medical Imaging System</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                    .header { text-align: center; color: #2c5aa0; margin-bottom: 30px; }
                    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                    .stat-card { background: #e8f4f8; padding: 20px; border-radius: 8px; text-align: center; }
                    .stat-number { font-size: 2em; font-weight: bold; color: #2c5aa0; }
                    .section { margin-bottom: 30px; }
                    .section h3 { color: #333; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #f8f9fa; font-weight: bold; }
                    .no-data { color: #666; font-style: italic; }
                    .refresh-btn { background: #2c5aa0; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                    .refresh-btn:hover { background: #1e3f73; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📊 Database Administration</h1>
                        <p>Medical Imaging Report System</p>
                        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
                    </div>

                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-number">${userCount}</div>
                            <div>👥 Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${patientCount}</div>
                            <div>🏥 Patients</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${reportCount}</div>
                            <div>📋 Reports</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${imageCount}</div>
                            <div>🖼️ Images</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${clinicCount}</div>
                            <div>⚙️ Settings</div>
                        </div>
                    </div>

                    <div class="section">
                        <h3>⚙️ Clinic Settings</h3>
                        ${clinicSettings ? `
                            <table>
                                <tr><th>Setting</th><th>Value</th></tr>
                                <tr><td>Clinic Name</td><td>${clinicSettings.name || 'Not set'}</td></tr>
                                <tr><td>Address</td><td>${clinicSettings.address || 'Not set'}</td></tr>
                                <tr><td>Logo</td><td>${clinicSettings.logo ? '✅ Uploaded' : '❌ Not set'}</td></tr>
                                <tr><td>Created</td><td>${clinicSettings.createdAt?.toLocaleString() || 'Unknown'}</td></tr>
                            </table>
                        ` : '<p class="no-data">No clinic settings found</p>'}
                    </div>

                    <div class="section">
                        <h3>👤 Users</h3>
                        ${users.length > 0 ? `
                            <table>
                                <tr><th>Email</th><th>Created</th></tr>
                                ${users.map(user => `
                                    <tr>
                                        <td>${user.email}</td>
                                        <td>${user.createdAt?.toLocaleString() || 'Unknown'}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        ` : '<p class="no-data">No users found</p>'}
                    </div>

                    <div class="section">
                        <h3>🏥 Recent Patients</h3>
                        ${recentPatients.length > 0 ? `
                            <table>
                                <tr><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Created</th></tr>
                                ${recentPatients.map(patient => `
                                    <tr>
                                        <td>${patient.name}</td>
                                        <td>${patient.age}</td>
                                        <td>${patient.gender}</td>
                                        <td>${patient.phone || 'N/A'}</td>
                                        <td>${patient.createdAt?.toLocaleString() || 'Unknown'}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        ` : '<p class="no-data">No patients found</p>'}
                    </div>

                    <div class="section">
                        <h3>📋 Recent Reports</h3>
                        ${recentReports.length > 0 ? `
                            <table>
                                <tr><th>Patient</th><th>Type</th><th>Images</th><th>Created</th></tr>
                                ${recentReports.map(report => `
                                    <tr>
                                        <td>${report.patientName}</td>
                                        <td>${report.reportType?.toUpperCase()}</td>
                                        <td>${report.imageCount || 0}</td>
                                        <td>${report.createdAt?.toLocaleString() || 'Unknown'}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        ` : '<p class="no-data">No reports found</p>'}
                    </div>
                </div>
            </body>
            </html>`;

            res.send(html);
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    });

    const port = 3002;
    app.listen(port, () => {
        console.log(`🌐 Database Admin running on http://localhost:${port}`);
        console.log('📊 View your database in the browser!');
        
        // Auto-open browser
        const { exec } = require('child_process');
        if (process.platform === 'win32') {
            exec(`start http://localhost:${port}`);
        }
    });
}

startAdmin().catch(console.error);