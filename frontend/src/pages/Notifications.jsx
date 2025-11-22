import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { Bell, Check, Trash2, Filter } from 'lucide-react';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [markingAllRead, setMarkingAllRead] = useState(false);
    const { isAuthenticated } = useAuth();

    const itemsPerPage = 20;

    // Notification types for filtering
    const notificationTypes = [
        { value: 'all', label: 'All', icon: '🔔' },
        { value: 'purchase', label: 'Purchases', icon: '🛒' },
        { value: 'sale', label: 'Sales', icon: '💰' },
        { value: 'warning', label: 'Warnings', icon: '⚠️' },
        { value: 'ban', label: 'Bans', icon: '🚫' },
        { value: 'approval', label: 'Approvals', icon: '✅' },
        { value: 'rejection', label: 'Rejections', icon: '❌' }
    ];

    // Fetch notifications
    const fetchNotifications = async (page = 1) => {
        try {
            setLoading(true);
            setError('');

            const response = await axiosInstance.get('/api/notifications', {
                params: {
                    page,
                    limit: itemsPerPage,
                    type: selectedType !== 'all' ? selectedType : undefined
                }
            });

            if (response.data.success) {
                const newNotifications = response.data.notifications || [];

                if (page === 1) {
                    setNotifications(newNotifications);
                } else {
                    setNotifications(prev => [...prev, ...newNotifications]);
                }

                setHasMore(newNotifications.length === itemsPerPage);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message ||
                err.response?.data?.message ||
                'Failed to load notifications';
            setError(errorMessage);
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated) {
            setCurrentPage(1);
            fetchNotifications(1);
        }
    }, [isAuthenticated, selectedType]);

    // Filter notifications by type
    useEffect(() => {
        if (selectedType === 'all') {
            setFilteredNotifications(notifications);
        } else {
            setFilteredNotifications(
                notifications.filter(notif => notif.type === selectedType)
            );
        }
    }, [notifications, selectedType]);

    // Load more notifications (pagination)
    const loadMore = () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchNotifications(nextPage);
    };

    // Mark single notification as read
    const markAsRead = async (notificationId) => {
        try {
            const response = await axiosInstance.patch(`/api/notifications/read/${notificationId}`);

            if (response.data.success) {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif._id === notificationId ? { ...notif, isRead: true } : notif
                    )
                );
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            setMarkingAllRead(true);
            const response = await axiosInstance.patch('/api/notifications/read-all');

            if (response.data.success) {
                setNotifications(prev =>
                    prev.map(notif => ({ ...notif, isRead: true }))
                );
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message ||
                err.response?.data?.message ||
                'Failed to mark all as read';
            setError(errorMessage);
            console.error('Error marking all as read:', err);
        } finally {
            setMarkingAllRead(false);
        }
    };

    // Delete notification
    const deleteNotification = async (notificationId) => {
        try {
            const response = await axiosInstance.delete(`/api/notifications/${notificationId}`);

            if (response.data.success) {
                setNotifications(prev =>
                    prev.filter(notif => notif._id !== notificationId)
                );
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message ||
                err.response?.data?.message ||
                'Failed to delete notification';
            setError(errorMessage);
            console.error('Error deleting notification:', err);
        }
    };

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

    // Format date for grouping
    const formatDateGroup = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Reset time for comparison
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

        if (dateOnly.getTime() === todayOnly.getTime()) {
            return 'Today';
        } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group notifications by date
    const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
        const dateGroup = formatDateGroup(notification.createdAt);
        if (!groups[dateGroup]) {
            groups[dateGroup] = [];
        }
        groups[dateGroup].push(notification);
        return groups;
    }, {});

    // Get unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                                Notifications
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                {unreadCount > 0 ? (
                                    <span>
                                        You have <span className="font-semibold text-blue-600">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    'All caught up!'
                                )}
                            </p>
                        </div>

                        {/* Mark All as Read Button */}
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={markingAllRead}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                            >
                                <Check className="w-4 h-4" />
                                {markingAllRead ? 'Marking...' : 'Mark All Read'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Filter by type:</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {notificationTypes.map(type => {
                            const count = type.value === 'all'
                                ? notifications.length
                                : notifications.filter(n => n.type === type.value).length;

                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setSelectedType(type.value)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${selectedType === type.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    <span>{type.icon}</span>
                                    <span>{type.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedType === type.value ? 'bg-blue-500' : 'bg-gray-200'
                                        }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && currentPage === 1 && (
                    <div className="flex justify-center items-center py-20">
                        <Loader />
                    </div>
                )}

                {/* Notifications List */}
                {!loading && Object.keys(groupedNotifications).length > 0 && (
                    <div className="space-y-6">
                        {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                            <div key={dateGroup}>
                                {/* Date Header */}
                                <h2 className="text-lg font-bold text-gray-800 mb-3 sticky top-0 bg-gray-50 py-2 z-10">
                                    {dateGroup}
                                </h2>

                                {/* Notifications for this date */}
                                <div className="space-y-3">
                                    {notifs.map((notification) => (
                                        <div
                                            key={notification._id}
                                            className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4 border ${!notification.isRead
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className="flex-shrink-0 text-3xl">
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <h3 className="text-base font-semibold text-gray-900 mb-1">
                                                                {notification.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-700 mb-2">
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatTime(notification.createdAt)}
                                                            </p>
                                                        </div>

                                                        {/* Unread Indicator */}
                                                        {!notification.isRead && (
                                                            <div className="flex-shrink-0">
                                                                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex-shrink-0 flex gap-2">
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={() => markAsRead(notification._id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification._id)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredNotifications.length === 0 && (
                    <div className="text-center py-12 sm:py-20">
                        <div className="bg-white rounded-lg shadow-md p-6 sm:p-12 max-w-md mx-auto">
                            <Bell className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                No Notifications
                            </h3>
                            <p className="text-gray-600">
                                {selectedType === 'all'
                                    ? "You don't have any notifications yet."
                                    : `No ${notificationTypes.find(t => t.value === selectedType)?.label.toLowerCase()} notifications.`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Load More Button */}
                {!loading && hasMore && filteredNotifications.length >= itemsPerPage && (
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={loadMore}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                            Load More
                        </button>
                    </div>
                )}

                {/* Loading More Indicator */}
                {loading && currentPage > 1 && (
                    <div className="mt-8 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
