import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Restaurants from './pages/Restaurants.jsx';
import Riders from './pages/Riders.jsx';
import Users from './pages/Users.jsx';
import Orders from './pages/Orders.jsx';
import Settings from './pages/Settings.jsx';
import Payouts from './pages/Payouts.jsx';
import Layout from './components/Layout.jsx';

function isAuthed() {
  return !!localStorage.getItem('saaha_admin_token');
}

function Protected({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="restaurants" element={<Restaurants />} />
        <Route path="riders" element={<Riders />} />
        <Route path="users" element={<Users />} />
        <Route path="orders" element={<Orders />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
