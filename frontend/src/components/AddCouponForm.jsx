import { useState } from 'react';
import axiosInstance from '../api/axios';

const AddCouponForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    storeName: '',
    description: '',
    discountPercent: '',
    expiryDate: '',
    price: '',
    code: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');

  // Handle input changes
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

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Check all required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    }

    // Validate discount percentage
    if (!formData.discountPercent) {
      newErrors.discountPercent = 'Discount percentage is required';
    } else {
      const discount = Number(formData.discountPercent);
      if (isNaN(discount) || discount < 1 || discount > 100) {
        newErrors.discountPercent = 'Discount must be between 1 and 100';
      }
    }

    // Validate price
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else {
      const price = Number(formData.price);
      if (isNaN(price) || price < 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }

    // Validate expiry date
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const expiryDate = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (expiryDate < today) {
        newErrors.expiryDate = 'Expiry date must be in the future';
      }
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

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/coupons/create', {
        title: formData.title.trim(),
        storeName: formData.storeName.trim(),
        description: formData.description.trim(),
        discountPercent: Number(formData.discountPercent),
        expiryDate: formData.expiryDate,
        price: Number(formData.price),
        code: formData.code.trim()
      });

      // Show success message
      setSuccessMessage('Coupon created successfully!');

      // Reset form
      setFormData({
        title: '',
        storeName: '',
        description: '',
        discountPercent: '',
        expiryDate: '',
        price: '',
        code: ''
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(response.data.coupon);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error creating coupon:', error);
      
      // Display error message
      if (error.response && error.response.data && error.response.data.error) {
        setApiError(error.response.data.error);
      } else {
        setApiError('Failed to create coupon. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Add New Coupon</h2>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* API Error Message */}
      {apiError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 50% Off Electronics"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Store Name */}
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
            Store Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="storeName"
            name="storeName"
            value={formData.storeName}
            onChange={handleChange}
            className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
              errors.storeName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Amazon, Best Buy"
          />
          {errors.storeName && (
            <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe what this coupon offers..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Discount Percent and Price - Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Discount Percent */}
          <div>
            <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 mb-1">
              Discount (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="discountPercent"
              name="discountPercent"
              value={formData.discountPercent}
              onChange={handleChange}
              min="1"
              max="100"
              className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                errors.discountPercent ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 50"
            />
            {errors.discountPercent && (
              <p className="mt-1 text-sm text-red-600">{errors.discountPercent}</p>
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
              className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 10.00"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>
        </div>

        {/* Expiry Date and Coupon Code - Two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                errors.expiryDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.expiryDate && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
            )}
          </div>

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
              className={`w-full px-3 sm:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., SAVE50"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 sm:py-3 px-4 rounded-lg font-medium text-white transition-colors text-sm sm:text-base ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating Coupon...' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCouponForm;
