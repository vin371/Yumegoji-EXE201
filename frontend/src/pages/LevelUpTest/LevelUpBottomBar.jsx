/**
 * Thanh dưới cố định: gợi ý trợ giúp + Lưu nháp + Nộp bài.
 */
export function LevelUpBottomBar({ onSaveDraft, onSubmit, draftSavedAt, submitting, submitted, disableSubmit }) {
  return (
    <div className="level-up-bottom">
      <p className="level-up-bottom__hint">Cần giúp đỡ? Nhấn biểu tượng dấu hỏi phía trên để xem mẹo làm bài.</p>
      <div className="level-up-bottom__actions">
        {draftSavedAt ? (
          <span className="level-up-bottom__saved" role="status">
            Đã lưu nháp {draftSavedAt}
          </span>
        ) : null}
        <button type="button" className="level-up-bottom__draft" onClick={onSaveDraft} disabled={submitted}>
          Lưu nháp
        </button>
        <button type="button" className="level-up-bottom__submit" onClick={onSubmit} disabled={disableSubmit || submitted}>
          {submitting ? 'Đang nộp...' : submitted ? 'Đã nộp bài' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
}
