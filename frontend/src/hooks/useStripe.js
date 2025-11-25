import { useCallback } from 'react';

/**
 * Custom hook for integrating Stripe payment gateway
 * Redirects to Stripe Checkout using session URL
 */
const useStripe = () => {
    /**
     * Redirects to Stripe Checkout
     * @param {Object} orderData - Order details from backend
     * @param {string} orderData.sessionUrl - Stripe Checkout Session URL
     * @param {Function} onSuccess - Success callback (not used for redirect)
     * @param {Function} onFailure - Failure callback
     */
    const openCheckout = useCallback(async (orderData, onSuccess, onFailure) => {
        try {
            console.log('🔵 openCheckout called');
            console.log('Order data:', orderData);

            const { sessionUrl } = orderData;

            if (!sessionUrl) {
                console.error('❌ Session URL is missing!');
                throw new Error('Session URL is missing from payment response');
            }

            console.log('✅ Session URL found:', sessionUrl);
            console.log('🔄 Redirecting to Stripe Checkout...');

            // Direct redirect to Stripe Checkout URL
            window.location.href = sessionUrl;

        } catch (error) {
            console.error('❌ Error in openCheckout:', error);
            if (onFailure) {
                onFailure({
                    message: error.message || 'Failed to open payment checkout'
                });
            }
        }
    }, []);

    return {
        openCheckout
    };
};

export default useStripe;
