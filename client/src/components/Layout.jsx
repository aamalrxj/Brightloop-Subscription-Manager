import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const MENUS = {
  admin: [
    ['Dashboard', '/dashboard'], ['Subscriptions', '/subscriptions'], ['Invoices', '/invoices'],
    ['Payments', '/payments'], ['Customers', '/customers'],
    ['Products', '/products'], ['Plans', '/plans'], ['Taxes', '/taxes'],
    ['Discounts', '/discounts'], ['Templates', '/templates'], ['Staff', '/staff'],
  ],
  staff: [
    ['Dashboard', '/dashboard'], ['Subscriptions', '/subscriptions'], ['Invoices', '/invoices'],
    ['Payments', '/payments'], ['Customers', '/customers'],
  ],
  customer: [
    ['Overview', '/portal'], ['My subscriptions', '/portal/subscriptions'],
    ['My invoices', '/portal/invoices'], ['My payments', '/portal/payments'],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const out = async () => { await logout(); nav('/login'); };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Brightloop</div>
        <nav>
          {MENUS[user.role].map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/portal'}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="muted">{user.name} <span className="badge">{user.role}</span></span>
          <button className="btn ghost" onClick={out}>Log out</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}