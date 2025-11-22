import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CouponCard from '../components/CouponCard';
import Loader from '../components/Loader';
import CouponUploadForm from '../components/CouponUploadForm';
import axiosInstance from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('my-coupons');
  const [myCoupons, setMyCoupons] = useState([]);
  const [marketplaceCoupons, setMarketplaceCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's coupons
  const fetchMyCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/coupons/my');
      setMyCoupons(response.data.coupons || []);
    } catch (err) {
      let errorMessage = 'Failed to fetch your coupons';

      if (err.response) {
        errorMessage = err.response.data?.error || 'Unable to load your coupons';
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      console.error('Error fetching my coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch marketplace coupons (exclude user's own, only unsold)
  const fetchMarketplaceCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/coupons', {
        params: {
          excludeSold: true,
          excludeUserId: user?._id
        }
      });
      setMarketplaceCoupons(response.data.coupons || []);
    } catch (err) {
      let errorMessage = 'Failed to fetch marketplace coupons';

      if (err.response) {
        errorMessage = err.response.data?.error || 'Unable to load marketplace';
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      console.error('Error fetching marketplace coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load coupons when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'my-coupons') {
      fetchMyCoupons();
    } else if (activeTab === 'marketplace') {
      fetchMarketplaceCoupons();
    }
  }, [activeTab]);

  // Handle coupon deletion
  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await axiosInstance.delete(`/api/coupons/${couponId}`);
      setSuccessMessage('Coupon deleted successfully!');

      // Update the coupon list by removing the deleted coupon
      setMyCoupons(prevCoupons => prevCoupons.filter(coupon => coupon._id !== couponId));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete coupon');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle coupon purchase - redirect to coupon details page for payment
  const handleBuy = (couponId) => {
    // Redirect to coupon details page where Stripe payment is integrated
    navigate(`/coupons/${couponId}`);
  };

  // Handle successful coupon creation
  const handleCouponCreated = (newCoupon) => {
    // Show success message
    setSuccessMessage('Coupon added successfully!');

    // Refresh the My Coupons list
    fetchMyCoupons();

    // Switch to My Coupons tab to show the newly added coupon
    setActiveTab('my-coupons');

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome, {user?.name}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Manage your coupons and explore the marketplace
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-col sm:flex-row -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('my-coupons')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'my-coupons'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                My Coupons
              </button>
              <button
                onClick={() => setActiveTab('add-coupon')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'add-coupon'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Add Coupon
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'marketplace'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Marketplace
              </button>
            </nav>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => {
                  if (activeTab === 'my-coupons') {
                    fetchMyCoupons();
                  } else if (activeTab === 'marketplace') {
                    fetchMarketplaceCoupons();
                  }
                }}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          {/* My Coupons Tab */}
          {activeTab === 'my-coupons' && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                My Listed Coupons
              </h2>

              {loading ? (
                <Loader />
              ) : myCoupons.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No coupons yet
                  </h3>
                  <p className="mt-1 text-gray-500">
                    Get started by adding your first coupon.
                  </p>
                  <button
                    onClick={() => setActiveTab('add-coupon')}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Your First Coupon
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCoupons.map((coupon) => (
                    <CouponCard
                      key={coupon._id}
                      coupon={coupon}
                      onDelete={handleDelete}
                      loading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Coupon Tab */}
          {activeTab === 'add-coupon' && (
            <div>
              <CouponUploadForm onSuccess={handleCouponCreated} />
            </div>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                Marketplace
              </h2>

              {loading ? (
                <Loader />
              ) : marketplaceCoupons.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No coupons available
                  </h3>
                  <p className="mt-1 text-gray-500">
                    Check back later for new coupons from other users.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplaceCoupons.map((coupon) => (
                    <CouponCard
                      key={coupon._id}
                      coupon={coupon}
                      onBuy={handleBuy}
                      loading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
