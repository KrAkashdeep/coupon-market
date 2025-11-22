import { useNavigate } from 'react-router-dom';

const CouponCard = ({ coupon, onBuy, onDelete, loading }) => {
  const navigate = useNavigate();
  // Format the expiry date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if coupon is expired
  const isExpired = new Date(coupon.expiryDate) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 flex flex-col h-full">
      {/* Card Header with Badge */}
      <div
        className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
        onClick={() => navigate(`/coupons/${coupon._id}`)}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex-1 break-words">{coupon.title}</h3>
          <span
            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${coupon.isSold
              ? 'bg-gray-200 text-gray-700'
              : 'bg-green-100 text-green-700'
              }`}
          >
            {coupon.isSold ? 'Sold' : 'Available'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 font-medium">{coupon.storeName}</p>
      </div>

      {/* Card Body */}
      <div
        className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col cursor-pointer"
        onClick={() => navigate(`/coupons/${coupon._id}`)}
      >
        {/* Description */}
        {coupon.description && (
          <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{coupon.description}</p>
        )}

        {/* Discount Badge */}
        <div className="flex items-center space-x-2">
          <div className="bg-orange-100 text-orange-700 px-2 sm:px-3 py-1 rounded-lg font-bold text-base sm:text-lg">
            {coupon.discountPercent ? `${coupon.discountPercent}% OFF` : coupon.discountAmount ? `₹${coupon.discountAmount} OFF` : 'Discount'}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 text-xs sm:text-sm flex-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Price:</span>
            <span className="text-lg sm:text-xl font-bold text-blue-600">₹{coupon.price}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Expires:</span>
            <span className={`font-medium text-right ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
              {formatDate(coupon.expiryDate)}
              {isExpired && ' (Expired)'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {(onBuy || onDelete) && (
          <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
            {onBuy && !coupon.isSold && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(coupon._id);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base shadow-md hover:shadow-lg"
                disabled={isExpired || loading}
              >
                {loading ? 'Processing...' : isExpired ? 'Expired' : '🛒 Buy Now'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(coupon._id);
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponCard;
