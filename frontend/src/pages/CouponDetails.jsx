import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TrustBadge from '../components/TrustBadge';
import Loader from '../components/Loader';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import useStripe from '../hooks/useStripe';

const CouponDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { openCheckout } = useStripe();

    const [coupon, setCoupon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState('');
    const [imageZoomed, setImageZoomed] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchasedCouponDetails, setPurchasedCouponDetails] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState(null);

    // Check for payment success from URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const sessionId = urlParams.get('session_id');

        if (paymentStatus === 'success' && sessionId) {
            // Payment successful, verify with backend
            handlePaymentSuccess({ sessionId });
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancelled') {
            setError('Payment was cancelled. You can try again when ready.');
            setPurchasing(false);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Fetch coupon details
    useEffect(() => {
        const fetchCouponDetails = async () => {
            try {
                setLoading(true);
                setError('');
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const token = localStorage.getItem('token');

                const config = token ? {
                    headers: { Authorization: `Bearer ${token}` }
                } : {};

                const response = await axios.get(`${apiUrl}/api/coupons/${id}`, config);

                if (response.data.success) {
                    setCoupon(response.data.coupon);
                } else {
                    setCoupon(response.data);
                }
            } catch (err) {
                let errorMessage = 'Failed to load coupon details';

                if (err.response) {
                    errorMessage = err.response.data?.error || err.response.data?.message || 'Unable to fetch coupon';
                } else if (err.request) {
                    errorMessage = 'Network error. Please check your connection.';
                }

                setError(errorMessage);
                console.error('Error fetching coupon details:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCouponDetails();
        }
    }, [id]);

    // Handle payment success callback
    const handlePaymentSuccess = async (stripeResponse) => {
        try {
            const { sessionId } = stripeResponse;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const token = localStorage.getItem('token');

            // Verify payment with backend
            const response = await axios.post(
                `${apiUrl}/api/payments/verify`,
                {
                    sessionId
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                const { transaction, coupon: purchasedCoupon } = response.data.data;

                // Set coupon and transaction details for modal
                setPurchasedCouponDetails(purchasedCoupon);
                setTransactionDetails(transaction);

                // Show success modal
                setShowSuccessModal(true);
                setError('');
            }
        } catch (err) {
            let errorMessage = 'Payment verification failed';

            if (err.response?.data?.error) {
                errorMessage = err.response.data.error.message || err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.request) {
                errorMessage = 'Network error during verification. Please contact support.';
            }

            setError(errorMessage);
            console.error('Error verifying payment:', err);
        } finally {
            setPurchasing(false);
        }
    };

    // Handle payment failure callback
    const handlePaymentFailure = (error) => {
        setPurchasing(false);

        if (error) {
            // Check if it's a configuration error
            if (error.message && error.message.includes('not configured')) {
                setError(error.message);
            } else {
                // Stripe error object
                const errorMessage = error.message || 'Payment failed. Please try again.';
                setError(errorMessage);
            }
            console.error('Payment failed:', error);
        } else {
            // User cancelled payment
            setError('Payment cancelled. You can try again when ready.');
        }
    };

    // Handle purchase
    const handlePurchase = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { message: 'Please login to purchase coupons' } });
            return;
        }

        try {
            setPurchasing(true);
            setError('');
            setSuccessMessage('');

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const token = localStorage.getItem('token');

            // Create Stripe Payment Intent
            const response = await axios.post(
                `${apiUrl}/api/payments/create-order`,
                { couponId: id },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                const { sessionUrl, sessionId } = response.data.data;

                console.log('Payment order created successfully');
                console.log('Session ID:', sessionId);
                console.log('Session URL:', sessionUrl);

                // Redirect to Stripe checkout
                openCheckout(
                    {
                        sessionUrl,
                        sessionId
                    },
                    handlePaymentSuccess,
                    handlePaymentFailure
                );
            } else {
                console.error('Payment order creation failed:', response.data);
                setPurchasing(false);
                setError('Failed to create payment order. Please try again.');
            }
        } catch (err) {
            setPurchasing(false);
            let errorMessage = 'Failed to create payment order';

            if (err.response?.status === 400) {
                // Handle specific error cases
                if (err.response.data?.error?.message) {
                    errorMessage = err.response.data.error.message;
                } else if (err.response.data?.message) {
                    errorMessage = err.response.data.message;
                }
            } else if (err.response?.status === 404) {
                errorMessage = 'Coupon not found or no longer available';
            } else if (err.response?.status === 409) {
                errorMessage = 'This coupon has already been sold';
            } else if (err.response?.status === 500) {
                errorMessage = 'Payment service temporarily unavailable. Please try again later.';
            } else if (err.request) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }

            setError(errorMessage);
            console.error('Error creating payment order:', err);
        }
    };



    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Check if coupon is expired
    const isExpired = coupon && new Date(coupon.expiryDate) < new Date();

    // Check if user is the seller
    const isOwnCoupon = coupon && user && coupon.sellerId?._id === user.id;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex justify-center items-center py-20">
                    <Loader />
                </div>
            </div>
        );
    }

    if (error && !coupon) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <p>{error}</p>
                        <button
                            onClick={() => navigate('/coupons')}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Back to Coupons
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!coupon) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <p className="text-gray-600 mb-4">Coupon not found</p>
                        <button
                            onClick={() => navigate('/coupons')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Back to Coupons
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Coupon Screenshot - Only show after purchase */}
                    {coupon.isSold && coupon.buyerId === user?._id ? (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Coupon Screenshot</h2>

                            {coupon.screenshotURL ? (
                                <div className="relative">
                                    <img
                                        src={coupon.screenshotURL}
                                        alt="Coupon Screenshot"
                                        className={`w-full rounded-lg border border-gray-200 cursor-zoom-in transition-transform ${imageZoomed ? 'scale-150' : 'scale-100'
                                            }`}
                                        onClick={() => setImageZoomed(!imageZoomed)}
                                    />
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Click image to {imageZoomed ? 'zoom out' : 'zoom in'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-gray-100 rounded-lg p-8 text-center">
                                    <svg
                                        className="mx-auto h-16 w-16 text-gray-400 mb-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <p className="text-gray-500">No screenshot available</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Coupon Preview</h2>
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 text-center border-2 border-dashed border-blue-300">
                                <svg
                                    className="mx-auto h-20 w-20 text-blue-400 mb-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                                <p className="text-gray-700 font-semibold mb-2">🔒 Protected Content</p>
                                <p className="text-gray-600 text-sm">
                                    Coupon screenshot and code will be revealed after successful purchase
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Right Column - Coupon Details */}
                    <div className="space-y-6">
                        {/* Coupon Info Card */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                    {coupon.title}
                                </h1>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${coupon.isSold
                                        ? 'bg-gray-200 text-gray-700'
                                        : isExpired
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}
                                >
                                    {coupon.isSold ? 'Sold' : isExpired ? 'Expired' : 'Available'}
                                </span>
                            </div>

                            <p className="text-lg text-gray-600 mb-4">{coupon.storeName}</p>

                            {coupon.description && (
                                <p className="text-gray-600 mb-6">{coupon.description}</p>
                            )}

                            {/* Discount Badge */}
                            {(coupon.discountPercent || coupon.discountAmount) && (
                                <div className="mb-6">
                                    <div className="inline-block bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-2xl">
                                        {coupon.discountPercent ? `${coupon.discountPercent}% OFF` : `₹${coupon.discountAmount} OFF`}
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Price:</span>
                                    <span className="text-2xl font-bold text-blue-600">₹{coupon.price}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600 font-medium">Expires:</span>
                                    <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>
                                        {formatDate(coupon.expiryDate)}
                                    </span>
                                </div>
                                {coupon.status && (
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        <span className="font-medium text-gray-800 capitalize">
                                            {coupon.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Purchase Button */}
                            {!isOwnCoupon && !coupon.isSold && !isExpired && coupon.status === 'approved' && (
                                <div className="space-y-3">
                                    <button
                                        onClick={handlePurchase}
                                        disabled={purchasing}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold text-xl transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        {purchasing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing Payment...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center">
                                                🛒 Buy Now - ₹{coupon.price}
                                            </span>
                                        )}
                                    </button>
                                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>Secure payment via Stripe</span>
                                    </div>
                                </div>
                            )}

                            {isOwnCoupon && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <p className="text-blue-800 font-medium">This is your coupon</p>
                                </div>
                            )}

                            {!isAuthenticated && !coupon.isSold && !isExpired && (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate('/login', { state: { message: 'Please login to purchase coupons' } })}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold text-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        🔐 Login to Purchase
                                    </button>
                                    <p className="text-center text-sm text-gray-500">
                                        Sign in to buy this coupon securely
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Seller Info Card */}
                        {coupon.sellerId && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Seller Information</h2>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Seller:</span>
                                        <span className="font-semibold text-gray-800">
                                            {coupon.sellerId.name || 'Anonymous'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Trust Score:</span>
                                        <span className="font-bold text-lg text-blue-600">
                                            {coupon.sellerId.trustScore || 100}/100
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Total Sales:</span>
                                        <span className="font-semibold text-gray-800">
                                            {coupon.sellerId.totalCouponsSold || 0}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Reputation:</span>
                                        <TrustBadge
                                            trustScore={coupon.sellerId.trustScore || 100}
                                            warningsCount={coupon.sellerId.warningsCount || 0}
                                        />
                                    </div>
                                </div>

                                {/* Trust Score Explanation */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">
                                        Trust scores are based on seller performance, successful transactions, and buyer feedback.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {imageZoomed && coupon.screenshotURL && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                    onClick={() => setImageZoomed(false)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setImageZoomed(false)}
                            className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={coupon.screenshotURL}
                            alt="Coupon Screenshot Zoomed"
                            className="max-w-full max-h-screen rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Payment Success Modal */}
            <PaymentSuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    // Refresh page to show updated coupon status
                    window.location.reload();
                }}
                couponDetails={purchasedCouponDetails}
                transactionDetails={transactionDetails}
            />
        </div>
    );
};

export default CouponDetails;


