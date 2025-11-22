/**
 * Script to create an admin user
 * Run with: node backend/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Admin user details
        const adminData = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123', // Change this to a secure password
            role: 'admin'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('⚠ Admin user already exists with email:', adminData.email);

            // Update to admin role if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('✓ Updated existing user to admin role');
            }

            console.log('\nAdmin Credentials:');
            console.log('Email:', adminData.email);
            console.log('Password: (use your existing password)');
        } else {
            // Create new admin user
            const adminUser = new User(adminData);
            await adminUser.save();

            console.log('✓ Admin user created successfully!');
            console.log('\nAdmin Credentials:');
            console.log('Email:', adminData.email);
            console.log('Password:', adminData.password);
            console.log('\n⚠ IMPORTANT: Change the password after first login!');
        }

        console.log('\nAdmin Panel URLs:');
        console.log('- Dashboard: http://localhost:5173/admin/dashboard');
        console.log('- Coupon Verification: http://localhost:5173/admin/coupon-verification');
        console.log('- User Management: http://localhost:5173/admin/user-management');

    } catch (error) {
        console.error('✗ Error creating admin user:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
};

// Run the script
createAdminUser();
