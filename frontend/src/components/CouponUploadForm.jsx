import { useState } from 'react';
import axiosInstance from '../api/axios';

const CouponUploadForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        code: '',
        brand: '',
        discountPercent: '',
        discountAmount: '',
        expiryDate: '',
        price: '',
        screenshot: null
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const [apiError, setApiError] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    // Handle text input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Handle file input change
    const handleFileChange = (e) => {
        const file = e.target.files[0];

        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setErrors(prev => ({
                    ...prev,
                    screenshot: 'Only JPEG, PNG, or WebP images are allowed'
                }));
                return;
            }

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                setErrors(prev => ({
                    ...prev,
                    screenshot: 'Image size must not exceed 5MB'
                }));
                return;
            }

            // Clear any previous errors
            setErrors(prev => ({
                ...prev,
                screenshot: ''
            }));

            // Set file in form data
            setFormData(prev => ({
                ...prev,
                screenshot: file
            }));

            // Create image preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate coupon code
        if (!formData.code.trim()) {
            newErrors.code = 'Coupon code is required';
        } else if (!/^[a-zA-Z0-9]+$/.test(formData.code.trim())) {
            newErrors.code = 'Coupon code must contain only alphanumeric characters';
        }

        // Validate brand
        if (!formData.brand.trim()) {
            newErrors.brand = 'Brand name is required';
        }

        // Validate discount (at least one must be filled)
        if (!formData.discountPercent && !formData.discountAmount) {
            newErrors.discount = 'Please enter either discount percentage or amount';
        }

        // Validate expiry date
        if (!formData.expiryDate) {
            newErrors.expiryDate = 'Expiry date is required';
        } else {
            const expiryDate = new Date(formData.expiryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (expiryDate <= today) {
                newErrors.expiryDate = 'Expiry date must be in the future';
            }
        }

        // Validate price
        if (!formData.price) {
            newErrors.price = 'Price is required';
        } else {
            const price = Number(formData.price);
            if (isNaN(price) || price <= 0) {
                newErrors.price = 'Price must be a positive number';
            }
        }

        // Validate screenshot
        if (!formData.screenshot) {
            newErrors.screenshot = 'Screenshot is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous messages
        setSuccessMessage('');
        setApiError('');
        setUploadProgress(0);

        // Debug: Log form data
        console.log('=== FORM SUBMISSION DEBUG ===');
        console.log('Form Data:', formData);
        console.log('Code:', formData.code);
        console.log('Brand:', formData.brand);
        console.log('Discount %:', formData.discountPercent);
        console.log('Discount ₹:', formData.discountAmount);
        console.log('Expiry:', formData.expiryDate);
        console.log('Price:', formData.price);
        console.log('Screenshot:', formData.screenshot);

        // Validate form
        if (!validateForm()) {
            // Show which fields are missing
            const missingFields = [];
            if (!formData.code.trim()) missingFields.push('code');
            if (!formData.brand.trim()) missingFields.push('brand');
            if (!formData.discountPercent && !formData.discountAmount) missingFields.push('discount');
            if (!formData.expiryDate) missingFields.push('expiryDate');
            if (!formData.price) missingFields.push('price');
            if (!formData.screenshot) missingFields.push('screenshot');

            console.log('❌ Validation failed. Missing:', missingFields);
            setApiError(`All fields are required: ${missingFields.join(', ')}`);
            return;
        }

        console.log('✅ Validation passed!');

        setLoading(true);

        try {
            // Create FormData for multipart/form-data
            const formDataToSend = new FormData();
            formDataToSend.append('code', formData.code.trim());
            formDataToSend.append('brand', formData.brand.trim());

            // Auto-generate title and description
            const discountText = formData.discountPercent
                ? `${formData.discountPercent}% off`
                : formData.discountAmount
                    ? `₹${formData.discountAmount} off`
                    : 'Discount';
            formDataToSend.append('title', `${discountText} at ${formData.brand.trim()}`);
            formDataToSend.append('description', `Get ${discountText} on your purchase`);

            // Only send the discount field that was filled
            if (formData.discountPercent) {
                formDataToSend.append('discountPercent', formData.discountPercent);
            }
            if (formData.discountAmount) {
                formDataToSend.append('discountAmount', formData.discountAmount);
            }

            formDataToSend.append('expiryDate', formData.expiryDate);
            formDataToSend.append('price', formData.price);
            formDataToSend.append('screenshot', formData.screenshot);

            // Upload with progress tracking
            const response = await axiosInstance.post('/api/coupons/upload', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            // Show success message
            setSuccessMessage(`Coupon uploaded successfully! Status: ${response.data.coupon.status}`);

            // Reset form
            setFormData({
                code: '',
                brand: '',
                discountPercent: '',
                discountAmount: '',
                expiryDate: '',
                price: '',
                screenshot: null
            });
            setImagePreview(null);
            setUploadProgress(0);

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess(response.data.coupon);
            }

            // Clear success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

        } catch (error) {
            console.error('Error uploading coupon:', error);

            // Display error message
            if (error.response && error.response.data && error.response.data.error) {
                const errorData = error.response.data.error;
                // Handle error object or string
                const errorMessage = typeof errorData === 'string'
                    ? errorData
                    : errorData.message || errorData.details || JSON.stringify(errorData);
                setApiError(errorMessage);
            } else {
                setApiError('Failed to upload coupon. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Check if form is valid for submit button
    const isFormValid = () => {
        // Check all required fields are filled
        if (!formData.code.trim()) return false;
        if (!formData.brand.trim()) return false;
        if (!formData.expiryDate) return false;
        if (!formData.price) return false;
        if (!formData.screenshot) return false;

        // At least one discount type must be filled
        if (!formData.discountPercent && !formData.discountAmount) return false;

        // Check coupon code format
        if (!/^[a-zA-Z0-9]+$/.test(formData.code.trim())) return false;

        // Check discount percent if provided
        if (formData.discountPercent) {
            const discount = Number(formData.discountPercent);
            if (isNaN(discount) || discount < 1 || discount > 100) return false;
        }

        // Check discount amount if provided
        if (formData.discountAmount) {
            const amount = Number(formData.discountAmount);
            if (isNaN(amount) || amount <= 0) return false;
        }

        // Check expiry date is in future
        const expiryDate = new Date(formData.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate <= today) return false;

        // Check price is positive
        const price = Number(formData.price);
        if (isNaN(price) || price <= 0) return false;

        // All validations passed
        return true;
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Upload Coupon</h2>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="font-medium">{successMessage}</p>
                            <p className="text-sm mt-1">Your coupon is pending admin verification.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* API Error Message */}
            {apiError && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p>{apiError}</p>
                    </div>
                </div>
            )}



            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Coupon Code */}
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.code ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="e.g., SAVE50"
                        disabled={loading}
                    />
                    {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                    )}
                </div>

                {/* Brand */}
                <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                        Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="brand"
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.brand ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="e.g., Amazon, Nike, Starbucks"
                        disabled={loading}
                    />
                    {errors.brand && (
                        <p className="mt-1 text-sm text-red-600">{errors.brand}</p>
                    )}
                </div>

                {/* Discount - Percentage OR Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount <span className="text-red-500">*</span> <span className="text-gray-500 text-xs">(Fill at least one)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Discount Percent */}
                        <div>
                            <label htmlFor="discountPercent" className="block text-xs text-gray-600 mb-1">
                                Percentage (%)
                            </label>
                            <input
                                type="number"
                                id="discountPercent"
                                name="discountPercent"
                                value={formData.discountPercent}
                                onChange={handleChange}
                                min="1"
                                max="100"
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                                placeholder="e.g., 50"
                                disabled={loading}
                            />
                        </div>

                        {/* Discount Amount */}
                        <div>
                            <label htmlFor="discountAmount" className="block text-xs text-gray-600 mb-1">
                                Amount (₹)
                            </label>
                            <input
                                type="number"
                                id="discountAmount"
                                name="discountAmount"
                                value={formData.discountAmount}
                                onChange={handleChange}
                                min="1"
                                step="1"
                                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                                placeholder="e.g., 500"
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Enter either percentage (50%) or amount (₹500)</p>
                </div>

                {/* Price */}
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.price ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="e.g., 100.00"
                        disabled={loading}
                    />
                    {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">How much you're selling this coupon for</p>
                </div>

                {/* Expiry Date */}
                <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        id="expiryDate"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        disabled={loading}
                    />
                    {errors.expiryDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
                    )}
                </div>

                {/* Remove the old Price field that was here */}
                <div style={{ display: 'none' }}>
                    {/* Expiry Date */}
                    <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="expiryDate"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                                }`}
                            disabled={loading}
                        />
                        {errors.expiryDate && (
                            <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
                        )}
                    </div>

                    {/* Price */}
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                            Price ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.price ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="e.g., 10.00"
                            disabled={loading}
                        />
                        {errors.price && (
                            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                        )}
                    </div>
                </div>

                {/* Screenshot Upload */}
                <div>
                    <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Screenshot <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                        <input
                            type="file"
                            id="screenshot"
                            name="screenshot"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${errors.screenshot ? 'border-red-500' : 'border-gray-300'
                                }`}
                            disabled={loading}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Accepted formats: JPEG, PNG, WebP (Max size: 5MB)
                        </p>
                    </div>
                    {errors.screenshot && (
                        <p className="mt-1 text-sm text-red-600">{errors.screenshot}</p>
                    )}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                        <div className="relative inline-block">
                            <img
                                src={imagePreview}
                                alt="Coupon preview"
                                className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300 shadow-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setImagePreview(null);
                                    setFormData(prev => ({ ...prev, screenshot: null }));
                                    document.getElementById('screenshot').value = '';
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                disabled={loading}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Progress Bar */}
                {loading && uploadProgress > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                            <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !isFormValid()}
                        className={`w-full py-2 sm:py-3 px-4 rounded-lg font-medium text-white transition-colors text-sm sm:text-base ${loading || !isFormValid()
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? 'Uploading...' : 'Upload Coupon'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CouponUploadForm;
