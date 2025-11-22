import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import CouponCard from '../components/CouponCard';
import Loader from '../components/Loader';


const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Fetch all available coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true);
        setError('');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await axios.get(`${apiUrl}/api/coupons`);
        setCoupons(response.data.coupons);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        let errorMessage = 'Failed to load coupons';

        if (err.response) {
          errorMessage = err.response.data?.error || 'Unable to fetch coupons';
        } else if (err.request) {
          errorMessage = 'Network error. Please check your connection.';
        }

        setError(errorMessage);
        console.error('Error fetching coupons:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, [retryCount]);

  // Handle view details - navigate to coupon details page
  const handleViewDetails = (couponId) => {
    navigate(`/coupons/${couponId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Browse Available Coupons
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Discover great deals from our marketplace
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setRetryCount(prev => prev + 1)}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Coupons Grid */}
        {!loading && !error && coupons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon._id}
                coupon={coupon}
                onBuy={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && coupons.length === 0 && (
          <div className="text-center py-12 sm:py-20">
            <div className="bg-white rounded-lg shadow-md p-6 sm:p-12 max-w-md mx-auto">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Coupons Available
              </h3>
              <p className="text-gray-600 mb-6">
                There are no coupons listed at the moment. Check back later!
              </p>
              {isAuthenticated && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  List Your Coupon
                </button>
              )}
            </div>
          </div>
        )}

        {/* Login Prompt for Unauthenticated Users */}
        {!loading && !isAuthenticated && coupons.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-center">
            <p className="text-blue-800 text-base sm:text-lg mb-4">
              Want to purchase a coupon?{' '}
              <span className="font-semibold">Login to buy!</span>
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto"
            >
              Login Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Coupons;
