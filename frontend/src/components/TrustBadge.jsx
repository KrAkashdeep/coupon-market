const TrustBadge = ({ trustScore, warningsCount }) => {
    // Determine badge type based on trust score and warnings
    const getBadgeInfo = () => {
        if (warningsCount >= 2) {
            return {
                label: 'Warning Flag',
                color: 'bg-red-100 text-red-700 border-red-300',
                icon: '⚠️'
            };
        }
        if (trustScore > 90) {
            return {
                label: 'Gold Seller',
                color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: '⭐'
            };
        }
        if (trustScore >= 70) {
            return {
                label: 'Verified Seller',
                color: 'bg-green-100 text-green-700 border-green-300',
                icon: '✓'
            };
        }
        return {
            label: 'New Seller',
            color: 'bg-blue-100 text-blue-700 border-blue-300',
            icon: '🆕'
        };
    };

    const badgeInfo = getBadgeInfo();

    return (
        <div className="relative group inline-block">
            <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badgeInfo.color}`}
            >
                <span>{badgeInfo.icon}</span>
                <span>{badgeInfo.label}</span>
            </span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="text-center">
                    <div>Trust Score: {trustScore}/100</div>
                    <div>Warnings: {warningsCount}</div>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
            </div>
        </div>
    );
};

export default TrustBadge;
