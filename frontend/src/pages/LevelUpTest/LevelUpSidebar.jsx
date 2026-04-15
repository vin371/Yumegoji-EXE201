/**
 * Cột phải: mẹo làm bài + thông tin kỳ thi (đồng bộ dữ liệu từ API).
 */
export function LevelUpSidebar({ toLevel, totalQuestions, passScore, totalPoints }) {
  return (
    <aside className="level-up-aside" aria-label="Mẹo và thông tin kỳ thi">
      <div id="level-up-tips" className="level-up-tips" tabIndex={-1}>
        <h3 className="level-up-tips__title">Mẹo làm bài</h3>
        <ul className="level-up-tips__list">
          <li>Đọc kỹ câu hỏi và các đáp án trước khi chọn — tránh đổi đáp án liên tục gây mất thời gian.</li>
          <li>Với ngữ pháp, xác định chỗ cần trợ từ (は/が/を/に…) hay thể của động từ trước khi quyết định.</li>
          <li>Nếu không chắc, đánh dấu tạm rồi quay lại sau khi làm xong các câu khác.</li>
        </ul>
      </div>

      <div className="level-up-info">
        <h3 className="level-up-info__title">Thông tin kỳ thi</h3>
        <ul className="level-up-info__list">
          <li>
            <span>Tổng số câu</span>
            <strong>{totalQuestions}</strong>
          </li>
          <li>
            <span>Điểm cần đạt</span>
            <strong>
              {passScore}/{totalPoints}
            </strong>
          </li>
          <li>
            <span>Trình độ đích</span>
            <span className="level-up-info__pill">JLPT {toLevel}</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
