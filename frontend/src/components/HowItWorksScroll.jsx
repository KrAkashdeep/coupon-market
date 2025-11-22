import React from 'react';
import { ContainerScroll } from './ui/ContainerScrollAnimation';

const HowItWorksScroll = () => {
  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <ContainerScroll
        titleComponent={
          <>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Get started in three simple steps
            </p>
          </>
        }
      >
        <div className="h-full w-full bg-gradient-to-br from-slate-900 via-blue-900 to-violet-900 p-8 md:p-12 overflow-y-auto">
          {/* Step 1 */}
          <div className="mb-12 flex flex-col md:flex-row items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-6xl font-bold text-white/20 mb-2">01</div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Sign Up / Log In
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Create your free account in seconds. No credit card required to get started. Join thousands of users already trading coupons.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-12 flex flex-col md:flex-row items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-6xl font-bold text-white/20 mb-2">02</div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                List or Find Coupons
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Upload your unused coupons with details and pricing, or browse hundreds of active listings from verified sellers across categories.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-6xl font-bold text-white/20 mb-2">03</div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Trade Securely
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Buy or sell with instant verification and secure transactions. Get instant updates and access to coupon codes after purchase.
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-gradient-to-r from-blue-500 to-violet-500 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg">
              🎉 Join 10,000+ Happy Users
            </div>
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
};

export default HowItWorksScroll;
