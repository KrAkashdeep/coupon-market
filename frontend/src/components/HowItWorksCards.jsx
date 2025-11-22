import React from 'react';
import DisplayCards from './ui/DisplayCards';
import { UserPlus, Search, ShieldCheck } from 'lucide-react';

const HowItWorksCards = () => {
    const cards = [
        {
            icon: <UserPlus className="w-4 h-4 text-blue-300" />,
            title: 'Sign Up / Log In',
            description: 'Create your free account in seconds',
            date: 'Step 1',
            iconClassName: 'text-blue-500',
            titleClassName: 'text-blue-600',
            className:
                "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-slate-200 before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-white/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
        },
        {
            icon: <Search className="w-4 h-4 text-emerald-300" />,
            title: 'List or Find Coupons',
            description: 'Upload or browse active listings',
            date: 'Step 2',
            iconClassName: 'text-emerald-500',
            titleClassName: 'text-emerald-600',
            className:
                "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-slate-200 before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-white/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
        },
        {
            icon: <ShieldCheck className="w-4 h-4 text-violet-300" />,
            title: 'Trade Securely',
            description: 'Buy or sell with instant verification',
            date: 'Step 3',
            iconClassName: 'text-violet-500',
            titleClassName: 'text-violet-600',
            className: '[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10',
        },
    ];

    return (
        <section className="py-16 sm:py-20 lg:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Get started in three simple steps
                    </p>
                </div>

                <div className="flex justify-center items-center min-h-[400px]">
                    <DisplayCards cards={cards} />
                </div>

                <div className="mt-16 text-center">
                    {/* <div className="inline-block bg-gradient-to-r from-blue-500 to-violet-500 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg">
                        🎉 Join 10,000+ Happy Users
                    </div> */}
                </div>
            </div>
        </section>
    );
};

export default HowItWorksCards;
