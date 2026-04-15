import { Link } from 'react-router-dom';
import yumeLogo from '../../assets/yume-logo.png';
import { ROUTES } from '../../data/routes';

/**
 * Thanh đề thi: logo + tên YumeGo-ji, tên bài, đồng hồ, nút gợi ý (scroll tới mẹo).
 */
export function LevelUpExamBar({ testTitle, minutes, seconds, urgent, onHelpClick }) {
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return (
    <div className="level-up-exam-bar">
      <div className="level-up-exam-bar__left">
        <Link to={ROUTES.DASHBOARD} className="level-up-exam-bar__brand" title="Về Dashboard">
          <img src={yumeLogo} alt="" width={40} height={40} className="level-up-exam-bar__logo" />
          <span className="level-up-exam-bar__name">YumeGo-ji</span>
        </Link>
        <span className="level-up-exam-bar__sep" aria-hidden />
        <h1 className="level-up-exam-bar__title">{testTitle}</h1>
      </div>
      <div className="level-up-exam-bar__right">
        <div className={`level-up-exam-bar__timer ${urgent ? 'level-up-exam-bar__timer--urgent' : ''}`} aria-live="polite">
          <span aria-hidden>⏱️</span> {mm}:{ss}
        </div>
        <button type="button" className="level-up-exam-bar__help" onClick={onHelpClick} aria-label="Xem mẹo làm bài">
          ?
        </button>
      </div>
    </div>
  );
}
