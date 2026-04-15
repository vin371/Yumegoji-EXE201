import { LEVEL_UP_BADGE_CYCLE } from './constants';

function badgeForIndex(index) {
  return LEVEL_UP_BADGE_CYCLE[index % LEVEL_UP_BADGE_CYCLE.length];
}

/**
 * Một thẻ câu hỏi: số thứ tự, nhãn dạng bài, nội dung, lựa chọn (bố cục 1 cột hoặc lưới 2 cột nếu có 4 đáp án).
 */
export function LevelUpQuestionCard({ question, index, selectedKey, onSelect }) {
  const n = String(index + 1).padStart(2, '0');
  const badge = badgeForIndex(index);
  const opts = question.options || [];
  const grid4 = opts.length === 4;

  return (
    <article className="level-up-qcard">
      <div className="level-up-qcard__head">
        <span className="level-up-qcard__num">{n}</span>
        <span className="level-up-qcard__badge">{badge}</span>
      </div>
      <p className="level-up-qcard__stem">
        {question.points != null ? (
          <span className="level-up-qcard__points">({question.points} điểm) </span>
        ) : null}
        {question.text}
      </p>
      <div className={grid4 ? 'level-up-qcard__opts level-up-qcard__opts--grid' : 'level-up-qcard__opts'}>
        {opts.map((opt) => {
          const key = opt.key;
          const label = String(key).toUpperCase();
          const id = `q-${question.id}-${key}`;
          const checked = selectedKey === key;
          return (
            <label key={key} htmlFor={id} className={`level-up-opt ${checked ? 'level-up-opt--checked' : ''}`}>
              <input
                id={id}
                type="radio"
                name={`q-${question.id}`}
                value={key}
                checked={checked}
                onChange={() => onSelect(question.id, key)}
              />
              <span className="level-up-opt__key">{label}</span>
              <span className="level-up-opt__text">{opt.text}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}
