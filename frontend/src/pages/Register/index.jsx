/* eslint-env browser */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as FM from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ROUTES } from '../../data/routes';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { isStaffUser } from '../../utils/roles';
import { useGoogleIdentityButton } from '../../hooks/useGoogleIdentityButton';
import { isRequired, isEmail, minLength } from '../../utils/validators';
import { AuthSakuraLayer } from '../../components/auth/AuthSakuraLayer';
import { AuthHeroAvatars } from '../../components/auth/AuthHeroAvatars';
import {
  loginShellVariants,
  loginStaggerParent,
  loginStaggerItem,
  loginHeroGlass,
} from '../Login/loginMotion';
import yumeLogo from '../../assets/yume-logo.png';

const Motion = FM.motion;

function IconGoogleG() {
  return (
    <svg className="auth-google-fallback-pill__g" width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, loginWithGoogle, needsPlacementTest, user } = useAuth();
  const navigate = useNavigate();

  const routeAfterAuth = useCallback(
    (data) => {
      const u = authService.mergeUserWithRoleFromToken(data?.user ?? authService.getStoredUser());
      if (data?.needsPlacementTest && !isStaffUser(u)) {
        navigate(ROUTES.PLACEMENT_TEST, { replace: true });
      } else {
        navigate(getPostLoginRoute(u, ROUTES.DASHBOARD), { replace: true });
      }
    },
    [navigate],
  );

  const onGoogleCredential = useCallback(
    async (credential) => {
      if (!credential) return;
      setError('');
      setLoading(true);
      try {
        const data = await loginWithGoogle({ idToken: credential });
        routeAfterAuth(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Đăng ký/đăng nhập Google thất bại.');
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, routeAfterAuth],
  );

  const { mountRef: googleBtnRef, clientIdConfigured } = useGoogleIdentityButton(onGoogleCredential, {
    text: 'signup_with',
  });

  const buildUsername = (name, emailValue) => {
    const fromName = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 24);

    if (fromName) return fromName;

    const fromEmail = String(emailValue || '')
      .trim()
      .split('@')[0]
      ?.toLowerCase()
      ?.replace(/[^a-z0-9_]/g, '')
      ?.slice(0, 24);

    return fromEmail || `user_${Date.now()}`;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const u = authService.mergeUserWithRoleFromToken(user);
    if (needsPlacementTest && !isStaffUser(u)) {
      navigate(ROUTES.PLACEMENT_TEST, { replace: true });
      return;
    }
    navigate(getPostLoginRoute(u, ROUTES.DASHBOARD), { replace: true });
  }, [isAuthenticated, needsPlacementTest, user, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isRequired(fullName)) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (!isRequired(email)) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!isEmail(email)) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!isRequired(password)) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (!minLength(password, 6)) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await authService.register({
        username: buildUsername(fullName, email),
        email,
        password,
      });
      setError('');
      navigate(ROUTES.LOGIN, { replace: true, state: { message: 'Đăng ký thành công. Vui lòng đăng nhập.' } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--animated-login auth-page--register">
      <AuthSakuraLayer count={36} />

      <Motion.div
        className="auth-shell auth-shell--v3"
        variants={loginShellVariants}
        initial="hidden"
        animate="visible"
      >
        <section className="auth-left auth-left--register">
          <Motion.div className="auth-left__hero-copy" variants={loginHeroGlass} initial="hidden" animate="visible">
            <h2 className="auth-left__title">
              Start Your Japanese <span className="auth-left__accent">Journey.</span>
            </h2>
            <p className="auth-left__desc">
              Master Kanji, Hiragana, and Katakana with our interactive community-driven platform.
            </p>
            <div className="auth-left__hero-footer" aria-hidden="true">
              <AuthHeroAvatars />
              <div>
                Joined by <strong>12,000+</strong> learners
              </div>
            </div>
          </Motion.div>
        </section>

        <Motion.section className="auth-right auth-right--v3" variants={loginStaggerParent} initial="hidden" animate="visible">
          <Motion.div className="auth-login-brand" variants={loginStaggerItem}>
            <img src={yumeLogo} alt="" width={40} height={40} />
            <span className="auth-login-brand__text">YumeGo-ji</span>
          </Motion.div>

          <Motion.h1 className="auth-right__title" variants={loginStaggerItem}>
            Create Account
          </Motion.h1>
          <Motion.p className="auth-right__subtitle" variants={loginStaggerItem}>
            Join the YumeGo-ji community today.
          </Motion.p>

          <Motion.div className="auth-social auth-social--v3 auth-social--register" variants={loginStaggerItem}>
            <div className="auth-social__google-wrap auth-google-pill-wrap">
              {clientIdConfigured ? (
                <div ref={googleBtnRef} className="auth-google-mount auth-google-mount--pill" />
              ) : (
                <Motion.button
                  type="button"
                  className="auth-google-fallback-pill"
                  disabled={loading}
                  onClick={() =>
                    setError(
                      'Chưa cấu hình Google OAuth: thêm VITE_GOOGLE_CLIENT_ID vào frontend/.env (xem .env.example).',
                    )
                  }
                  aria-label="Đăng ký với Google — cần cấu hình Client ID"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <IconGoogleG />
                  <span>Google</span>
                </Motion.button>
              )}
            </div>
            <Motion.button
              type="button"
              className="auth-social__btn"
              disabled
              title="Sắp có"
              whileHover={{ y: 0 }}
            >
              <span className="auth-social__dot" aria-hidden="true" /> Facebook
            </Motion.button>
          </Motion.div>

          <Motion.div className="auth-divider" variants={loginStaggerItem}>
            OR CONTINUE WITH EMAIL
          </Motion.div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Motion.div
              className="auth-form__stagger"
              variants={loginStaggerParent}
              initial="hidden"
              animate="visible"
            >
              <Motion.div
                className="input-group input-group--auth-motion"
                variants={loginStaggerItem}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <label htmlFor="register-fullName" className="input-label">
                  Full Name
                </label>
                <input
                  id="register-fullName"
                  type="text"
                  className="auth-field-input auth-field-input--plain"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Arata Tanaka"
                  autoComplete="name"
                  disabled={loading}
                />
              </Motion.div>

              <Motion.div
                className="input-group input-group--auth-motion"
                variants={loginStaggerItem}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <label htmlFor="register-email" className="input-label">
                  Email Address
                </label>
                <input
                  id="register-email"
                  type="email"
                  className="auth-field-input auth-field-input--plain"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </Motion.div>

              <Motion.div className="auth-grid-2" variants={loginStaggerItem}>
                <Motion.div
                  className="input-group input-group--auth-motion"
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <label htmlFor="register-password" className="input-label">
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    className="auth-field-input auth-field-input--plain"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </Motion.div>

                <Motion.div
                  className="input-group input-group--auth-motion"
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <label htmlFor="register-confirmPassword" className="input-label">
                    Confirm Password
                  </label>
                  <input
                    id="register-confirmPassword"
                    type="password"
                    className="auth-field-input auth-field-input--plain"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </Motion.div>
              </Motion.div>

              {error && (
                <Motion.p className="form-error" variants={loginStaggerItem}>
                  {error}
                </Motion.p>
              )}

              <Motion.div variants={loginStaggerItem}>
                <Motion.button
                  type="submit"
                  className="btn btn--primary btn--block btn--lg btn--auth-primary"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Đang xử lý...' : 'Join Now'}
                </Motion.button>
              </Motion.div>
            </Motion.div>
          </form>

          <Motion.p className="auth-footer" variants={loginStaggerItem}>
            Already have an account? <Link to={ROUTES.LOGIN}>Log In</Link>
          </Motion.p>
          <Motion.div variants={loginStaggerItem}>
            <Link to={ROUTES.HOME} className="auth-back">
              ← Về trang chủ
            </Link>
          </Motion.div>
        </Motion.section>
      </Motion.div>
    </div>
  );
}
