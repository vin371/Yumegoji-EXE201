# Yumegoji / EXE201

Nền tảng học tiếng Nhật: backend **ASP.NET Core 8** (API + SignalR), frontend **React + Vite**, cơ sở dữ liệu **SQL Server**.

## Yêu cầu môi trường

| Thành phần | Phiên bản / ghi chú |
|------------|---------------------|
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/8.0) | **8.0** |
| [Node.js](https://nodejs.org/) | **18+** (khuyến nghị LTS) |
| SQL Server | Bản cài trên Windows **hoặc** Docker (xem mục Docker) |
| (Tuỳ chọn) [Ollama](https://ollama.com/) | Import bài học bằng AI khi không dùng OpenAI |
| (Tuỳ chọn) [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Chạy SQL Server trong container |

## Cấu trúc thư mục

```
EXE201/
├── backend/                 # API .NET (Swagger, JWT, upload PDF/DOCX/PPTX)
├── frontend/frontend/frontend/   # React + Vite (dev: cổng 8080)
├── docker-compose.yml       # SQL Server 2022 (cổng host 14333)
├── backend/doc/sql/         # Script SQL (gộp: YumegojiDB-AllScripts.sql)
└── README.md
```

## 1. Cơ sở dữ liệu (SQL Server)

1. Tạo database **`YumegojiDB`** (hoặc tên bạn chọn).
2. Chạy script schema + dữ liệu mẫu (khuyến nghị file gộp):

   `backend/doc/sql/YumegojiDB-AllScripts.sql`

   Trong **SSMS** hoặc **Azure Data Studio**, kết nối tới instance SQL của bạn rồi Execute toàn bộ file.

3. Sửa chuỗi kết nối trong **`backend/appsettings.json`** (hoặc `appsettings.Development.json`):

   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=...;Database=YumegojiDB;User Id=...;Password=...;TrustServerCertificate=True;"
   }
   ```

**Lưu ý bảo mật:** Không commit mật khẩu thật lên Git. Có thể dùng [User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) (`dotnet user-secrets`) hoặc file **`backend/appsettings.Secrets.json`** (đã được `Program.cs` đọc nếu tồn tại — nên thêm vào `.gitignore` nếu chứa bí mật).

### SQL Server bằng Docker (tuỳ chọn)

Tại thư mục gốc dự án:

```bash
docker compose up -d
```

- Kết nối: **`localhost,14333`** (user `sa`, mật khẩu theo `docker-compose.yml` hoặc biến `MSSQL_SA_PASSWORD` trong file `.env`).
- Sau đó chạy script SQL như trên và cập nhật `DefaultConnection` cho khớp (`Server=localhost,14333;...`).

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
cd frontend/frontend/frontend
npm install
npm run dev
```

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
cd frontend/frontend/frontend
npm run build
# Thư mục output: dist/

# Backend
cd backend
dotnet publish -c Release -o ./publish
```

Triển khai thực tế cần cấu hình `VITE_API_URL`, HTTPS, connection string và bí mật JWT qua biến môi trường hoặc secret store — không hard-code trong repo.

## 6. Script SQL & tái tạo file gộp

- Script lẻ nằm trong `backend/doc/sql/`.
- File gộp: `backend/doc/sql/YumegojiDB-AllScripts.sql` — tạo lại bằng PowerShell:

  ```powershell
  cd backend/doc/sql
  powershell -File build-yumegoji-consolidated.ps1
  ```

## Liên kết

- Repository: [vinhhntse180198/Yumegoji-EXE201](https://github.com/vinhhntse180198/Yumegoji-EXE201)

---

*Nếu lỗi kết nối API từ trình duyệt: kiểm tra backend đang chạy đúng cổng, `VITE_PROXY_TARGET` / `VITE_API_URL` và tắt tường lửa chặn localhost.*
