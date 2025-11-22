/**
 * Test login endpoint to verify role is returned
 * Run with: node backend/scripts/testLogin.js
 */

const axios = require('axios');

const testLogin = async () => {
    try {
        console.log('Testing login endpoint...\n');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });

        console.log('✓ Login successful!\n');
        console.log('=== RESPONSE DATA ===');
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n=== CHECKING FIELDS ===');

        // Check user object
        if (response.data.user) {
            console.log('✓ User object exists');

            // Check role field
            if (response.data.user.role) {
                console.log(`✓ Role field exists: "${response.data.user.role}"`);

                if (response.data.user.role === 'admin') {
                    console.log('✓ Role is "admin"');
                    console.log('\n🎉 SUCCESS! Backend is returning the role field correctly!');
                    console.log('\n=== NEXT STEPS ===');
                    console.log('1. Clear browser localStorage:');
                    console.log('   - Press F12');
                    console.log('   - Go to Application tab');
                    console.log('   - Click Local Storage → Your site');
                    console.log('   - Right-click → Clear');
                    console.log('');
                    console.log('2. Logout and login again in your app');
                    console.log('');
                    console.log('3. The "Admin" link should now appear in navbar!');
                } else {
                    console.log(`✗ Role is "${response.data.user.role}" (expected "admin")`);
                    console.log('\n❌ User is not an admin!');
                    console.log('\nRun: node backend/scripts/makeUserAdmin.js admin@example.com');
                }
            } else {
                console.log('✗ Role field is MISSING!');
                console.log('\n❌ PROBLEM: Backend is not sending the role field!');
                console.log('\n=== SOLUTION ===');
                console.log('1. Make sure you saved the file: backend/controllers/authController.js');
                console.log('2. RESTART the backend server:');
                console.log('   - Stop it (Ctrl+C)');
                console.log('   - Start it: npm run dev');
                console.log('3. Run this test again: node backend/scripts/testLogin.js');
            }
        } else {
            console.log('✗ User object is missing!');
        }

        // Check token
        if (response.data.token) {
            console.log('✓ Token exists');
        } else {
            console.log('✗ Token is missing!');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n=== PROBLEM ===');
            console.log('Backend server is not running!');
            console.log('\n=== SOLUTION ===');
            console.log('1. Start the backend server:');
            console.log('   cd backend');
            console.log('   npm run dev');
            console.log('');
            console.log('2. Run this test again');
        } else if (error.response) {
            console.log('\n=== RESPONSE ===');
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 401) {
                console.log('\n=== PROBLEM ===');
                console.log('Invalid credentials or admin user doesn\'t exist!');
                console.log('\n=== SOLUTION ===');
                console.log('1. Create admin user:');
                console.log('   node backend/scripts/createAdmin.js');
                console.log('');
                console.log('2. Run this test again');
            }
        }
    }
};

testLogin();
