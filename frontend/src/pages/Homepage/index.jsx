import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { ChatbotWidget } from '../../components/support/ChatbotWidget';
import { HOMEPAGE_CTA, HOMEPAGE_HERO, HOMEPAGE_METHOD, HOMEPAGE_TESTIMONIALS, HOMEPAGE_WHY } from '../../data/homepageContent';

/** Trang chủ marketing (Sakura Nihongo) — style: `styles/pages/homepage.css` */
export default function Homepage() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.sn-reveal'));
    if (!nodes.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="homepage">
      <div className="sn-petals" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`sn-petal sn-petal--${(i % 4) + 1}`} />
        ))}
      </div>

      <section className="sn-hero sn-reveal is-visible">
        <div className="sn-container sn-hero__grid">
          <div className="sn-hero__content sn-reveal is-visible">
            <span className="sn-hero__badge">{HOMEPAGE_HERO.badge}</span>
            <h1 className="sn-hero__title">
              {HOMEPAGE_HERO.title} <span className="sn-hero__accent">{HOMEPAGE_HERO.highlight}</span>
            </h1>
            <p className="sn-hero__desc">{HOMEPAGE_HERO.description}</p>
            <div className="sn-hero__cta">
              <Link to={ROUTES.REGISTER} className="btn btn--primary btn--lg sn-btn--gradient">
                {HOMEPAGE_HERO.primaryCta}
              </Link>
              <a href="#method" className="btn btn--outline btn--lg sn-btn--soft">
                {HOMEPAGE_HERO.secondaryCta}
              </a>
            </div>
          </div>

          <div className="sn-hero__visual sn-reveal is-visible">
            <div className="sn-visual-blob" aria-hidden="true" />
            <div className="sn-visual-card sn-visual-card--tilt">
              <div className="sn-visual-frame">
                <img className="sn-visual-img" src={HOMEPAGE_HERO.image} alt="Hình minh họa Nhật Bản" loading="lazy" />
              </div>
              <div className="sn-visual-float sn-visual-float--metric">
                <div className="sn-visual-float__icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path
                      d="M4 18V6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M8 16V10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M12 16V7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M16 16V9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M20 16V5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <div>
                  <div className="sn-visual-float__label">{HOMEPAGE_HERO.metricLabel}</div>
                  <div className="sn-visual-float__value">{HOMEPAGE_HERO.metricValue}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="sn-section sn-section--method sn-reveal">
        <div className="sn-container">
          <h2 className="sn-title">{HOMEPAGE_METHOD.title}</h2>
          <p className="sn-subtitle">{HOMEPAGE_METHOD.subtitle}</p>
          <div className="sn-grid-3">
            {HOMEPAGE_METHOD.features.map((f) => (
              <article key={f.title} className="sn-feature sn-feature--elevated sn-feature--icon-only sn-reveal">
                <div className="sn-feature__icon" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="sn-feature__title">{f.title}</h3>
                <p className="sn-feature__text">{f.description}</p>
                <a className="sn-feature__link" href="#method">
                  {f.linkLabel} <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="sn-section sn-section--why sn-reveal">
        <div className="sn-container sn-why__grid">
          <div className="sn-why__gallery" aria-hidden="true">
            <div className="sn-why__img sn-why__img--a">
              <img src={HOMEPAGE_WHY.images[0]} alt="" loading="lazy" />
            </div>
            <div className="sn-why__img sn-why__img--b">
              <img src={HOMEPAGE_WHY.images[1]} alt="" loading="lazy" />
            </div>
          </div>

          <div className="sn-why__content">
            <h2 className="sn-why__heading">{HOMEPAGE_WHY.title}</h2>
            <div className="sn-why__list">
              {HOMEPAGE_WHY.items.map((it) => (
                <div key={it.title} className="sn-why__row">
                  <div className="sn-why__check" aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <h3 className="sn-why__item-title">{it.title}</h3>
                    <p className="sn-why__item-text">{it.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="sn-section sn-section--testimonials sn-reveal">
        <div className="sn-container">
          <h2 className="sn-title">{HOMEPAGE_TESTIMONIALS.title}</h2>
          <p className="sn-subtitle">{HOMEPAGE_TESTIMONIALS.subtitle}</p>
          <div className="sn-grid-3">
            {HOMEPAGE_TESTIMONIALS.items.map((t) => (
              <article key={t.name} className="sn-testimonial sn-reveal">
                <div className="sn-testimonial__stars" aria-label="5 sao">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="sn-testimonial__quote">“{t.quote}”</p>
                <div className="sn-testimonial__meta">
                  <div className="sn-testimonial__avatar" aria-hidden="true" />
                  <div>
                    <div className="sn-testimonial__name">{t.name}</div>
                    <div className="sn-testimonial__level">{t.level}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sn-cta sn-reveal">
        <div className="sn-container sn-cta__inner sn-cta__inner--center sn-reveal">
          <div className="sn-cta__sakura" aria-hidden="true">
            ❀
          </div>
          <h2 className="sn-cta__title">{HOMEPAGE_CTA.title}</h2>
          <p className="sn-cta__text sn-cta__text--wide">{HOMEPAGE_CTA.subtitle}</p>
          <Link to={ROUTES.REGISTER} className="btn btn--inverted btn--lg sn-cta__btn">
            {HOMEPAGE_CTA.button}
          </Link>
        </div>
      </section>

      <ChatbotWidget />
    </div>
  );
}
