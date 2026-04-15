/**
 * Mã JLPT hiện tại từ user (đồng bộ logic với Dashboard).
 * @param {object|null|undefined} user
 * @returns {'N5'|'N4'|'N3'|'N2'|'N1'}
 */
export function getJlptLevelCodeFromUser(user) {
  let levelCode = user?.levelCode || user?.level || null;
  const rawLevelId = user?.levelId ?? user?.LevelId ?? null;
  if (!levelCode && rawLevelId != null) {
    const idNum = Number(rawLevelId);
    if (idNum === 1) levelCode = 'N5';
    else if (idNum === 2) levelCode = 'N4';
    else if (idNum === 3) levelCode = 'N3';
  }
  return String(levelCode || 'N5')
    .trim()
    .toUpperCase();
}

/** N5 = 5 (dễ) … N1 = 1 (khó) — dùng so sánh trạng thái thẻ JLPT */
export function jlptRank(code) {
  const m = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
  return m[String(code || '').toUpperCase()] ?? 4;
}
