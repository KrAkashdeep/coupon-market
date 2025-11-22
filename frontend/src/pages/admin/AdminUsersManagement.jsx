import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axios';
import Navbar from '../../components/Navbar';
import Loader from '../../components/Loader';
import TrustBadge from '../../components/TrustBadge';

const AdminUsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [filterBanned, setFilterBanned] = useState('all');
    const [filterLowTrust, setFilterLowTrust] = useState(false);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userTransactions, setUserTransactions] = useState({});
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [showTrustModal, setShowTrustModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newTrustScore, setNewTrustScore] = useState('');
    const [trustReason, setTrustReason] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch users
    useEffect(() => {
        fetchUsers();
    }, [filterBanned, filterLowTrust, currentPage]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');

            const params = {
                page: currentPage,
                limit: 20
            };

            if (filterBanned !== 'all') {
                params.banned = filterBanned;
            }

            if (filterLowTrust) {
                params.lowTrust = 'true';
            }

            const response = await axiosInstance.get('/api/users/all', { params });
            setUsers(response.data.users || []);
            setPagination(response.data.pagination);
        } catch (err) {
            let errorMessage = 'Failed to load users';

            if (err.response) {
                if (err.response.status === 403) {
                    errorMessage = 'Access denied. Admin privileges required.';
                    setTimeout(() => navigate('/dashboard'), 2000);
                } else {
                    errorMessage = err.response.data?.error || 'Unable to fetch users';
                }
            } else if (err.request) {
                errorMessage = 'Network error. Please check your connection.';
            }

            setError(errorMessage);
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch user transactions
    const fetchUserTransactions = async (userId) => {
        if (userTransactions[userId]) {
            // Already loaded
            return;
        }

        try {
            setLoadingTransactions(true);
            const response = await axiosInstance.get(`/api/transactions/user/${userId}`);
            setUserTransactions(prev => ({
                ...prev,
                [userId]: response.data.transactions || []
            }));
        } catch (err) {
            console.error('Error fetching user transactions:', err);
            setUserTransactions(prev => ({
                ...prev,
                [userId]: []
            }));
        } finally {
            setLoadingTransactions(false);
        }
    };

    // Toggle expanded row
    const toggleExpandUser = async (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
        } else {
            setExpandedUserId(userId);
            await fetchUserTransactions(userId);
        }
    };

    // Handle ban user
    const handleBanUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to ban ${userName}?`)) {
            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            await axiosInstance.patch(`/api/users/ban/${userId}`, {
                reason: 'Administrative action'
            });

            // Update user in list
            setUsers(users.map(u =>
                u.id === userId ? { ...u, isBanned: true } : u
            ));

            console.log('User banned successfully');
        } catch (err) {
            let errorMessage = 'Failed to ban user';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to ban user';
            } else if (err.request) {
                errorMessage = 'Network error. Please try again.';
            }

            setError(errorMessage);
            console.error('Error banning user:', err);
        } finally {
            setProcessingId(null);
        }
    };

    // Handle unban user
    const handleUnbanUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to unban ${userName}?`)) {
            return;
        }

        try {
            setProcessingId(userId);
            setError('');

            await axiosInstance.patch(`/api/users/unban/${userId}`);

            // Update user in list
            setUsers(users.map(u =>
                u.id === userId ? { ...u, isBanned: false } : u
            ));

            console.log('User unbanned successfully');
        } catch (err) {
            let errorMessage = 'Failed to unban user';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to unban user';
            } else if (err.request) {
                errorMessage = 'Network error. Please try again.';
            }

            setError(errorMessage);
            console.error('Error unbanning user:', err);
        } finally {
            setProcessingId(null);
        }
    };

    // Open trust score modal
    const openTrustModal = (user) => {
        setSelectedUser(user);
        setNewTrustScore(user.trustScore.toString());
        setTrustReason('');
        setShowTrustModal(true);
        setError('');
    };

    // Close trust score modal
    const closeTrustModal = () => {
        setShowTrustModal(false);
        setSelectedUser(null);
        setNewTrustScore('');
        setTrustReason('');
        setError('');
    };

    // Handle trust score adjustment
    const handleAdjustTrustScore = async () => {
        const score = parseInt(newTrustScore);

        if (isNaN(score) || score < 0 || score > 100) {
            setError('Trust score must be a number between 0 and 100');
            return;
        }

        try {
            setProcessingId(selectedUser.id);
            setError('');

            const response = await axiosInstance.patch(`/api/users/trust/${selectedUser.id}`, {
                trustScore: score,
                reason: trustReason
            });

            // Update user in list
            setUsers(users.map(u =>
                u.id === selectedUser.id
                    ? { ...u, trustScore: score, trustBadge: response.data.user.trustBadge }
                    : u
            ));

            closeTrustModal();
            console.log('Trust score updated successfully');
        } catch (err) {
            let errorMessage = 'Failed to update trust score';

            if (err.response) {
                errorMessage = err.response.data?.error || 'Unable to update trust score';
            } else if (err.request) {
                errorMessage = 'Network error. Please try again.';
            }

            setError(errorMessage);
            console.error('Error updating trust score:', err);
        } finally {
            setProcessingId(null);
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

    // Format transaction status
    const getStatusBadge = (status) => {
        const statusConfig = {
            holding: { label: 'Holding', color: 'bg-yellow-100 text-yellow-800' },
            released: { label: 'Released', color: 'bg-green-100 text-green-800' },
            refunded: { label: 'Refunded', color: 'bg-red-100 text-red-800' },
            pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' }
        };

        const config = statusConfig[status] || statusConfig.pending;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                {config.label}
            </span>
        );
    };

    // Pagination
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
                                User Management
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Manage users, trust scores, and ban status
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

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">
                                Ban Status:
                            </label>
                            <select
                                value={filterBanned}
                                onChange={(e) => {
                                    setFilterBanned(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Users</option>
                                <option value="false">Active Only</option>
                                <option value="true">Banned Only</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="lowTrust"
                                checked={filterLowTrust}
                                onChange={(e) => {
                                    setFilterLowTrust(e.target.checked);
                                    setCurrentPage(1);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="lowTrust" className="text-sm font-medium text-gray-700">
                                Low Trust Score (&lt; 50)
                            </label>
                        </div>

                        <button
                            onClick={fetchUsers}
                            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                {users.length === 0 ? (
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
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Users Found
                        </h3>
                        <p className="text-gray-500">
                            No users match the selected filters.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trust Score
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Warnings
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sales/Purchases
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <>
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            {user.avatar ? (
                                                                <img
                                                                    className="h-10 w-10 rounded-full"
                                                                    src={user.avatar}
                                                                    alt={user.name}
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {user.name}
                                                                {user.role === 'admin' && (
                                                                    <span className="ml-2 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
                                                                        Admin
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {user.trustScore}
                                                        </div>
                                                        <TrustBadge
                                                            trustScore={user.trustScore}
                                                            warningsCount={user.warningsCount}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-semibold ${user.warningsCount >= 2 ? 'text-red-600' : 'text-gray-900'
                                                        }`}>
                                                        {user.warningsCount}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        <span className="font-medium">{user.totalCouponsSold}</span> sold
                                                        <span className="mx-1">/</span>
                                                        <span className="font-medium">{user.totalCouponsBought}</span> bought
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.isBanned ? (
                                                        <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                                                            Banned
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {user.role !== 'admin' && (
                                                            <>
                                                                {user.isBanned ? (
                                                                    <button
                                                                        onClick={() => handleUnbanUser(user.id, user.name)}
                                                                        disabled={processingId === user.id}
                                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                                    >
                                                                        Unban
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleBanUser(user.id, user.name)}
                                                                        disabled={processingId === user.id}
                                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                                    >
                                                                        Ban
                                                                    </button>
                                                                )}
                                                                <span className="text-gray-300">|</span>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => openTrustModal(user)}
                                                            disabled={processingId === user.id}
                                                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                        >
                                                            Adjust Trust
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            onClick={() => toggleExpandUser(user.id)}
                                                            className="text-gray-600 hover:text-gray-900"
                                                        >
                                                            {expandedUserId === user.id ? '▼' : '▶'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Row - Transaction History */}
                                            {expandedUserId === user.id && (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                                                Transaction History
                                                            </h4>
                                                            {loadingTransactions ? (
                                                                <div className="flex justify-center py-4">
                                                                    <Loader />
                                                                </div>
                                                            ) : userTransactions[user.id]?.length > 0 ? (
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                                                    Date
                                                                                </th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                                                    Type
                                                                                </th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                                                    Amount
                                                                                </th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                                                    Status
                                                                                </th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                                                    Other Party
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                            {userTransactions[user.id].map((transaction) => (
                                                                                <tr key={transaction._id}>
                                                                                    <td className="px-4 py-2 text-xs text-gray-900">
                                                                                        {formatDate(transaction.createdAt)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs">
                                                                                        {transaction.buyerId === user.id ? (
                                                                                            <span className="text-blue-600 font-medium">Purchase</span>
                                                                                        ) : (
                                                                                            <span className="text-green-600 font-medium">Sale</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs font-semibold text-gray-900">
                                                                                        ₹{transaction.amount}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs">
                                                                                        {getStatusBadge(transaction.paymentStatus)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-gray-600">
                                                                                        {transaction.buyerId === user.id
                                                                                            ? transaction.sellerId?.name || 'Unknown'
                                                                                            : transaction.buyerId?.name || 'Unknown'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500 py-4 text-center">
                                                                    No transactions found
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="mt-6 flex justify-center">
                        <nav className="flex items-center gap-2">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {[...Array(pagination.pages)].map((_, index) => (
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
                                disabled={currentPage === pagination.pages}
                                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            {/* Trust Score Adjustment Modal */}
            {showTrustModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Adjust Trust Score
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Adjusting trust score for <span className="font-semibold">{selectedUser.name}</span>
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Trust Score (0-100)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={newTrustScore}
                                    onChange={(e) => setNewTrustScore(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter score (0-100)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Current score: {selectedUser.trustScore}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason (optional)
                                </label>
                                <textarea
                                    value={trustReason}
                                    onChange={(e) => setTrustReason(e.target.value)}
                                    placeholder="Enter reason for adjustment..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={closeTrustModal}
                                disabled={processingId === selectedUser.id}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdjustTrustScore}
                                disabled={processingId === selectedUser.id || !newTrustScore}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {processingId === selectedUser.id ? 'Processing...' : 'Update Score'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersManagement;
