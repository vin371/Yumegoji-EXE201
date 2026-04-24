# Build context = gốc repo (Railway / docker build -f Dockerfile .)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/backend.csproj backend/
WORKDIR /src/backend
RUN dotnet restore backend.csproj
COPY backend/ .
RUN dotnet publish backend.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
CMD ["/bin/sh", "-c", "exec dotnet backend.dll --urls \"http://0.0.0.0:${PORT:-8080}\""]
