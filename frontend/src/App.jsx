import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Coupons from './pages/Coupons';
import CouponDetails from './pages/CouponDetails';
import MyCoupons from './pages/MyCoupons';
import TransactionHistory from './pages/TransactionHistory';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCouponVerification from './pages/admin/AdminCouponVerification';
import AdminUsersManagement from './pages/admin/AdminUsersManagement';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/coupons/:id" element={<CouponDetails />} />
        <Route
          path="/my-coupons"
          element={
            <ProtectedRoute>
              <MyCoupons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coupon-verification"
          element={
            <AdminRoute>
              <AdminCouponVerification />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/user-management"
          element={
            <AdminRoute>
              <AdminUsersManagement />
            </AdminRoute>
          }
        />

        {/* 404 Catch-all route - must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
