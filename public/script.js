// Authentication utilities
function getAuthToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

function displayUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && user.clinicName) {
        userInfoElement.textContent = `🏥 ${user.clinicName}`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    if (!getAuthToken()) {
        window.location.href = '/login.html';
        return;
    }

    // Display user info
    displayUserInfo();

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    const imageFiles = document.getElementById('imageFiles');
    const imagePreview = document.getElementById('imagePreview');
    const generateReport = document.getElementById('generateReport');
    const previewReport = document.getElementById('previewReport');
    const saveToHistory = document.getElementById('saveToHistory');
    const clearForm = document.getElementById('clearForm');
    const loading = document.getElementById('loading');

    // Modal elements
    const settingsBtn = document.getElementById('settingsBtn');
    const reportsBtn = document.getElementById('reportsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const reportsModal = document.getElementById('reportsModal');
    const closeSettings = document.getElementById('closeSettings');
    const closeReports = document.getElementById('closeReports');

    // Check if all elements are found
    console.log('Script loaded, checking elements...');
    console.log('Settings button:', settingsBtn);
    console.log('Reports button:', reportsBtn);
    console.log('Settings modal:', settingsModal);
    console.log('Reports modal:', reportsModal);
    
    if (!settingsBtn) {
        console.error('Settings button not found');
    } else {
        console.log('Settings button found, adding event listener...');
    }
    
    if (!reportsBtn) {
        console.error('Reports button not found');
    } else {
        console.log('Reports button found, adding event listener...');
    }
    
    if (!settingsModal) console.error('Settings modal not found');
    if (!reportsModal) console.error('Reports modal not found');

    // Image size slider
    const imageSize = document.getElementById('imageSize');
    const imageSizeValue = document.getElementById('imageSizeValue');

    let uploadedImages = [];
    let savedSettings = null;

    // Helper function to sanitize filenames
    function sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50); // Limit length to 50 characters
    }

    // Handle image size slider
    imageSize.addEventListener('input', function () {
        imageSizeValue.textContent = this.value + '%';
    });

    // Set initial image size value
    imageSizeValue.textContent = imageSize.value + '%';

    // Function to compress image
    function compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = function () {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };

            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.readAsDataURL(file);
        });
    }

    // Handle image file selection
    imageFiles.addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        imagePreview.innerHTML = '';
        uploadedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const compressedDataUrl = await compressImage(file);

                uploadedImages.push({
                    name: file.name,
                    data: compressedDataUrl.split(',')[1] // Remove data:image/jpeg;base64, prefix
                });

                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.innerHTML = `
                    <img src="${compressedDataUrl}" alt="${file.name}">
                    <div class="image-name">${file.name}</div>
                `;
                imagePreview.appendChild(previewItem);
            } catch (error) {
                console.error('Error processing image:', file.name, error);
                alert(`Error processing image: ${file.name}`);
            }
        }
    });

    // Load settings function
    async function loadSettings() {
        try {
            const response = await fetch('/settings', {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                savedSettings = await response.json();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Settings modal functions
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            try {
                console.log('Settings button clicked');
                alert('Settings button clicked!'); // Test alert
                document.getElementById('settingsClinicName').value = savedSettings?.name || '';
                document.getElementById('settingsClinicAddress').value = savedSettings?.address || '';
                if (savedSettings?.logo) {
                    document.getElementById('settingsLogoPreview').innerHTML = `
                        <div class="image-preview-item">
                            <img src="${savedSettings.logo}" alt="Clinic Logo">
                            <div class="image-name">Current Logo</div>
                        </div>
                    `;
                }
                settingsModal.classList.remove('hidden');
                console.log('Settings modal opened');
            } catch (error) {
                console.error('Error opening settings modal:', error);
                alert('Error opening settings. Please check the console for details.');
            }
        });
    }

    closeSettings.addEventListener('click', function () {
        settingsModal.classList.add('hidden');
    });

    document.getElementById('cancelSettings').addEventListener('click', function () {
        settingsModal.classList.add('hidden');
    });

    document.getElementById('settingsClinicLogo').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('settingsLogoPreview').innerHTML = `
                    <div class="image-preview-item">
                        <img src="${e.target.result}" alt="Clinic Logo">
                        <div class="image-name">New Logo</div>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('saveSettings').addEventListener('click', async function () {
        const name = document.getElementById('settingsClinicName').value.trim();
        const address = document.getElementById('settingsClinicAddress').value.trim();
        const logoFile = document.getElementById('settingsClinicLogo').files[0];

        let logoData = savedSettings?.logo || '';
        if (logoFile) {
            logoData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(logoFile);
            });
        }

        const settings = { name, address, logo: logoData };

        try {
            const response = await fetch('/settings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                savedSettings = settings;
                settingsModal.classList.add('hidden');
                alert('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings. Please try again.');
        }
    });

    // Reports modal functions
    if (reportsBtn) {
        reportsBtn.addEventListener('click', async function () {
            try {
                console.log('Reports button clicked');
                alert('Reports button clicked!'); // Test alert
                const response = await fetch('/reports', {
                    headers: getAuthHeaders()
                });
                if (response.ok) {
                    const reports = await response.json();
                    console.log('Reports loaded:', reports);
                    displayReports(reports);
                    reportsModal.classList.remove('hidden');
                    console.log('Reports modal opened');
                } else {
                    throw new Error('Failed to fetch reports');
                }
            } catch (error) {
                console.error('Error loading reports:', error);
                alert('Error loading reports. Please try again.');
            }
        });
    }

    closeReports.addEventListener('click', function () {
        reportsModal.classList.add('hidden');
    });

    function displayReports(reports) {
        const reportsList = document.getElementById('reportsList');

        if (reports.length === 0) {
            reportsList.innerHTML = '<div class="no-reports">No reports generated yet.</div>';
            return;
        }

        let html = `
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Patient Name</th>
                        <th>UHID</th>
                        <th>Age</th>
                        <th>Sex</th>
                        <th>Referred By</th>
                        <th>Report Type</th>
                        <th>Date</th>
                        <th>Images</th>
                        <th>Status</th>
                        <th>File Name</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        reports.forEach((report, index) => {
            const date = new Date(report.date).toLocaleDateString();
            const status = report.status === 'saved' ? 
                '<span class="status-saved">💾 Saved</span>' : 
                '<span class="status-generated">✅ Generated</span>';
            
            const actionButtons = report.status === 'saved' ? 
                `<button class="action-btn generate-btn" onclick="generateFromSaved(${report.id})">📄 Generate PDF</button>` :
                `<button class="action-btn view-btn" onclick="viewReport('${report.filename}')">👁️ View PDF</button>`;
            
            const deleteButton = `<button class="action-btn delete-btn" onclick="deleteReport(${report.id}, '${report.filename}')">🗑️ Delete</button>`;
            
            html += `
                <tr>
                    <td><strong>${report.patientName}</strong></td>
                    <td><code>${report.uhid}</code></td>
                    <td>${report.age}</td>
                    <td>${report.sex}</td>
                    <td>${report.referredBy || '-'}</td>
                    <td><span class="report-type">${report.reportType.toUpperCase()}</span></td>
                    <td>${date}</td>
                    <td><span class="image-count">${report.imagesCount}</span></td>
                    <td>${status}</td>
                    <td><small>${report.filename || 'Not generated'}</small></td>
                    <td class="action-cell">
                        ${actionButtons}
                        ${deleteButton}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        reportsList.innerHTML = html;
    }

    // Make viewReport function global
    window.viewReport = function (filename) {
        window.open(`/reports/${filename}`, '_blank');
    };

    // Delete report function
    window.deleteReport = async function(reportId, filename) {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }
        
        try {
            loading.classList.remove('hidden');
            
            const response = await fetch(`/delete-report/${reportId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                alert('Report deleted successfully!');
                // Refresh the reports list
                reportsBtn.click();
            } else {
                throw new Error('Failed to delete report');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Error deleting report. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    };

    // Generate PDF from saved report
    window.generateFromSaved = async function (reportId) {
        try {
            loading.classList.remove('hidden');

            const response = await fetch(`/generate-from-saved/${reportId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Extract patient name from response headers or use reportId
                a.download = `report_${reportId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('PDF generated successfully!');
                // Refresh the reports list
                reportsBtn.click();
            } else {
                throw new Error('Failed to generate PDF from saved report');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    };

    // Save to History function
    saveToHistory.addEventListener('click', async function () {
        if (!validateForm()) return;

        loading.classList.remove('hidden');

        try {
            const reportData = getReportData();

            // Save report metadata to history without generating PDF
            const response = await fetch('/save-report', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                alert('Report saved to history successfully! You can generate PDF later from View Reports.');
                // Optionally clear the form after saving
                if (confirm('Clear the form now?')) {
                    clearForm.click();
                }
            } else {
                throw new Error('Failed to save report');
            }
        } catch (error) {
            console.error('Error saving report:', error);
            alert('Error saving report. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    });

    // Print Preview function
    previewReport.addEventListener('click', async function () {
        if (!validateForm()) return;

        loading.classList.remove('hidden');

        try {
            const reportData = getReportData();
            reportData.previewOnly = true;

            const response = await fetch('/generate-pdf', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('Failed to generate preview');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Error generating preview. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    });

    // Generate PDF Report
    generateReport.addEventListener('click', async function () {
        if (!validateForm()) return;

        loading.classList.remove('hidden');

        try {
            const reportData = getReportData();
            reportData.previewOnly = false;

            const response = await fetch('/generate-pdf', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Create filename with patient name
                const sanitizedName = sanitizeFilename(reportData.patientData.name);
                a.download = `${sanitizedName}_${reportData.patientData.uhid}_${reportData.reportType}_report.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('Report generated and saved successfully!');
            } else {
                throw new Error('Failed to generate PDF');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            loading.classList.add('hidden');
        }
    });

    function validateForm() {
        const patientName = document.getElementById('patientName').value.trim();
        const uhid = document.getElementById('uhid').value.trim();
        const age = document.getElementById('age').value.trim();
        const sex = document.getElementById('sex').value;

        if (!patientName || !uhid || !age || !sex) {
            alert('Please fill in all required patient information fields.');
            return false;
        }

        if (uploadedImages.length === 0) {
            alert('Please upload at least one medical image.');
            return false;
        }

        return true;
    }

    function getReportData() {
        const patientData = {
            name: document.getElementById('patientName').value.trim(),
            uhid: document.getElementById('uhid').value.trim(),
            age: document.getElementById('age').value.trim(),
            sex: document.getElementById('sex').value,
            referredBy: document.getElementById('referredBy').value.trim()
        };

        // Use saved settings or default clinic data
        const clinicData = {
            name: savedSettings?.name || 'BREATHE CLINIC',
            address: savedSettings?.address || 'Medical Center\nCity, State - 123456\nPhone: +91-XXXXXXXXXX',
            logo: savedSettings?.logo || null
        };

        const imagesPerPage = parseInt(document.getElementById('imagesPerPage').value);
        const reportType = document.getElementById('reportType').value;
        const imageScale = parseInt(document.getElementById('imageSize').value);

        console.log('Client sending image size:', imageScale); // Debug log

        return {
            patientData,
            images: uploadedImages,
            imagesPerPage,
            clinicData,
            reportType,
            imageSize: imageScale
        };
    }

    // Clear form
    clearForm.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all form data?')) {
            document.querySelectorAll('input, select, textarea').forEach(element => {
                if (element.type === 'file') {
                    element.value = '';
                } else if (element.tagName === 'SELECT') {
                    element.selectedIndex = element.id === 'imagesPerPage' ? 1 : 0;
                } else if (element.type === 'range') {
                    element.value = 120;
                    imageSizeValue.textContent = '120%';
                } else {
                    element.value = '';
                }
            });

            imagePreview.innerHTML = '';
            uploadedImages = [];
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
        if (e.target === reportsModal) {
            reportsModal.classList.add('hidden');
        }
    });

    // Load saved settings on page load
    loadSettings();
});