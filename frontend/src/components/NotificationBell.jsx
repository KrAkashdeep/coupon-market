import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch notifications from API
    const fetchNotifications = async () => {
        if (!isAuthenticated) return;

        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/notifications', {
                params: { limit: 5 }
            });

            if (response.data.success) {
                setNotifications(response.data.notifications);
                setUnreadCount(response.data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const response = await axiosInstance.patch(`/api/notifications/read/${notificationId}`);

            if (response.data.success) {
                // Update local state
                setNotifications(prev =>
                    prev.map(notif =>
                        notif._id === notificationId ? { ...notif, isRead: true } : notif
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Fetch notifications on mount and set up auto-refresh
    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();

            // Auto-refresh every 30 seconds
            const intervalId = setInterval(fetchNotifications, 30000);

            return () => clearInterval(intervalId);
        }
    }, [isAuthenticated]);

    // Don't render if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        const iconMap = {
            purchase: '🛒',
            sale: '💰',
            warning: '⚠️',
            ban: '🚫',
            approval: '✅',
            rejection: '❌'
        };
        return iconMap[type] || '🔔';
    };

    // Format time ago
    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={toggleDropdown}
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />

                {/* Unread Count Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2">Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => {
                                            if (!notification.isRead) {
                                                markAsRead(notification._id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start space-x-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 text-2xl">
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notification.isRead && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200">
                            <Link
                                to="/notifications"
                                onClick={() => setIsDropdownOpen(false)}
                                className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
