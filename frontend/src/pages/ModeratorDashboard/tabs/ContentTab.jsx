import { useCallback, useState } from 'react';
import { StaffLessonsHubTab } from './StaffLessonsHubTab';
import { UploadLessonsTab } from './UploadLessonsTab';

const HUB_NAV = [
  { id: 'import', label: 'Import', desc: 'Tải tệp & AI' },
  { id: 'lessons', label: 'Nội dung bài học', desc: 'Danh sách, xem, xóa' },
];

export function ContentTab() {
  const [hubView, setHubView] = useState('import');
  /** Remount Import để «+ Bài học mới» xoá form */
  const [importMountKey, setImportMountKey] = useState(0);
  /** Khi chọn «Sửa trong Import» từ danh sách — tải bài vào form Import. */
  const [importLessonId, setImportLessonId] = useState(null);

  const handleConsumedInitialStaffLesson = useCallback(() => {
    setImportLessonId(null);
  }, []);

  const handleEditInImport = useCallback((lessonId) => {
    setImportLessonId(lessonId);
    setHubView('import');
  }, []);

  function newLesson() {
    setHubView('import');
    setImportLessonId(null);
    setImportMountKey((k) => k + 1);
  }

  return (
    <div className="mod-hub">
      <aside className="mod-hub__sidebar" aria-label="Trung tâm nội dung">
        <div className="mod-hub__brand">
          <span className="mod-hub__brand-mark">夢</span>
          <div>
            <div className="mod-hub__brand-title">Yumegoji</div>
            <div className="mod-hub__brand-sub">Moderator · Nội dung</div>
          </div>
        </div>
        <nav className="mod-hub__nav" aria-label="Nội dung moderator">
          {HUB_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.desc}
              className={`mod-hub__nav-item${hubView === item.id ? ' mod-hub__nav-item--active' : ''}`}
              onClick={() => setHubView(item.id)}
            >
              <span className="mod-hub__nav-icon" aria-hidden>
                {item.id === 'import' ? '📥' : '📚'}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="mod-hub__new" onClick={newLesson}>
          + Bài học mới
        </button>
      </aside>

      <div className="mod-hub__main">
        {hubView === 'import' ? (
          <UploadLessonsTab
            key={importMountKey}
            initialStaffLessonId={importLessonId}
            onConsumedInitialStaffLesson={handleConsumedInitialStaffLesson}
          />
        ) : null}

        {hubView === 'lessons' ? <StaffLessonsHubTab onEditInImport={handleEditInImport} /> : null}
      </div>
    </div>
  );
}
