import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../data/routes';
import { deleteStaffLesson, fetchStaffLessonsPaged } from '../../../services/lessonImportService';

function getApiErrorMessage(err, fallback) {
  const d = err?.response?.data;
  if (d == null) return err?.message || fallback;
  if (typeof d === 'string') return d;
  if (typeof d.message === 'string' && d.message) return d.message;
  if (typeof d.detail === 'string' && d.detail) return d.detail;
  if (typeof d.title === 'string' && d.title) return d.title;
  return err?.message || fallback;
}

const PAGE_SIZE = 25;

/**
 * Danh sách bài học (đã / chưa publish) — xem, sửa trong Import, xóa.
 */
export function StaffLessonsHubTab({ onEditInImport }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pubFilter, setPubFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, pubFilter]);

  const isPublishedParam = useMemo(() => {
    if (pubFilter === 'published') return true;
    if (pubFilter === 'draft') return false;
    return undefined;
  }, [pubFilter]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchStaffLessonsPaged({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        isPublished: isPublishedParam,
      });
      const raw = res?.items ?? res?.Items ?? [];
      setItems(Array.isArray(raw) ? raw : []);
      setTotalCount(Number(res?.totalCount ?? res?.TotalCount) || 0);
    } catch (err) {
      setItems([]);
      setTotalCount(0);
      setError(getApiErrorMessage(err, 'Không tải được danh sách bài học.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, isPublishedParam]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const confirmDelete = async (row) => {
    const id = row.id ?? row.Id;
    const title = row.title ?? row.Title ?? '';
    if (
      !window.confirm(
        `Xóa vĩnh viễn bài «${title}» (#${id})? Không hoàn tác (quiz, từ vựng, tiến độ học viên…).`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setError('');
    try {
      await deleteStaffLesson(id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Lỗi xóa bài'));
    } finally {
      setDeletingId(null);
    }
  };

  const onSua = (row) => {
    const id = row.id ?? row.Id;
    if (typeof onEditInImport === 'function') onEditInImport(id);
  };

  return (
    <div className="mod-hub__panel mod-dash__panel mod-staff-lessons">
      <h2 className="mod-dash__panel-title">Nội dung bài học</h2>
      <p className="mod-dash__panel-desc">
        Hiển thị <strong>bài đã lưu trong database</strong>. Ở tab Import, sau <strong>Quét AI</strong>, <strong>trích không AI</strong> hoặc <strong>đính kèm file</strong>: nếu đã chọn danh mục thì hệ thống <strong>tự lưu</strong> (hoặc chọn danh mục ngay sau đó để tự lưu). Chọn <strong>Sửa trong Import</strong> để chỉnh, hoặc <strong>Xóa</strong> để gỡ.
      </p>

      <div className="mod-staff-lessons__toolbar">
        <input
          type="search"
          className="mod-dash__input mod-staff-lessons__search"
          placeholder="Tìm theo tiêu đề hoặc slug…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Tìm bài học"
        />
        <select
          className="mod-dash__select"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value)}
          aria-label="Lọc trạng thái xuất bản"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
        <button type="button" className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm" onClick={() => load()} disabled={loading}>
          Làm mới
        </button>
      </div>

      {error ? <div className="mod-dash__alert mod-dash__alert--err">{error}</div> : null}

      {loading ? <p className="mod-dash__muted">Đang tải danh sách…</p> : null}

      {!loading && items.length === 0 ? <p className="mod-dash__muted">Không có bài học khớp bộ lọc.</p> : null}

      {!loading && items.length > 0 ? (
        <div className="mod-dash__table-wrap mod-staff-lessons__table-wrap">
          <table className="mod-dash__table mod-staff-lessons__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Slug</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = row.id ?? row.Id;
                const title = row.title ?? row.Title ?? '';
                const slug = row.slug ?? row.Slug ?? '';
                const cat = row.categoryName ?? row.CategoryName ?? '—';
                const pub = Boolean(row.isPublished ?? row.IsPublished);
                return (
                  <tr key={id}>
                    <td className="mod-dash__mono">{id}</td>
                    <td>
                      <strong>{title}</strong>
                    </td>
                    <td>{cat}</td>
                    <td className="mod-dash__mono mod-staff-lessons__slug">{slug}</td>
                    <td>{pub ? <span className="mod-staff-lessons__badge mod-staff-lessons__badge--ok">Đã publish</span> : <span className="mod-staff-lessons__badge">Nháp</span>}</td>
                    <td className="mod-staff-lessons__actions">
                      {pub ? (
                        <Link
                          className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
                          to={`${ROUTES.LEARN}/${encodeURIComponent(slug)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem
                        </Link>
                      ) : (
                        <span className="mod-dash__muted mod-staff-lessons__no-preview" title="Bài nháp — học viên chưa xem được qua /learn">
                          —
                        </span>
                      )}
                      <button type="button" className="mod-dash__btn mod-dash__btn--primary mod-dash__btn--sm" onClick={() => onSua(row)} disabled={deletingId != null}>
                        Sửa trong Import
                      </button>
                      <button
                        type="button"
                        className="mod-dash__btn mod-dash__btn--danger mod-dash__btn--sm"
                        onClick={() => confirmDelete(row)}
                        disabled={deletingId === id}
                      >
                        {deletingId === id ? 'Đang xóa…' : 'Xóa'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && totalPages > 1 ? (
        <div className="mod-staff-lessons__pager">
          <button type="button" className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Trước
          </button>
          <span className="mod-dash__muted mod-staff-lessons__pager-info">
            Trang {page} / {totalPages} · {totalCount} bài
          </span>
          <button
            type="button"
            className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau →
          </button>
        </div>
      ) : null}
    </div>
  );
}
