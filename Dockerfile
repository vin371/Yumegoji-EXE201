# Build context phải là gốc repo:
#   docker build -f Dockerfile .
# (Không chạy từ thư mục backend — sẽ lỗi COPY backend/...)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/backend.csproj backend/
WORKDIR /src/backend
RUN dotnet restore backend.csproj
COPY backend/ .
RUN dotnet publish backend.csproj -c Release -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /publish .
# Image aspnet:8.0 đã có user `app` (uid 1654); chạy không root
RUN chown -R app:app /app
USER app
EXPOSE 8080
# Railway gán biến PORT lúc runtime; local không có PORT thì dùng 8080
CMD ["/bin/sh", "-c", "exec dotnet backend.dll --urls http://0.0.0.0:${PORT:-8080}"]
