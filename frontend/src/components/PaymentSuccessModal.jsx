import { useNavigate } from 'react-router-dom';

const PaymentSuccessModal = ({ isOpen, onClose, couponDetails, transactionDetails }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleViewMyCoupons = () => {
        onClose();
        navigate('/dashboard');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center mb-2">
                                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h2 className="text-2xl font-bold">Payment Successful!</h2>
                            </div>
                            <p className="text-green-100">Your coupon is ready to use</p>
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
                    {/* Success Message */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Purchase Complete
                        </h3>
                        <p className="text-gray-600">
                            Your payment has been processed successfully
                        </p>
                    </div>

                    {/* Coupon Code Display */}
                    {couponDetails?.couponCode && (
                        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                            <p className="text-sm text-gray-600 mb-2 text-center font-medium">Your Coupon Code</p>
                            <div className="bg-white border-2 border-dashed border-green-400 rounded-lg p-4">
                                <p className="text-3xl font-mono font-bold text-center text-green-600 tracking-wider break-all">
                                    {couponDetails.couponCode}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(couponDetails.couponCode);
                                    alert('Coupon code copied to clipboard!');
                                }}
                                className="mt-3 w-full text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Click to copy code
                            </button>
                        </div>
                    )}

                    {/* Coupon Screenshot */}
                    {couponDetails?.screenshotURL && (
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-3 font-medium">Coupon Screenshot</p>
                            <img
                                src={couponDetails.screenshotURL}
                                alt="Coupon Screenshot"
                                className="w-full rounded-lg border border-gray-200"
                            />
                        </div>
                    )}

                    {/* Coupon Details */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-bold text-gray-800 mb-3">Coupon Details</h4>
                        <div className="space-y-2 text-sm">
                            {couponDetails?.storeName && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Store:</span>
                                    <span className="font-medium text-gray-800">{couponDetails.storeName}</span>
                                </div>
                            )}
                            {couponDetails?.title && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Title:</span>
                                    <span className="font-medium text-gray-800">{couponDetails.title}</span>
                                </div>
                            )}
                            {(couponDetails?.discountPercent || couponDetails?.discountAmount) && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Discount:</span>
                                    <span className="font-medium text-green-600">
                                        {couponDetails.discountPercent
                                            ? `${couponDetails.discountPercent}% OFF`
                                            : `₹${couponDetails.discountAmount} OFF`}
                                    </span>
                                </div>
                            )}
                            {couponDetails?.expiryDate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Expires:</span>
                                    <span className="font-medium text-gray-800">
                                        {new Date(couponDetails.expiryDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                            {transactionDetails?.amount && (
                                <div className="flex justify-between pt-2 border-t border-blue-300">
                                    <span className="text-gray-600 font-medium">Amount Paid:</span>
                                    <span className="font-bold text-blue-600 text-lg">₹{transactionDetails.amount}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transaction Info */}
                    {transactionDetails?.id && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-bold text-gray-800 mb-2 text-sm">Transaction Information</h4>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Transaction ID:</span>
                                    <span className="font-mono text-gray-700">{transactionDetails.id}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How to use your coupon
                        </h4>
                        <ol className="text-sm text-gray-700 space-y-2 ml-7 list-decimal">
                            <li>Copy the coupon code above</li>
                            <li>Visit the store's website</li>
                            <li>Add items to your cart</li>
                            <li>Apply the coupon code at checkout</li>
                            <li>Enjoy your discount!</li>
                        </ol>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={handleViewMyCoupons}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold transition-colors"
                        >
                            View My Coupons
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-bold transition-colors"
                        >
                            Close
                        </button>
                    </div>

                    {/* Support Note */}
                    <p className="text-xs text-gray-500 text-center">
                        If you face any issues with the coupon, please contact support or report the issue from your dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessModal;
