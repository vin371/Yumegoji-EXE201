-- =============================================================================
-- YumeGo-ji — GỘP THỨ TỰ CHẠY DỮ LIỆU MẪU / BỔ SUNG (MERGE, INSERT, UPDATE)
--
-- Chạy SAU 01_yumegoji_database_DDL.sql (cùng database YumegojiDB).
-- Thư mục làm việc: backend/doc/sql
--
--   sqlcmd -S <server> -d YumegojiDB -E -i 02_yumegoji_database_seed.sql
-- Hoặc SSMS: bật SQLCMD Mode rồi Execute.
--
-- Thứ tự: game + pool câu hỏi → thành tích EXP → nội dung bài học mẫu → từ vựng
--        theo bài → túi power-up (đổi @user_id trong file con) → mật khẩu admin bcrypt.
--
-- Lưu ý: seed_powerup_starter_inventory.sql mặc định user_id = 1 — sửa trước khi chạy.
--        patch_vocab_numbers_1_10.sql cần bài học khớp tiêu đề (xem file).
-- =============================================================================
:ON ERROR EXIT
USE YumegojiDB;
SET NOCOUNT ON;
GO

/* --- 1. Game slug + bộ câu tối thiểu + Hiragana/Katakana seed --- */
:r .\seed_games_playable_fix_v1.sql

/* --- 2–5. Mở rộng pool câu theo từng game --- */
:r .\patch_daily_challenge_questions.sql
:r .\patch_flashcard_battle_questions.sql
:r .\patch_boss_battle_questions.sql
:r .\patch_counter_quest_questions.sql

/* --- 6. Thành tích mốc tổng EXP --- */
:r .\patch_exp_achievements_v1.sql

/* --- 7. Nội dung Markdown + từ/kanji/ngữ pháp mẫu (đổi @lesson_id trong file) --- */
:r .\seed_sample_lesson_content.sql

/* --- 8. Từ số 1–10 theo bài “Số đếm” (cần lesson khớp) --- */
:r .\patch_vocab_numbers_1_10.sql

/* --- 9. Power-up vào túi user (TODO: @user_id) --- */
:r .\seed_powerup_starter_inventory.sql

/* --- 10. Hash bcrypt cho admin@yumegoji.vn --- */
:r .\fix_admin_password_bcrypt.sql

GO
PRINT N'[02_yumegoji_database_seed] Hoàn tất.';
GO
