import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from '../data/routes';
import yumeLogo from '../assets/yume-logo.png';

const MARKETING_PATHS = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER];

function marketingNavInitials(user, displayName) {
  const n = String(displayName || '').trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  const u = user?.username || user?.email || '';
  return String(u).slice(0, 1).toUpperCase() || 'U';
}

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isMarketing = MARKETING_PATHS.includes(location.pathname);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef(null);
  const displayName = user?.displayName || user?.username || user?.name || user?.email || 'Học viên';
  const roleNorm = String(user?.role ?? user?.Role ?? 'user').toLowerCase();
  const isAdminUser = roleNorm === 'admin';
  const isModeratorUser = roleNorm === 'moderator';

  useEffect(() => {
    if (!accountOpen) return undefined;
    function onDocMouseDown(e) {
      const el = accountWrapRef.current;
      if (!el || el.contains(e.target)) return;
      setAccountOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  if (isMarketing) {
    return (
      <header className="layout-header layout-header--marketing">
        <Link to={ROUTES.HOME} className="layout-header__brand" aria-label="YumeGo-ji — về trang chủ">
          <img src={yumeLogo} alt="YumeGo-ji" className="layout-header__brand-logo" />
          <span className="layout-header__brand-title">YumeGo-ji</span>
        </Link>

        <nav className="layout-header__nav-center" aria-label="Điều hướng chính">
          <Link to={ROUTES.HOME}>Trang chủ</Link>
          {isAuthenticated ? (
            <Link to={ROUTES.LEARN}>Khóa học</Link>
          ) : (
            <Link to={`${ROUTES.HOME}#method`}>Khóa học</Link>
          )}
          {isAuthenticated ? (
            <Link to={`${ROUTES.HOME}#testimonials`}>Blog</Link>
          ) : (
            <>
              <Link to={`${ROUTES.HOME}#why`}>Giới thiệu</Link>
              <Link to={`${ROUTES.HOME}#testimonials`}>Blog</Link>
              <Link to={`${ROUTES.HOME}#lien-he`}>Liên hệ</Link>
            </>
          )}
        </nav>

        <div className="layout-header__actions">
          <button
            type="button"
            className="layout-header__theme"
            onClick={toggleTheme}
            aria-label="Chuyển sáng/tối"
            title="Chuyển sáng/tối"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {isAuthenticated ? (
            <div className="layout-header__account-wrap" ref={accountWrapRef}>
              <button
                type="button"
                className="layout-header__account-trigger"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-controls="layout-header-account-menu"
                onClick={() => setAccountOpen((o) => !o)}
              >
                <span className="layout-header__account-avatar" aria-hidden>
                  {marketingNavInitials(user, displayName)}
                </span>
                <span className="layout-header__account-label">{displayName}</span>
                <span className="layout-header__account-chevron" aria-hidden>
                  ▾
                </span>
              </button>
              {accountOpen ? (
                <div
                  id="layout-header-account-menu"
                  className="layout-header__account-menu"
                  role="menu"
                >
                  {isAdminUser ? (
                    <Link
                      to={ROUTES.ADMIN}
                      className="layout-header__account-item"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Quản trị
                    </Link>
                  ) : null}
                  {isModeratorUser ? (
                    <Link
                      to={ROUTES.MODERATOR}
                      className="layout-header__account-item"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Điều hành
                    </Link>
                  ) : null}
                  <Link
                    to={ROUTES.DASHBOARD}
                    className="layout-header__account-item"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Bảng điều khiển
                  </Link>
                  <Link
                    to={ROUTES.CHAT}
                    className="layout-header__account-item"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Trò chuyện
                  </Link>
                  <Link
                    to={ROUTES.ACCOUNT}
                    className="layout-header__account-item"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    Tài khoản
                  </Link>
                  <button
                    type="button"
                    className="layout-header__account-item layout-header__account-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      logout();
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="layout-header__link-muted">
                Đăng nhập
              </Link>
              <Link to={ROUTES.REGISTER} className="btn btn--primary btn--sm layout-header__cta-register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="layout-header">
      <Link to={ROUTES.HOME} className="layout-header__logo" aria-label="YumeGo-ji — về trang chủ">
        <img src={yumeLogo} alt="YumeGo-ji" className="layout-header__logo-img" />
        <span className="layout-header__logo-title">YumeGo-ji</span>
      </Link>
      <nav className="layout-header__nav">
        <button
          type="button"
          className="layout-header__theme"
          onClick={toggleTheme}
          aria-label="Chuyển sáng/tối"
          title="Chuyển sáng/tối"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <Link to={ROUTES.HOME}>Trang chủ</Link>
        {isAuthenticated ? (
          <>
            <Link to={ROUTES.CHAT}>Trò chuyện</Link>
            <Link to={ROUTES.DASHBOARD}>Bảng điều khiển</Link>
            <Link to={ROUTES.ACCOUNT}>Tài khoản</Link>
            <button type="button" onClick={logout} className="layout-header__btn">
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
            <Link to={ROUTES.REGISTER} className="btn btn--inverted btn--sm">
              Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
