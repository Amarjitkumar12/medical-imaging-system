// Test PDF Generation without Database
const puppeteer = require('puppeteer');
const fs = require('fs');

async function testPDFGeneration() {
    console.log('🔄 Testing PDF Generation...');
    
    let browser;
    try {
        // Create browser instance
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions'
            ]
        });
        
        console.log('✅ Puppeteer browser launched successfully');
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600 });
        
        // Simple test HTML
        const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; color: #2c5aa0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 Medical Imaging System</h1>
                <h2>PDF Generation Test</h2>
                <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <div>
                <h3>✅ PDF Generation Working!</h3>
                <p>This is a test PDF to verify Puppeteer is working correctly.</p>
                <p>If you can see this PDF, the PDF generation system is functional.</p>
            </div>
        </body>
        </html>
        `;
        
        await page.setContent(testHTML, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });
        
        // Save test PDF
        fs.writeFileSync('test-pdf-output.pdf', pdf);
        
        console.log('✅ PDF generated successfully!');
        console.log('📄 Test PDF saved as: test-pdf-output.pdf');
        console.log('🎉 PDF generation system is working correctly');
        
    } catch (error) {
        console.error('❌ PDF generation failed:', error.message);
        console.log('💡 Possible issues:');
        console.log('   1. Puppeteer not installed properly');
        console.log('   2. Missing system dependencies');
        console.log('   3. Memory/resource constraints');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testPDFGeneration();