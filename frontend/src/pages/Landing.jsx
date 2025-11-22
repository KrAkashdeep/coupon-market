import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TestimonialsSection from '../components/TestimonialsSection';
import HowItWorksCards from '../components/HowItWorksCards';
import WhyChooseUsSection from '../components/WhyChooseUsSection';
import { AuroraBackground } from '../components/ui/AuroraBackground';
import axios from 'axios';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [featuredCoupons, setFeaturedCoupons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch featured coupons
  useEffect(() => {
    const fetchFeaturedCoupons = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await axios.get(`${apiUrl}/api/coupons`);
        setFeaturedCoupons(response.data.coupons.slice(0, 6));
      } catch (error) {
        console.error('Error fetching coupons:', error);
      }
    };
    fetchFeaturedCoupons();
  }, []);

  const handleStartTrading = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCoupons = featuredCoupons.filter(coupon =>
    coupon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.storeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero Section with Aurora Background */}
      <AuroraBackground>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: 'easeInOut',
          }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28"
        >
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Turn Unused Coupons Into Cash —
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-600">
                Or Find the Best Deals Instantly
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-700 mb-10 max-w-3xl mx-auto leading-relaxed">
              Buy and sell unused digital coupons securely in one place. Save more, waste less.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={handleStartTrading}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto"
              >
                Start Trading Now
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => scrollToSection('featured-coupons')}
                className="px-8 py-4 bg-white/90 backdrop-blur-sm text-slate-700 rounded-xl font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-slate-200 w-full sm:w-auto"
              >
                Explore Coupons
              </button>
            </div>

            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 animate-float border border-slate-200">
                <div className="text-2xl font-bold text-blue-600">50% OFF</div>
                <div className="text-sm text-slate-600">Fashion</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 animate-float animation-delay-1000 border border-slate-200">
                <div className="text-2xl font-bold text-emerald-600">₹500</div>
                <div className="text-sm text-slate-600">Food</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 animate-float animation-delay-2000 border border-slate-200">
                <div className="text-2xl font-bold text-violet-600">70% OFF</div>
                <div className="text-sm text-slate-600">Travel</div>
              </div>
            </div>
          </div>
        </motion.div>
      </AuroraBackground>

      {/* How It Works Section with Display Cards */}
      <HowItWorksCards />

      {/* Featured Coupons Section */}
      <section id="featured-coupons" className="py-16 sm:py-20 lg:py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Featured Coupons
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Discover amazing deals from our community
            </p>

            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for coupons, brands, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-lg shadow-sm"
                />
                <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {filteredCoupons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredCoupons.map((coupon) => (
                <div key={coupon._id} className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                          {coupon.title}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">{coupon.storeName}</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-lg font-bold text-lg shadow-md">
                        {coupon.discountPercent ? `${coupon.discountPercent}% OFF` : coupon.discountAmount ? `₹${coupon.discountAmount} OFF` : 'Discount'}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{coupon.description}</p>

                    <div className="flex justify-between items-center mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="text-2xl font-bold text-indigo-600 ml-2">₹{coupon.price}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block">Expires:</span>
                        <span className="text-gray-700 font-medium">{formatDate(coupon.expiryDate)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/coupons')}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {featuredCoupons.length === 0 ? 'No coupons available yet. Be the first to list one!' : 'No coupons found. Try a different search term.'}
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => navigate('/coupons')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              View All Coupons
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section with Feature Steps */}
      <WhyChooseUsSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Call-to-Action Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to Turn Your Coupons Into Cash?
          </h2>
          <p className="text-xl mb-10 text-indigo-100">
            Join thousands of users already trading on CouponXchange
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 w-full sm:w-auto"
            >
              Join Now
            </button>
            <button
              onClick={() => navigate('/coupons')}
              className="px-10 py-5 bg-transparent text-white rounded-xl font-bold text-lg hover:bg-white hover:text-indigo-600 transition-all duration-300 border-2 border-white shadow-2xl w-full sm:w-auto"
            >
              View Marketplace
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
