import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="mb-6">
                    <h1 className="text-9xl font-bold text-indigo-600">404</h1>
                    <div className="text-6xl mb-4">🔍</div>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Page Not Found
                </h2>

                <p className="text-gray-600 mb-8">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                    >
                        Go to Home
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
