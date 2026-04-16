import { Link } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import { HOMEPAGE_TESTIMONIALS } from '../data/homepageContent';

export function Footer() {
  const year = new Date().getFullYear();
  const faceItems = HOMEPAGE_TESTIMONIALS.items.filter((t) => t.avatarUrl);
  return (
    <footer id="site-footer" className="layout-footer">
      <div className="sn-container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">Yumegoji</div>
          <p className="footer-desc">
            Nền tảng học tiếng Nhật dành cho người Việt — học vui, nhớ lâu, luyện giao tiếp mỗi ngày.
          </p>
          <div className="footer-social" aria-label="Học viên tiêu biểu">
            {faceItems.map((t) => (
              <span key={t.name} className="footer-social__dot">
                <img className="footer-social__img" src={t.avatarUrl} alt={t.name} width={34} height={34} loading="lazy" />
              </span>
            ))}
          </div>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Học tập</h4>
          <Link className="footer-link" to={ROUTES.LEARN}>
            Lộ trình học JLPT
          </Link>
          <a className="footer-link" href={`${ROUTES.HOME}#method`}>
            Học Hiragana
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#method`}>
            Học Katakana
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#method`}>
            Ôn Kanji
          </a>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Công ty</h4>
          <a className="footer-link" href={`${ROUTES.HOME}#why`}>
            Giới thiệu
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#testimonials`}>
            Blog
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#lien-he`}>
            Tuyển dụng
          </a>
          <span id="lien-he" className="footer-link footer-link--static">
            Liên hệ: support@sakuranihongo.example
          </span>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Pháp lý</h4>
          <a className="footer-link" href={`${ROUTES.HOME}#site-footer`}>
            Chính sách bảo mật
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#site-footer`}>
            Điều khoản sử dụng
          </a>
          <a className="footer-link" href={`${ROUTES.HOME}#site-footer`}>
            Chính sách hoàn tiền
          </a>
        </div>
      </div>
      <div className="footer-bottom sn-container">
        <span>&copy; {year} YumeGo-ji. All rights reserved.</span>
      </div>
    </footer>
  );
}
