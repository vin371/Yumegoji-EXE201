/**
 * Phần chào + tiến trình cho bài test đầu vào (phân trình độ).
 */
export function PlacementHero({ displayName, answeredCount, totalQuestions, minutesLimit }) {
  return (
    <section className="level-up-hero">
      <div className="level-up-hero__text">
        <h2 className="level-up-hero__greeting">
          Chào mừng <span className="level-up-hero__accent">{displayName}</span>,
        </h2>
        <p className="level-up-hero__lead">
          Đây là <strong>bài test phân trình độ</strong> của YumeGo-ji. Kết quả gợi ý mức JLPT phù hợp (N5 / N4 / N3)
          dựa trên số câu bạn làm đúng. Bạn có <strong>{minutesLimit} phút</strong> và có thể lưu nháp bất cứ lúc nào.
        </p>
      </div>
      <div className="level-up-hero__progress" aria-label="Tiến trình làm bài">
        <div className="level-up-hero__progress-label">Tiến trình</div>
        <div className="level-up-hero__progress-value">
          {answeredCount}/{totalQuestions} câu
        </div>
      </div>
    </section>
  );
}
