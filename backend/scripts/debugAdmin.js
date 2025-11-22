/**
 * Debug script to check admin setup
 * Run with: node backend/scripts/debugAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const debugAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Find all admin users
        const adminUsers = await User.find({ role: 'admin' });

        console.log('=== ADMIN USERS IN DATABASE ===');
        if (adminUsers.length === 0) {
            console.log('❌ NO ADMIN USERS FOUND!');
            console.log('\nTo create an admin user, run:');
            console.log('  node backend/scripts/createAdmin.js');
        } else {
            console.log(`✓ Found ${adminUsers.length} admin user(s):\n`);
            adminUsers.forEach((user, index) => {
                console.log(`Admin ${index + 1}:`);
                console.log(`  ID: ${user._id}`);
                console.log(`  Name: ${user.name}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Role: ${user.role}`);
                console.log(`  Trust Score: ${user.trustScore}`);
                console.log(`  Warnings: ${user.warningsCount}`);
                console.log(`  Banned: ${user.isBanned}`);
                console.log('');
            });
        }

        // Find all users
        const allUsers = await User.find({});
        console.log('=== ALL USERS ===');
        console.log(`Total users: ${allUsers.length}\n`);

        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
        });

        console.log('\n=== NEXT STEPS ===');
        if (adminUsers.length === 0) {
            console.log('1. Create an admin user:');
            console.log('   node backend/scripts/createAdmin.js');
            console.log('');
            console.log('2. OR make an existing user admin:');
            console.log('   node backend/scripts/makeUserAdmin.js your-email@example.com');
        } else {
            console.log('✓ Admin user exists!');
            console.log('');
            console.log('To login as admin:');
            console.log(`  Email: ${adminUsers[0].email}`);
            console.log('  Password: (use the password you set)');
            console.log('');
            console.log('After login, check browser console:');
            console.log('  1. Press F12');
            console.log('  2. Go to Console tab');
            console.log('  3. Type: JSON.parse(localStorage.getItem("user"))');
            console.log('  4. Verify "role": "admin" is present');
        }

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
};

// Run the script
debugAdmin();
