import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar      from './components/layout/Navbar';
import Footer      from './components/layout/Footer';

import Home        from './pages/Home';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import Profile     from './pages/Profile';
import History     from './pages/History';
import Pricing     from './pages/Pricing';
import About       from './pages/About';
import Privacy     from './pages/Privacy';
import Tos         from './pages/Tos';
import Contact     from './pages/Contact';
import ToolPage    from './pages/ToolPage';
import NotFound    from './pages/NotFound';

// ── Private Route ──
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><div className="spinner"/></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// ── Guest Route (redirect if logged in) ──
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/pricing"   element={<Pricing />} />
        <Route path="/about"     element={<About />} />
        <Route path="/privacy"   element={<Privacy />} />
        <Route path="/terms"     element={<Tos />} />
        <Route path="/contact"   element={<Contact />} />
        <Route path="/tools/:slug" element={<ToolPage />} />
        <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
