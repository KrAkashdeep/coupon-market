import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, purchases, sales
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, processing, completed, failed, refunded
    const [currentPage, setCurrentPage] = useState(1);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputing, setDisputing] = useState(false);
    const { user } = useAuth();

    const itemsPerPage = 10;

    // Fetch transactions
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axiosInstance.get('/api/transactions/my');
                setTransactions(response.data.transactions || []);
                setFilteredTransactions(response.data.transactions || []);
            } catch (err) {
                let errorMessage = 'Failed to load transactions';

                if (err.response) {
                    errorMessage = err.response.data?.error?.message || err.response.data?.message || 'Unable to fetch transactions';
                } else if (err.request) {
                    errorMessage = 'Network error. Please check your connection.';
                }

                setError(errorMessage);
                console.error('Error fetching transactions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    // Filter transactions based on active tab, date filter, and status filter
    useEffect(() => {
        let filtered = [...transactions];

        // Filter by tab (purchases/sales)
        if (activeTab === 'purchases') {
            filtered = filtered.filter(t => t.buyerId === user?._id || t.buyerId?._id === user?._id);
        } else if (activeTab === 'sales') {
            filtered = filtered.filter(t => t.sellerId === user?._id || t.sellerId?._id === user?._id);
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            if (dateFilter === 'today') {
                filterDate.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'week') {
                filterDate.setDate(now.getDate() - 7);
            } else if (dateFilter === 'month') {
                filterDate.setMonth(now.getMonth() - 1);
            }

            filtered = filtered.filter(t => new Date(t.createdAt) >= filterDate);
        }

        // Filter by payment status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.paymentStatus === statusFilter);
        }

        setFilteredTransactions(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [activeTab, dateFilter, statusFilter, transactions, user]);

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge styling with enhanced visual distinction
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending',
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-400',
                    icon: '⏳'
                };
            case 'processing':
                return {
                    label: 'Processing',
                    color: 'bg-blue-100 text-blue-800 border-blue-400',
                    icon: '⚡'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    color: 'bg-green-100 text-green-800 border-green-400',
                    icon: '✓'
                };
            case 'failed':
                return {
                    label: 'Failed',
                    color: 'bg-red-100 text-red-800 border-red-400',
                    icon: '✗'
                };
            case 'refunded':
                return {
                    label: 'Refunded',
                    color: 'bg-orange-100 text-orange-800 border-orange-400',
                    icon: '↩'
                };
            // Legacy statuses
            case 'holding':
                return {
                    label: 'Holding',
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-400',
                    icon: '⏱'
                };
            case 'released':
                return {
                    label: 'Completed',
                    color: 'bg-green-100 text-green-800 border-green-400',
                    icon: '✓'
                };
            default:
                return {
                    label: status,
                    color: 'bg-gray-100 text-gray-800 border-gray-400',
                    icon: '•'
                };
        }
    };

    // Mask Stripe payment ID for display
    const maskPaymentId = (paymentId) => {
        if (!paymentId) return 'N/A';
        if (paymentId.length <= 8) return paymentId;
        return `${paymentId.substring(0, 4)}...${paymentId.substring(paymentId.length - 4)}`;
    };

    // Calculate time remaining for holding transactions
    const getTimeRemaining = (expiresAt) => {
        const now = new Date().getTime();
        const expires = new Date(expiresAt).getTime();
        const remaining = Math.max(0, expires - now);

        const totalSeconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return {
            formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            isExpired: remaining === 0,
            isWarning: remaining <= 5 * 60 * 1000 && remaining > 0
        };
    };

    // Handle dispute
    const handleOpenDispute = (transaction) => {
        setSelectedTransaction(transaction);
        setShowDisputeModal(true);
        setDisputeReason('');
        setError('');
    };

    const handleSubmitDispute = async () => {
        if (!disputeReason.trim()) {
            setError('Please provide a reason for the dispute');
            return;
        }

        try {
            setDisputing(true);
            setError('');

            const response = await axiosInstance.post(`/api/transactions/dispute/${selectedTransaction._id}`, {
                disputeReason: disputeReason.trim()
            });

            if (response.data.success) {
                // Update transaction in state
                setTransactions(prev =>
                    prev.map(t =>
                        t._id === selectedTransaction._id
                            ? { ...t, paymentStatus: 'refunded', disputeReason: disputeReason.trim() }
                            : t
                    )
                );
                setShowDisputeModal(false);
                setSelectedTransaction(null);
                setDisputeReason('');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit dispute';
            setError(errorMessage);
            console.error('Error disputing transaction:', err);
        } finally {
            setDisputing(false);
        }
    };

    // Timer component for holding transactions
    const TransactionTimer = ({ transaction }) => {
        const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(transaction.expiresAt));

        useEffect(() => {
            const interval = setInterval(() => {
                setTimeRemaining(getTimeRemaining(transaction.expiresAt));
            }, 1000);

            return () => clearInterval(interval);
        }, [transaction.expiresAt]);

        if (timeRemaining.isExpired) {
            return <span className="text-gray-500 text-sm">Expired</span>;
        }

        return (
            <span className={`text-sm font-mono ${timeRemaining.isWarning ? 'text-orange-600 font-bold' : 'text-gray-700'}`}>
                ⏱️ {timeRemaining.formatted}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                        Transaction History
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        View your purchase and sales history
                    </p>
                </div>

                {/* Tabs and Filters */}
                <div className="mb-6 space-y-4">
                    {/* Tab Buttons */}
                    <div className="flex gap-2 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            All Transactions
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'all' ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                {transactions.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('purchases')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'purchases'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            Purchases
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'purchases' ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                {transactions.filter(t => t.buyerId === user?._id || t.buyerId?._id === user?._id).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'sales'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            Sales
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'sales' ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                {transactions.filter(t => t.sellerId === user?._id || t.sellerId?._id === user?._id).length}
                            </span>
                        </button>
                    </div>

                    {/* Date Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <span className="text-sm text-gray-600 py-2 font-medium">Filter by date:</span>
                        {[
                            { value: 'all', label: 'All Time', icon: '📅' },
                            { value: 'today', label: 'Today', icon: '📆' },
                            { value: 'week', label: 'This Week', icon: '📊' },
                            { value: 'month', label: 'This Month', icon: '📈' }
                        ].map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setDateFilter(filter.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5 ${dateFilter === filter.value
                                    ? 'bg-gray-800 text-white shadow-md transform scale-105'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <span>{filter.icon}</span>
                                <span className="font-medium">{filter.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <span className="text-sm text-gray-600 py-2 font-medium">Filter by status:</span>
                        {[
                            { value: 'all', label: 'All', icon: '📋' },
                            { value: 'pending', label: 'Pending', icon: '⏳' },
                            { value: 'processing', label: 'Processing', icon: '⚡' },
                            { value: 'completed', label: 'Completed', icon: '✓' },
                            { value: 'failed', label: 'Failed', icon: '✗' },
                            { value: 'refunded', label: 'Refunded', icon: '↩' }
                        ].map(filter => {
                            const count = filter.value === 'all'
                                ? transactions.length
                                : transactions.filter(t => t.paymentStatus === filter.value).length;

                            return (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5 ${statusFilter === filter.value
                                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <span>{filter.icon}</span>
                                    <span className="font-medium">{filter.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${statusFilter === filter.value
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error Message */}
                {error && !showDisputeModal && (
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

                {/* Transactions List */}
                {!loading && paginatedTransactions.length > 0 && (
                    <div className="space-y-4">
                        {paginatedTransactions.map((transaction) => {
                            const statusBadge = getStatusBadge(transaction.paymentStatus);
                            const isBuyer = transaction.buyerId === user?._id || transaction.buyerId?._id === user?._id;
                            const isHolding = transaction.paymentStatus === 'holding';
                            const coupon = transaction.coupon || transaction.couponId;

                            return (
                                <div
                                    key={transaction._id}
                                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4 sm:p-6 border border-gray-200"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Left Section - Transaction Info */}
                                        <div className="flex-1 space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">
                                                        {coupon?.storeName || coupon?.title || 'Coupon'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {isBuyer ? 'Purchased from' : 'Sold to'}{' '}
                                                        <span className="font-medium">
                                                            {isBuyer
                                                                ? transaction.sellerId?.name || transaction.seller?.name || 'Unknown'
                                                                : transaction.buyerId?.name || transaction.buyer?.name || 'Unknown'}
                                                        </span>
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.color} flex items-center gap-1`}>
                                                    <span>{statusBadge.icon}</span>
                                                    <span>{statusBadge.label}</span>
                                                </span>
                                            </div>

                                            {/* Transaction Details */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Amount:</span>
                                                    <span className="ml-2 font-bold text-blue-600">₹{transaction.amount}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Date:</span>
                                                    <span className="ml-2 font-medium text-gray-700">
                                                        {formatDate(transaction.createdAt)}
                                                    </span>
                                                </div>
                                                {transaction.stripePaymentIntentId && (
                                                    <div>
                                                        <span className="text-gray-500">Payment ID:</span>
                                                        <span className="ml-2 font-mono text-xs text-gray-700">
                                                            {maskPaymentId(transaction.stripePaymentIntentId)}
                                                        </span>
                                                    </div>
                                                )}
                                                {isHolding && transaction.expiresAt && (
                                                    <div>
                                                        <span className="text-gray-500">Time Left:</span>
                                                        <span className="ml-2">
                                                            <TransactionTimer transaction={transaction} />
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Coupon Code Display (for completed purchases) */}
                                            {isBuyer && (transaction.paymentStatus === 'released' || transaction.paymentStatus === 'completed') && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <p className="text-xs text-gray-600 mb-1">Your Coupon Code:</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-lg font-mono font-bold text-blue-600">
                                                            {coupon?.couponCode || 'N/A'}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(coupon?.couponCode || '');
                                                                alert('Coupon code copied!');
                                                            }}
                                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            📋 Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Dispute Reason */}
                                            {transaction.paymentStatus === 'refunded' && transaction.disputeReason && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-red-700 mb-1">Dispute Reason:</p>
                                                    <p className="text-sm text-red-600">{transaction.disputeReason}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Section - Actions */}
                                        {isBuyer && isHolding && (
                                            <div className="lg:w-48">
                                                <button
                                                    onClick={() => handleOpenDispute(transaction)}
                                                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
                                                >
                                                    🚨 Dispute
                                                </button>
                                                <p className="text-xs text-gray-500 mt-2 text-center">
                                                    Report if coupon doesn't work
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredTransactions.length === 0 && (
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
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                No Transactions Found
                            </h3>
                            <p className="text-gray-600">
                                {activeTab === 'purchases'
                                    ? "You haven't purchased any coupons yet."
                                    : activeTab === 'sales'
                                        ? "You haven't sold any coupons yet."
                                        : "You don't have any transactions yet."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Dispute Modal */}
            {showDisputeModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Report Issue</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Please describe the issue with this coupon. Your payment will be refunded if the dispute is valid.
                            </p>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <textarea
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                placeholder="e.g., Code doesn't work, already used, expired, etc."
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDisputeModal(false);
                                        setSelectedTransaction(null);
                                        setDisputeReason('');
                                        setError('');
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitDispute}
                                    disabled={disputing || !disputeReason.trim()}
                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {disputing ? 'Submitting...' : 'Submit Dispute'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
