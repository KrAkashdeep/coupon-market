import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

const PurchaseConfirmationModal = ({ isOpen, onClose, transaction, onConfirm, onDispute }) => {
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [disputing, setDisputing] = useState(false);
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [error, setError] = useState('');

    // Calculate time remaining
    useEffect(() => {
        if (!isOpen || !transaction?.expiresAt) return;

        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const expiresAt = new Date(transaction.expiresAt).getTime();
            const remaining = Math.max(0, expiresAt - now);
            setTimeRemaining(remaining);

            // Show warning when 5 minutes remain
            if (remaining <= 5 * 60 * 1000 && remaining > 0) {
                setShowWarning(true);
            }

            // Auto-confirm when timer expires
            if (remaining === 0 && transaction.paymentStatus === 'holding') {
                handleAutoConfirm();
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [isOpen, transaction]);

    // Format time as MM:SS
    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Get timer color based on time remaining
    const getTimerColor = () => {
        if (timeRemaining <= 1 * 60 * 1000) return 'text-red-600'; // Red at 1 minute
        if (timeRemaining <= 5 * 60 * 1000) return 'text-orange-600'; // Orange at 5 minutes
        return 'text-green-600'; // Green otherwise
    };

    // Auto-confirm transaction
    const handleAutoConfirm = async () => {
        try {
            await axiosInstance.post(`/api/transactions/confirm/${transaction._id}`);
            if (onConfirm) onConfirm();
            onClose();
        } catch (err) {
            console.error('Auto-confirm failed:', err);
        }
    };

    // Handle confirm button click
    const handleConfirm = async () => {
        try {
            setConfirming(true);
            setError('');

            const response = await axiosInstance.post(`/api/transactions/confirm/${transaction._id}`);

            if (response.data.success) {
                if (onConfirm) onConfirm();
                onClose();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to confirm transaction';
            setError(errorMessage);
            console.error('Error confirming transaction:', err);
        } finally {
            setConfirming(false);
        }
    };

    // Handle dispute submission
    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            setError('Please provide a reason for the dispute');
            return;
        }

        try {
            setDisputing(true);
            setError('');

            const response = await axiosInstance.post(`/api/transactions/dispute/${transaction._id}`, {
                disputeReason: disputeReason.trim()
            });

            if (response.data.success) {
                if (onDispute) onDispute();
                onClose();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit dispute';
            setError(errorMessage);
            console.error('Error disputing transaction:', err);
        } finally {
            setDisputing(false);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Purchase Successful!</h2>
                            <p className="text-blue-100">Your coupon code is ready to use</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Timer Section */}
                    <div className={`text-center p-4 rounded-lg border-2 ${showWarning ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-300'
                        }`}>
                        <p className="text-sm text-gray-600 mb-2">Time remaining to verify</p>
                        <div className={`text-5xl font-bold ${getTimerColor()} ${timeRemaining <= 1 * 60 * 1000 ? 'animate-pulse' : ''
                            }`}>
                            {formatTime(timeRemaining)}
                        </div>
                        {showWarning && timeRemaining > 0 && (
                            <p className="text-orange-600 text-sm mt-2 font-medium">
                                ⚠️ Less than 5 minutes remaining!
                            </p>
                        )}
                        {timeRemaining === 0 && (
                            <p className="text-gray-600 text-sm mt-2">
                                Transaction auto-confirmed
                            </p>
                        )}
                    </div>

                    {/* Coupon Code Display */}
                    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                        <p className="text-sm text-gray-600 mb-2 text-center">Your Coupon Code</p>
                        <div className="bg-white border-2 border-dashed border-blue-400 rounded-lg p-4">
                            <p className="text-3xl font-mono font-bold text-center text-blue-600 tracking-wider">
                                {transaction.couponCode || transaction.coupon?.code}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(transaction.couponCode || transaction.coupon?.code);
                                alert('Coupon code copied to clipboard!');
                            }}
                            className="mt-3 w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            📋 Click to copy code
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How to verify your coupon
                        </h3>
                        <ol className="text-sm text-gray-700 space-y-2 ml-7 list-decimal">
                            <li>Copy the coupon code above</li>
                            <li>Go to the store's website and add items to your cart</li>
                            <li>Apply the coupon code at checkout</li>
                            <li>If it works, click "Confirm Working" below</li>
                            <li>If it doesn't work, click "Report Issue" to get a refund</li>
                        </ol>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!showDisputeForm && timeRemaining > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleConfirm}
                                disabled={confirming}
                                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {confirming ? 'Confirming...' : '✓ Confirm Working'}
                            </button>
                            <button
                                onClick={() => setShowDisputeForm(true)}
                                disabled={disputing}
                                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                ✗ Report Issue
                            </button>
                        </div>
                    )}

                    {/* Dispute Form */}
                    {showDisputeForm && timeRemaining > 0 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Please describe the issue with this coupon
                                </label>
                                <textarea
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    placeholder="e.g., Code doesn't work, already used, expired, etc."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setShowDisputeForm(false);
                                        setDisputeReason('');
                                        setError('');
                                    }}
                                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDispute}
                                    disabled={disputing || !disputeReason.trim()}
                                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {disputing ? 'Submitting...' : 'Submit Dispute'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Auto-confirm notice */}
                    {timeRemaining > 0 && (
                        <p className="text-xs text-gray-500 text-center">
                            If you don't take any action, the transaction will be automatically confirmed when the timer expires.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseConfirmationModal;
