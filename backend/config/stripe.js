const Stripe = require('stripe');

// Initialize Stripe instance with API key from environment
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripeInstance;
