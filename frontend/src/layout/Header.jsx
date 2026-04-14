import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from '../data/routes';
import yumeLogo from '../assets/yume-logo.png';

const MARKETING_PATHS = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER];

function homeHash(hash) {
  return `${ROUTES.HOME}${hash}`;
}

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isMarketing = MARKETING_PATHS.includes(location.pathname);

  if (isMarketing) {
    return (
      <header className="layout-header layout-header--marketing">
        <Link to={ROUTES.HOME} className="layout-header__brand" aria-label="Sakura Nihongo — về trang chủ">
          <span className="layout-header__brand-text">Sakura Nihongo</span>
        </Link>

        <nav className="layout-header__nav-center" aria-label="Điều hướng chính">
          <Link to={ROUTES.HOME}>Trang chủ</Link>
          <a href={homeHash('#method')}>Khóa học</a>
          <a href={homeHash('#why')}>Giới thiệu</a>
          <a href={homeHash('#testimonials')}>Blog</a>
          <a href={homeHash('#lien-he')}>Liên hệ</a>
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
            <>
              <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
              <Link to={ROUTES.CHAT}>Chat</Link>
              <Link to={ROUTES.ACCOUNT}>Account</Link>
              <button type="button" onClick={logout} className="layout-header__btn">
                Đăng xuất
              </button>
            </>
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
            <Link to={ROUTES.CHAT}>Chat</Link>
            <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
            <Link to={ROUTES.ACCOUNT}>Account</Link>
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
