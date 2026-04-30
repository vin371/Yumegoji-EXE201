-- =============================================================================
-- YumeGo-ji — GỘP THỨ TỰ CHẠY DDL (tạo/sửa cấu trúc DB, thủ tục)
--
-- Cách chạy (bắt buộc làm việc trong thư mục backend/doc/sql):
--   sqlcmd -S <server> -d master -E -i 01_yumegoji_database_DDL.sql
-- Hoặc SSMS: Query > SQLCMD Mode, mở file này rồi Execute (F5).
--
-- Nguồn chính tạo bảng: yumegoji-schema-sqlserver.sql (idempotent, an toàn chạy lại).
-- Tiếp theo: mở rộng game (set_id, SP), premium, social, level-up, sửa FK chat, scoring.
--
-- KHÔNG include (xung đột hoặc thay thế):
--   - create_game_module_tables.sql  → dùng yumegoji_game_system_spec.sql
--   - create_placement_test_tables.sql → trùng tên dbo.placement_questions với schema
--   - YumegojiDB-AllScripts.sql       → bản snapshot cũ; dùng 01 + 02 thay thế
--
-- Cảnh báo: create_level_up_tests.sql DROP bảng level_up_* nếu tồn tại.
--            create_social_posts.sql DROP posts / comments / reactions nếu tồn tại.
-- =============================================================================
:ON ERROR EXIT
SET NOCOUNT ON;
GO

/* --- 1. Schema lõi (DB + hầu hết bảng) --- */
:r .\yumegoji-schema-sqlserver.sql

/* --- 2. OAuth Google (nullable password, google_sub) — an toàn khi schema đã có --- */
:r .\060-google-oauth-users.sql

/* --- 3. Hệ thống game đầy đủ (games/power_ups/game_question_sets, SP…) --- */
:r .\yumegoji_game_system_spec.sql

/* --- 4. Bổ sung cột games/power_ups nếu DB cũ thiếu --- */
:r .\patch_game_add_missing_columns.sql

/* --- 5. Cột level_min / level_max trên games (nếu thiếu) --- */
:r .\patch_games_level_range_columns.sql

/* --- 6. Bảng cấu hình + yêu cầu thanh toán Premium (QR) --- */
:r .\patch_premium_upgrade_qr_v1.sql

/* --- 7. Achievements + leaderboard_periods.level_id --- */
:r .\patch_achievements_leaderboard_v1.sql

/* --- 8. Bài thi level-up (DROP + CREATE + seed câu hỏi mẫu trong cùng file) --- */
:r .\create_level_up_tests.sql

/* --- 9. Kết quả placement app (bảng placement_results_app) --- */
:r .\create_placement_results_app.sql

/* --- 10. Cộng đồng: posts / comments / reactions --- */
:r .\create_social_posts.sql

/* --- 11. FK messages → chat_rooms (sửa lệch schema cũ) --- */
:r .\fix_messages_conversation_fk_to_chat_rooms.sql

/* --- 12. sp_StartGameSession (fallback theo level) --- */
:r .\patch_sp_start_game_session_level_fallback.sql

/* --- 13. sp_StartGameSession + @question_count + câu sentence-builder bổ sung --- */
:r .\patch_sentence_builder_rounds.sql

/* --- 14. sp_SubmitAnswer / sp_EndGameSession (điểm tối đa 100, EXP/Xu an toàn) --- */
:r .\patch_sp_scoring_cap100_end_safe.sql

GO
PRINT N'[01_yumegoji_database_DDL] Hoàn tất. Chạy tiếp 02_yumegoji_database_seed.sql nếu cần dữ liệu mẫu.';
GO
