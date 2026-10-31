import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Forgot from './pages/Forgot';
import Reset from './pages/Reset';
import Placeholder from './pages/Placeholder';
import Dashboard from './pages/Dashboard'; 
import Subscriptions from './pages/Subscriptions';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Payments from './pages/Payments';

const P = t => <Placeholder title={t} />;

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading...</div>;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset/:token" element={<Reset />} />

      {/* admin and staff */}
      <Route element={<ProtectedRoute roles={['admin', 'staff']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/customers" element={P('Customers')} />
        </Route>
      </Route>

      {/* admin only */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/products" element={P('Products')} />
          <Route path="/plans" element={P('Plans')} />
          <Route path="/taxes" element={P('Taxes')} />
          <Route path="/discounts" element={P('Discounts')} />
          <Route path="/templates" element={P('Quotation templates')} />
          <Route path="/staff" element={P('Staff')} />
        </Route>
      </Route>

      {/* customer portal */}
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<Layout />}>
          <Route path="/portal" element={P('Overview')} />
          <Route path="/portal/subscriptions" element={P('My subscriptions')} />
          <Route path="/portal/invoices" element={P('My invoices')} />
          <Route path="/portal/payments" element={P('My payments')} />
        </Route>
      </Route>

      <Route path="*" element={<Root />} />
    </Routes>
  );
}