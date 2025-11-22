/**
 * Script to make an existing user an admin
 * Run with: node backend/scripts/makeUserAdmin.js your-email@example.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeUserAdmin = async (email) => {
    try {
        if (!email) {
            console.error('✗ Please provide an email address');
            console.log('Usage: node backend/scripts/makeUserAdmin.js your-email@example.com');
            process.exit(1);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error('✗ User not found with email:', email);
            process.exit(1);
        }

        // Check if already admin
        if (user.role === 'admin') {
            console.log('⚠ User is already an admin');
        } else {
            // Update to admin role
            user.role = 'admin';
            await user.save();
            console.log('✓ User updated to admin role successfully!');
        }

        console.log('\nUser Details:');
        console.log('Name:', user.name);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Trust Score:', user.trustScore);

        console.log('\nAdmin Panel URLs:');
        console.log('- Dashboard: http://localhost:5173/admin/dashboard');
        console.log('- Coupon Verification: http://localhost:5173/admin/coupon-verification');
        console.log('- User Management: http://localhost:5173/admin/user-management');

    } catch (error) {
        console.error('✗ Error updating user:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
};

// Get email from command line arguments
const email = process.argv[2];
makeUserAdmin(email);
