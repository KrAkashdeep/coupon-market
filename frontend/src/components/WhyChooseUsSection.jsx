import React from 'react';
import { FeatureSteps } from './ui/FeatureSteps';

const WhyChooseUsSection = () => {
    const features = [
        {
            step: 'Feature 1',
            title: '💰 Save or Earn Instantly',
            content: 'Buy at discount or sell what you don\'t use. Turn unused coupons into cash and maximize your savings effortlessly.',
            icon: '💰',
            image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop',
        },
        {
            step: 'Feature 2',
            title: '🕒 Fast & Secure',
            content: 'Smooth transactions with instant updates. Get your coupons immediately with our secure payment system and real-time notifications.',
            icon: '🕒',
            image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
        },
        {
            step: 'Feature 3',
            title: '🔒 Trust Built-In',
            content: 'Transparent trading with verified users. Your security is our priority with end-to-end encryption and buyer protection.',
            icon: '🔒',
            image: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?q=80&w=2070&auto=format&fit=crop',
        },
        {
            step: 'Feature 4',
            title: '🌍 One Community',
            content: 'Same place for buyers and sellers. No barriers, just great deals. Join thousands of users trading coupons daily.',
            icon: '🌍',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
        },
    ];

    return (
        <section className="py-16 sm:py-20 lg:py-24 bg-white">
            <FeatureSteps
                features={features}
                title="Why Choose CouponXchange?"
                autoPlayInterval={4000}
            />
        </section>
    );
};

export default WhyChooseUsSection;
