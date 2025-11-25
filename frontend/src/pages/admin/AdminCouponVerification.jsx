import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axios';
import Navbar from '../../components/Navbar';
import Loader from '../../components/Loader';
import TrustBadge from '../../components/TrustBadge';

const AdminCouponVerification = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch pending coupons
    useEffect(() => {
        fetchPendingCoupons();
    }, []);

    const fetchPendingCoupons = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axiosInstance.get('/api/coupons/pending');
            setCoupons(response.data.coupons || []);
        } catch (err) {
            let errorMessage = 'Failed to load pending coupons';

            if (err.response) {
                if (err.response.status === 403) {
                    errorMessage = 'Access denied. Admin privileges required.';
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else {
                    errorMessage = err.response.data?.error || 'Unable to fetch coupons';
                }
            } else if (err.request) {
                errorMessage = 'Network error. Please check your connection.';
            }

            setError(errorMessage);
            console.error('Error fetching pending coupons:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle approve coupon
    const handleApprove = async (couponId) => {
        try {
            setProcessingId(couponId);
            setError('');

            await axiosInstance.patch(`/api/coupons/approve/${couponId}`);

            // Remove approved coupon from list
            setCoupons(coupons.filter(c => c._id !== couponId));

            // Show success message briefly
            const successMsg = 'Coupon approved successfully!';
            setError('');

            // Optional: Show success toast or notification
            console.log(successMsg);
        } catch (err) {
            let errorMessage = 'Failed to approve coupon';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to approve coupon';
            } else if (err.request) {
                errorMessage = 'Network error. Please try again.';
            }

            setError(errorMessage);
            console.error('Error approving coupon:', err);
        } finally {
            setProcessingId(null);
        }
    };

    // Handle reject coupon
    const handleReject = async () => {
        if (!selectedCoupon || !rejectionReason.trim()) {
            setError('Please provide a rejection reason');
            return;
        }

        try {
            setProcessingId(selectedCoupon._id);
            setError('');

            await axiosInstance.patch(`/api/coupons/reject/${selectedCoupon._id}`, {
                reason: rejectionReason
            });

            // Remove rejected coupon from list
            setCoupons(coupons.filter(c => c._id !== selectedCoupon._id));

            // Close modal and reset
            setShowRejectModal(false);
            setSelectedCoupon(null);
            setRejectionReason('');

            console.log('Coupon rejected successfully!');
        } catch (err) {
            let errorMessage = 'Failed to reject coupon';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to reject coupon';
            } else if (err.request) {
                errorMessage = 'Network error. Please try again.';
            }

            setError(errorMessage);
            console.error('Error rejecting coupon:', err);
        } finally {
            setProcessingId(null);
        }
    };

    // Open reject modal
    const openRejectModal = (coupon) => {
        setSelectedCoupon(coupon);
        setShowRejectModal(true);
        setRejectionReason('');
        setError('');
    };

    // Close reject modal
    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedCoupon(null);
        setRejectionReason('');
        setError('');
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCoupons = coupons.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(coupons.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                                Coupon Verification
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Review and verify pending coupon submissions
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Coupons Count */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <svg
                                className="w-5 h-5 text-yellow-600 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                                Pending Verification: <span className="font-bold text-gray-900">{coupons.length}</span>
                            </span>
                        </div>
                        <button
                            onClick={fetchPendingCoupons}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Coupons List */}
                {currentCoupons.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Pending Coupons
                        </h3>
                        <p className="text-gray-500">
                            All coupons have been verified. Check back later for new submissions.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {currentCoupons.map((coupon) => (
                            <div
                                key={coupon._id}
                                className="bg-white rounded-lg shadow-md overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Screenshot Section */}
                                        <div className="lg:col-span-1">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                Screenshot
                                            </h3>
                                            {coupon.screenshotURL ? (
                                                <img
                                                    src={coupon.screenshotURL}
                                                    alt="Coupon screenshot"
                                                    className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(coupon.screenshotURL, '_blank')}
                                                />
                                            ) : (
                                                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-gray-400">No screenshot</span>
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                Click to view full size
                                            </p>
                                        </div>

                                        {/* Code Section */}
                                        <div className="lg:col-span-1">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                Coupon Code
                                            </h3>
                                            <div className="space-y-4">
                                                {/* Entered Code */}
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                                        Code:
                                                    </label>
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <code className="text-sm font-mono font-bold text-blue-900">
                                                            {coupon.code}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coupon & Seller Info Section */}
                                        <div className="lg:col-span-1">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                Details
                                            </h3>
                                            <div className="space-y-3">
                                                {/* Coupon Info */}
                                                <div>
                                                    <p className="text-xs text-gray-600 mb-1">Store:</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {coupon.storeName}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 mb-1">Discount:</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {coupon.discountPercent ? `${coupon.discountPercent}% off` : coupon.discountAmount ? `₹${coupon.discountAmount} off` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 mb-1">Price:</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        ₹{coupon.price}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 mb-1">Expiry Date:</p>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatDate(coupon.expiryDate)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600 mb-1">Submitted:</p>
                                                    <p className="text-sm text-gray-700">
                                                        {formatDate(coupon.createdAt)}
                                                    </p>
                                                </div>

                                                {/* Seller Info */}
                                                <div className="pt-3 border-t border-gray-200">
                                                    <p className="text-xs text-gray-600 mb-2">Seller Information:</p>
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {coupon.sellerId?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {coupon.sellerId?.email || 'No email'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <TrustBadge
                                                                trustScore={coupon.sellerId?.trustScore || 100}
                                                                warningsCount={coupon.sellerId?.warningsCount || 0}
                                                            />
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            <span>Warnings: </span>
                                                            <span className={`font-semibold ${(coupon.sellerId?.warningsCount || 0) >= 2
                                                                ? 'text-red-600'
                                                                : 'text-gray-900'
                                                                }`}>
                                                                {coupon.sellerId?.warningsCount || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                                        <button
                                            onClick={() => handleApprove(coupon._id)}
                                            disabled={processingId === coupon._id}
                                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {processingId === coupon._id ? (
                                                <>
                                                    <svg
                                                        className="animate-spin h-5 w-5 mr-2"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            className="opacity-25"
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                        ></circle>
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        ></path>
                                                    </svg>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg
                                                        className="w-5 h-5 mr-2"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openRejectModal(coupon)}
                                            disabled={processingId === coupon._id}
                                            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <svg
                                                className="w-5 h-5 mr-2"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                        <nav className="flex items-center gap-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {[...Array(totalPages)].map((_, index) => (
                                <button
                                    key={index + 1}
                                    onClick={() => paginate(index + 1)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === index + 1
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Reject Coupon
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Please provide a reason for rejecting this coupon. The seller will be notified.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows="4"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={closeRejectModal}
                                disabled={processingId === selectedCoupon?._id}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === selectedCoupon?._id || !rejectionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {processingId === selectedCoupon?._id ? 'Processing...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCouponVerification;
