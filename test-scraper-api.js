// Test script to verify scraper API endpoints
const http = require('http');

// Test function to make HTTP requests
function testEndpoint(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'session=test-session' // You'll need a valid session
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run tests
async function runTests() {
    console.log('Testing Scraper API Endpoints...\n');
    
    try {
        // Test 1: Get scraper status
        console.log('1. Testing GET /scraper/status');
        const statusResult = await testEndpoint('GET', '/scraper/status');
        console.log('   Status:', statusResult.status);
        console.log('   Response:', JSON.stringify(statusResult.data, null, 2));
        console.log('');

        // Test 2: Get supported platforms
        console.log('2. Testing GET /scraper/platforms');
        const platformsResult = await testEndpoint('GET', '/scraper/platforms');
        console.log('   Status:', platformsResult.status);
        console.log('   Response:', JSON.stringify(platformsResult.data, null, 2));
        console.log('');

        // Note: These tests will fail without proper authentication
        // In a real scenario, you'd need to login first to get a valid session
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

// Run the tests
if (require.main === module) {
    runTests();
}

module.exports = { testEndpoint, runTests };