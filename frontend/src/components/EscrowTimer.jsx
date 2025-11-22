import { useState, useEffect } from 'react';

const EscrowTimer = ({ expiresAt, onExpire, className = '' }) => {
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [hasExpired, setHasExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) return;

        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const expiresAtTime = new Date(expiresAt).getTime();
            const remaining = Math.max(0, expiresAtTime - now);

            setTimeRemaining(remaining);

            // Emit event when timer expires
            if (remaining === 0 && !hasExpired) {
                setHasExpired(true);
                if (onExpire) {
                    onExpire();
                }
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, hasExpired, onExpire]);

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

    // Show pulsing animation for urgency (when 1 minute or less)
    const shouldPulse = timeRemaining <= 1 * 60 * 1000 && timeRemaining > 0;

    return (
        <div className={`text-center ${className}`}>
            <div
                className={`text-5xl font-bold ${getTimerColor()} ${shouldPulse ? 'animate-pulse' : ''}`}
            >
                {formatTime(timeRemaining)}
            </div>
        </div>
    );
};

export default EscrowTimer;
