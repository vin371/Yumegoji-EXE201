# Yumegoji / EXE201

Nền tảng học tiếng Nhật: backend **ASP.NET Core 8** (API + SignalR), frontend **React + Vite**, cơ sở dữ liệu **SQL Server**.

## Yêu cầu môi trường

| Thành phần | Phiên bản / ghi chú |
|------------|---------------------|
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/8.0) | **8.0** |
| [Node.js](https://nodejs.org/) | **18+** (khuyến nghị LTS) |
| SQL Server | Bản cài trên Windows **hoặc** Docker (xem mục Docker) |
| (Tuỳ chọn) [Ollama](https://ollama.com/) | Import bài học bằng AI khi không dùng OpenAI |
| (Tuỳ chọn) [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Chạy SQL Server trong container — chi tiết **[DOCKER-DESKTOP.md](DOCKER-DESKTOP.md)** |

## Cấu trúc thư mục

```
EXE201/
├── backend/                 # API .NET (Swagger, JWT, upload PDF/DOCX/PPTX)
├── frontend/                # React + Vite (dev: cổng 8080)
├── docker-compose.yml       # SQL Server 2022 trong container (host 14333)
├── Dockerfile               # Image chạy API (không chứa SQL)
├── backend/doc/sql/         # Script SQL — xem mục “Cơ sở dữ liệu” bên dưới
├── DOCKER-DESKTOP.md        # Docker Desktop + SSMS + cổng 14333
└── README.md
```

## 1. Cơ sở dữ liệu (SQL Server)

### Bạn đang dùng kiểu nào?

| Kiểu | Khi nào cần chạy script SQL |
|------|------------------------------|
| **SQL cài trên Windows** (vd. `LAPTOP-...\SQLEXPRESS`) | Chỉ khi DB **mới / trống** hoặc bạn đổi schema — nếu app đã chạy ổn thì **không bắt buộc** làm lại. |
| **SQL trong Docker** (`localhost,14333`) | Sau **lần đầu** `docker compose up` (hoặc sau khi **xóa volume** / DB trống) — cần chạy `01` + `02` như dưới. |

**Lưu ý:** Windows SQL và SQL trong Docker là **hai máy chủ khác nhau** — connection string phải trỏ đúng cái bạn đang dùng.

### Chuỗi kết nối backend

Sửa trong **`backend/appsettings.json`** hoặc **`appsettings.Development.json`** (SQL local), hoặc dùng profile **Docker** + **`appsettings.Docker.json`** (SQL container `localhost,14333`):

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=...;Database=YumegojiDB;User Id=...;Password=...;TrustServerCertificate=True;"
}
```

**Lưu ý bảo mật:** Không commit mật khẩu thật lên Git. Dùng [User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) hoặc **`backend/appsettings.Secrets.json`** (đã được `Program.cs` đọc nếu tồn tại — nên `.gitignore` nếu có bí mật).

### Khởi tạo schema + dữ liệu mẫu (khuyến nghị)

Trong `backend/doc/sql/` có **hai file điều phối** (gọi lần lượt các script nhỏ bằng `:r` — cần **SSMS bật SQLCMD Mode** hoặc lệnh **`sqlcmd`**):

| Thứ tự | File | Nội dung |
|--------|------|----------|
| 1 | **`01_yumegoji_database_DDL.sql`** | Tạo DB (nếu thiếu), bảng, SP, patch cấu trúc — bắt đầu bằng `yumegoji-schema-sqlserver.sql`. |
| 2 | **`02_yumegoji_database_seed.sql`** | Dữ liệu mẫu (game, câu hỏi, lesson mẫu, bcrypt admin, …). |

**SSMS:** Query → **SQLCMD Mode** → mở `01_…` → Execute (F5) → mở `02_…` → Execute. Thư mục làm việc khi mở file nên là `backend/doc/sql` (đường dẫn `.\tên-file.sql` trong `:r` mới đúng).

**sqlcmd** (đổi mật khẩu cho khớp `docker-compose` / `.env`):

```powershell
cd E:\EXE201\EXE201\backend\doc\sql
sqlcmd -S localhost,14333 -U sa -P "Yumegoji_Sql_2024!" -d master -i 01_yumegoji_database_DDL.sql
sqlcmd -S localhost,14333 -U sa -P "Yumegoji_Sql_2024!" -d YumegojiDB -i 02_yumegoji_database_seed.sql
```

- **`YumegojiDB-AllScripts.sql`:** bản snapshot cũ, **chỉ tham khảo** — luồng mới dùng `01` + `02`.
- Trước khi chạy **`seed_powerup_starter_inventory.sql`** (được gọi từ `02`): mở file con và đổi **`@user_id`** nếu không phải user `1`.

### SQL Server bằng Docker (tuỳ chọn)

- **Container:** `yumegoji-sql` (trong `docker-compose.yml`). **Database** bên trong vẫn tên **`YumegojiDB`** (tạo bởi script `01`).
- Mật khẩu **`sa`** trong Docker: `MSSQL_SA_PASSWORD` trong **`.env`** hoặc mặc định trong compose (xem `docker-compose.yml`). SQL trên Linux **thường từ chối** mật khẩu quá yếu (vd. chỉ `12345`).

**Terminal** (hoặc tương đương trong Docker Desktop):

```bash
docker compose up -d
```

Đợi **20–40 giây**. Docker Desktop → **Containers** → trạng thái **Running**.

1. Kết nối **SSMS**: `localhost,14333`, SQL Auth, `sa` + mật khẩu trùng compose.
2. Chạy **`01_yumegoji_database_DDL.sql`** rồi **`02_yumegoji_database_seed.sql`** (như bảng trên).
3. Chạy API trỏ vào SQL Docker:

   ```bash
   cd backend
   dotnet run --launch-profile Docker
   ```

   Hoặc `ASPNETCORE_ENVIRONMENT=Docker` rồi `dotnet run` — .NET gộp `appsettings.json` + **`appsettings.Docker.json`**.

Đổi mật khẩu trong `.env` / compose thì sửa **cùng** giá trị trong `appsettings.Docker.json` và lệnh `sqlcmd`.

## 2. Chạy backend (API)

```bash
cd backend
dotnet restore
dotnet run
```

- Profile mặc định (HTTP): **http://localhost:5056**
- Swagger: **http://localhost:5056/swagger**

Cổng có thể khác nếu bạn đổi trong `Properties/launchSettings.json`.

## 3. Chạy frontend (React)

```bash
cd frontend
npm install
npm run dev
```

- Mã nguồn trong **`frontend/src/`**: `api/` (`client.js` = env + đường dẫn Auth + axios; cùng các `*Api.js`, `chatHub.js`, …), `services/` (gọi `*Api` + chuẩn hóa dữ liệu / storage), `layout/`, `ui/`, `components/`, `pages/`, `context/`, `hooks/`, `data/`, `utils/`, `redux/` (dự phòng), `routes/`.
- Ứng dụng web: **http://localhost:8080**
- Vite proxy chuyển `/api` và `/hubs` sang backend (mặc định `http://localhost:5056` — xem `vite.config.js`, biến `VITE_PROXY_TARGET`).

**Khuyến nghị:** Sao chép `.env.example` → `.env`. Để **trống** `VITE_API_URL` khi dev để mọi request đi qua proxy (tránh lỗi CORS / sai cổng). Chỉ set `VITE_API_URL` khi cần gọi thẳng API (deploy tách domain).

## 4. AI import bài học (Moderator)

- **OpenAI:** đặt `OpenAI:ApiKey` trong cấu hình (xem thêm `backend/OPENAI-CAU-HINH.txt`).
- **Ollama (local):** chạy `ollama serve`, `ollama pull llama3.2` (hoặc model bạn cấu hình). Trong `appsettings.json`: `Ollama:BaseUrl`, `LessonImport:Provider` (`auto` / `openai` / `ollama`), `LessonImport:OllamaMaxSourceChars` (tối đa 48000).

Upload PDF/DOCX/PPTX có thể mất vài phút — frontend đã cấu hình timeout proxy dài cho import.

## 5. Build production (tham khảo)

```bash
# Frontend
cd frontend
npm run build
# Thư mục output: dist/

# Backend
cd backend
dotnet publish -c Release -o ./publish
```

Triển khai thực tế cần cấu hình `VITE_API_URL`, HTTPS, connection string và bí mật JWT qua biến môi trường hoặc secret store — không hard-code trong repo.

## 6. Script SQL (thư mục `backend/doc/sql/`)

- **Luồng khuyến nghị:** `01_yumegoji_database_DDL.sql` → `02_yumegoji_database_seed.sql` (xem mục 1).
- Script lẻ (`patch_*`, `seed_*`, …) vẫn giữ để sửa từng phần; hai file `01`/`02` chỉ định **thứ tự chạy**.
- **`YumegojiDB-AllScripts.sql`:** bản gộp cũ; có thể tái tạo bằng (nếu còn script):

  ```powershell
  cd backend/doc/sql
  powershell -File build-yumegoji-consolidated.ps1
  ```

  Không bắt buộc dùng file này nếu đã chạy `01` + `02`.

## Liên kết

- Repository: [vinhhntse180198/Yumegoji-EXE201](https://github.com/vinhhntse180198/Yumegoji-EXE201)

---

*Nếu lỗi kết nối API từ trình duyệt: kiểm tra backend đang chạy đúng cổng, `VITE_PROXY_TARGET` / `VITE_API_URL` và tắt tường lửa chặn localhost.*
