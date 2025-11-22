import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      
      // Store in state
      setToken(newToken);
      setUser(newUser);
      
      // Persist to localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      return { success: true };
    } catch (error) {
      // Handle different error scenarios
      let message = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        message = error.response.data?.error || 'Invalid credentials';
      } else if (error.request) {
        // Request made but no response
        message = 'Network error. Please check your connection.';
      }
      
      console.error('Login error:', error);
      return { success: false, error: message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/signup`, userData);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      // Handle different error scenarios
      let message = 'Signup failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        message = error.response.data?.error || 'Unable to create account';
      } else if (error.request) {
        // Request made but no response
        message = 'Network error. Please check your connection.';
      }
      
      console.error('Signup error:', error);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    // Clear state
    setToken(null);
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
