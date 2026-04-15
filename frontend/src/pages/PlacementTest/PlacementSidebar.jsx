/**
 * Mẹo + quy tắc chấm điểm gợi ý level (placement không có pass điểm cố định).
 */
export function PlacementSidebar({ totalQuestions }) {
  return (
    <aside className="level-up-aside" aria-label="Mẹo và thông tin bài test">
      <div id="level-up-tips" className="level-up-tips" tabIndex={-1}>
        <h3 className="level-up-tips__title">Mẹo làm bài</h3>
        <ul className="level-up-tips__list">
          <li>Làm tuần tự hoặc nhảy câu tùy ý — quan trọng là nộp bài trước khi hết giờ.</li>
          <li>Câu đọc hiểu thường dài: đọc lướt câu hỏi trước rồi quay lại đoạn văn để tiết kiệm thời gian.</li>
          <li>Không biết vẫn nên chọn một đáp án; bài không trừ điểm vì sai.</li>
        </ul>
      </div>

      <div className="level-up-info">
        <h3 className="level-up-info__title">Thông tin bài test</h3>
        <ul className="level-up-info__list">
          <li>
            <span>Tổng số câu</span>
            <strong>{totalQuestions}</strong>
          </li>
          <li>
            <span>Gợi ý level</span>
            <span className="placement-info__bands">Theo số câu đúng</span>
          </li>
        </ul>
        <p className="placement-info__rule">
          ≤ 15 đúng → <strong>N5</strong>
          <br />
          16–30 đúng → <strong>N4</strong>
          <br />
          ≥ 31 đúng → <strong>N3</strong>
        </p>
      </div>
    </aside>
  );
}
