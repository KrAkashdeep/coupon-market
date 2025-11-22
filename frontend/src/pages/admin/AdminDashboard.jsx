import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axios';
import Navbar from '../../components/Navbar';
import Loader from '../../components/Loader';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        pendingCouponsCount: 0,
        totalUsers: 0,
        totalTransactions: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch dashboard statistics
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError('');

                // Fetch pending coupons count
                const pendingResponse = await axiosInstance.get('/api/coupons/pending');
                const pendingCount = pendingResponse.data.coupons?.length || 0;

                // Fetch total users
                const usersResponse = await axiosInstance.get('/api/users/all');
                const totalUsers = usersResponse.data.users?.length || 0;

                // Fetch user's transactions (as proxy for total transactions)
                const transactionsResponse = await axiosInstance.get('/api/transactions/my');
                const totalTransactions = transactionsResponse.data.transactions?.length || 0;

                setStats({
                    pendingCouponsCount: pendingCount,
                    totalUsers,
                    totalTransactions
                });

                // Build recent activity feed from pending coupons
                const recentCoupons = pendingResponse.data.coupons?.slice(0, 5) || [];
                const activities = recentCoupons.map(coupon => ({
                    id: coupon._id,
                    type: 'coupon_pending',
                    message: `New coupon from ${coupon.sellerId?.name || 'Unknown'} - ${coupon.storeName}`,
                    timestamp: coupon.createdAt,
                    data: coupon
                }));

                setRecentActivity(activities);
            } catch (err) {
                let errorMessage = 'Failed to load dashboard data';

                if (err.response) {
                    if (err.response.status === 403) {
                        errorMessage = 'Access denied. Admin privileges required.';
                        setTimeout(() => navigate('/dashboard'), 2000);
                    } else {
                        errorMessage = err.response.data?.error || 'Unable to fetch dashboard data';
                    }
                } else if (err.request) {
                    errorMessage = 'Network error. Please check your connection.';
                }

                setError(errorMessage);
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        // Only fetch if user is admin
        if (user?.role === 'admin') {
            fetchDashboardData();
        } else {
            setError('Access denied. Admin privileges required.');
            setLoading(false);
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    }, [user, navigate]);

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

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
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        Manage coupons, users, and monitor platform activity
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Pending Coupons */}
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">
                                    Pending Coupons
                                </p>
                                <p className="text-3xl font-bold text-gray-800">
                                    {stats.pendingCouponsCount}
                                </p>
                            </div>
                            <div className="bg-yellow-100 rounded-full p-3">
                                <svg
                                    className="w-8 h-8 text-yellow-600"
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
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Awaiting verification
                        </p>
                    </div>

                    {/* Total Users */}
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">
                                    Total Users
                                </p>
                                <p className="text-3xl font-bold text-gray-800">
                                    {stats.totalUsers}
                                </p>
                            </div>
                            <div className="bg-blue-100 rounded-full p-3">
                                <svg
                                    className="w-8 h-8 text-blue-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Registered on platform
                        </p>
                    </div>

                    {/* Total Transactions */}
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">
                                    Total Transactions
                                </p>
                                <p className="text-3xl font-bold text-gray-800">
                                    {stats.totalTransactions}
                                </p>
                            </div>
                            <div className="bg-green-100 rounded-full p-3">
                                <svg
                                    className="w-8 h-8 text-green-600"
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
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Platform activity
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/admin/coupon-verification')}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg"
                        >
                            <div className="flex items-center">
                                <svg
                                    className="w-6 h-6 mr-3"
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
                                <span className="font-semibold">Verify Coupons</span>
                            </div>
                            {stats.pendingCouponsCount > 0 && (
                                <span className="bg-white text-yellow-600 px-3 py-1 rounded-full text-sm font-bold">
                                    {stats.pendingCouponsCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => navigate('/admin/user-management')}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                        >
                            <div className="flex items-center">
                                <svg
                                    className="w-6 h-6 mr-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                </svg>
                                <span className="font-semibold">Manage Users</span>
                            </div>
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Recent Activity
                    </h2>

                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            <p className="text-gray-500">No recent activity</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex-shrink-0 mr-4">
                                        <div className="bg-yellow-100 rounded-full p-2">
                                            <svg
                                                className="w-5 h-5 text-yellow-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800">
                                            {activity.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatTimestamp(activity.timestamp)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/admin/coupon-verification')}
                                        className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Review
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
