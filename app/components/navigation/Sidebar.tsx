'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  activeView: string;
  start: string;
  end: string;
};

export function Sidebar({ activeView, start, end }: Props) {
  const router = useRouter();
  const query = `start=${start}&end=${end}`;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const navItems = [
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: '📊',
      href: `/?view=portfolio&${query}`,
      badge: 'Main',
    },
    {
      id: 'admob',
      label: 'AdMob',
      icon: '📱',
      href: `/?view=admob&${query}`,
    },
    {
      id: 'ads',
      label: 'Ads',
      icon: '🎯',
      href: `/?view=ads&${query}`,
    },
    {
      id: 'play-console',
      label: 'Play Console',
      icon: '🎮',
      href: `/?view=play-console&${query}`,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">GT</span>
        <span className="brand-badge">ANALYTICS</span>
      </div>

      <nav className="nav" aria-label="Main navigation">
        <p className="nav-label">Main Menu</p>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <nav className="nav nav-bottom" aria-label="Other navigation">
        <p className="nav-label">System</p>
        <a className="nav-item" href="#settings">
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">Settings</span>
        </a>
        <button
          onClick={handleLogout}
          className="nav-item nav-logout"
          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
        >
          <span className="nav-icon">🚪</span>
          <span className="nav-text">Sign Out</span>
        </button>
      </nav>
    </aside>
  );
}

