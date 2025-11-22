import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import Navbar from '../components/Navbar';
import TrustBadge from '../components/TrustBadge';
import Loader from '../components/Loader';

const MyCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [filteredCoupons, setFilteredCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const { user } = useAuth();

    // Fetch user's coupons
    useEffect(() => {
        const fetchMyCoupons = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axiosInstance.get('/api/coupons/my');
                setCoupons(response.data.coupons);
                setFilteredCoupons(response.data.coupons);
            } catch (err) {
                let errorMessage = 'Failed to load your coupons';

                if (err.response) {
                    errorMessage = err.response.data?.error || 'Unable to fetch coupons';
                } else if (err.request) {
                    errorMessage = 'Network error. Please check your connection.';
                }

                setError(errorMessage);
                console.error('Error fetching my coupons:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyCoupons();
    }, []);

    // Filter coupons based on active filter
    useEffect(() => {
        if (activeFilter === 'all') {
            setFilteredCoupons(coupons);
        } else {
            const filtered = coupons.filter(coupon => {
                if (activeFilter === 'pending') return coupon.status === 'pending_verification';
                if (activeFilter === 'approved') return coupon.status === 'approved';
                if (activeFilter === 'rejected') return coupon.status === 'rejected';
                if (activeFilter === 'sold') return coupon.isSold || coupon.status === 'sold';
                return true;
            });
            setFilteredCoupons(filtered);
        }
    }, [activeFilter, coupons]);

    // Handle delete coupon
    const handleDelete = async (couponId) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) {
            return;
        }

        try {
            setDeletingId(couponId);
            await axiosInstance.delete(`/api/coupons/${couponId}`);

            // Remove from state
            setCoupons(prev => prev.filter(c => c._id !== couponId));
            setError('');
        } catch (err) {
            let errorMessage = 'Failed to delete coupon';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to delete coupon';
            }

            setError(errorMessage);
            console.error('Error deleting coupon:', err);
        } finally {
            setDeletingId(null);
        }
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

    // Get status badge styling
    const getStatusBadge = (coupon) => {
        if (coupon.isSold || coupon.status === 'sold') {
            return { label: 'Sold', color: 'bg-gray-200 text-gray-700' };
        }

        switch (coupon.status) {
            case 'pending_verification':
                return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
            case 'approved':
                return { label: 'Approved', color: 'bg-green-100 text-green-700' };
            case 'rejected':
                return { label: 'Rejected', color: 'bg-red-100 text-red-700' };
            default:
                return { label: 'Unknown', color: 'bg-gray-100 text-gray-700' };
        }
    };

    // Filter tabs
    const filters = [
        { key: 'all', label: 'All', count: coupons.length },
        { key: 'pending', label: 'Pending', count: coupons.filter(c => c.status === 'pending_verification').length },
        { key: 'approved', label: 'Approved', count: coupons.filter(c => c.status === 'approved').length },
        { key: 'rejected', label: 'Rejected', count: coupons.filter(c => c.status === 'rejected').length },
        { key: 'sold', label: 'Sold', count: coupons.filter(c => c.isSold || c.status === 'sold').length }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                        My Coupons
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm sm:text-base text-gray-600">
                            Manage your listed coupons
                        </p>
                        {user && (
                            <TrustBadge
                                trustScore={user.trustScore || 100}
                                warningsCount={user.warningsCount || 0}
                            />
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {filters.map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${activeFilter === filter.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                            >
                                {filter.label}
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeFilter === filter.key
                                    ? 'bg-blue-500'
                                    : 'bg-gray-200'
                                    }`}>
                                    {filter.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader />
                    </div>
                )}

                {/* Coupons Grid */}
                {!loading && filteredCoupons.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCoupons.map((coupon) => {
                            const statusBadge = getStatusBadge(coupon);
                            const isExpired = new Date(coupon.expiryDate) < new Date();
                            const canDelete = coupon.status === 'pending_verification' && !coupon.isSold;

                            return (
                                <div
                                    key={coupon._id}
                                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 flex flex-col"
                                >
                                    {/* Screenshot Thumbnail */}
                                    {coupon.screenshotURL && (
                                        <div className="relative h-48 bg-gray-100">
                                            <img
                                                src={coupon.screenshotURL}
                                                alt={`${coupon.storeName} coupon`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                }}
                                            />
                                            {/* Status Badge Overlay */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                                                    {statusBadge.label}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Content */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        {/* Title and Brand */}
                                        <div className="mb-3">
                                            <h3 className="text-lg font-bold text-gray-800 mb-1">
                                                {coupon.storeName || coupon.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Code: <span className="font-mono font-semibold">{coupon.code}</span>
                                            </p>
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-2 text-sm mb-4 flex-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Price:</span>
                                                <span className="font-bold text-blue-600">₹{coupon.price}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Expires:</span>
                                                <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {formatDate(coupon.expiryDate)}
                                                    {isExpired && ' (Expired)'}
                                                </span>
                                            </div>
                                            {coupon.ocrExtractedCode && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">OCR Match:</span>
                                                    <span className={`font-medium ${coupon.isOCRMatched ? 'text-green-600' : 'text-red-600'}`}>
                                                        {coupon.isOCRMatched ? '✓ Matched' : '✗ Not Matched'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Rejection Reason */}
                                        {coupon.status === 'rejected' && coupon.adminNotes && (
                                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason:</p>
                                                <p className="text-xs text-red-600">{coupon.adminNotes}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {canDelete && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleDelete(coupon._id)}
                                                    disabled={deletingId === coupon._id}
                                                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                                                >
                                                    {deletingId === coupon._id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredCoupons.length === 0 && (
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
                                {activeFilter === 'all' ? 'No Coupons Yet' : `No ${filters.find(f => f.key === activeFilter)?.label} Coupons`}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {activeFilter === 'all'
                                    ? "You haven't listed any coupons yet. Start by uploading your first coupon!"
                                    : `You don't have any ${filters.find(f => f.key === activeFilter)?.label.toLowerCase()} coupons.`
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyCoupons;
