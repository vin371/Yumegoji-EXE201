/**
 * Lời chào + mô tả ngắn + tiến trình đã làm / tổng câu.
 */
export function LevelUpHero({ displayName, description, answeredCount, totalQuestions, fromLevel, toLevel }) {
  return (
    <section className="level-up-hero">
      <div className="level-up-hero__text">
        <h2 className="level-up-hero__greeting">
          Chào mừng <span className="level-up-hero__accent">{displayName}</span>,
        </h2>
        <p className="level-up-hero__lead">
          Hoàn thành bài thi từ <strong>{fromLevel}</strong> lên <strong>{toLevel}</strong> để mở khóa nội dung phù hợp trình độ
          mới. Làm bài tập trung; bạn có thể lưu nháp và quay lại sau.
        </p>
        {description ? <p className="level-up-hero__desc">{description}</p> : null}
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
