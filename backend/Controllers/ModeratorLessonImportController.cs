using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Trích tài liệu + (tùy chọn) sinh bài học / quiz bằng AI — chỉ moderator/admin.</summary>
[ApiController]
[Route("api/moderator/lessons/import")]
[Authorize(Policy = AuthPolicies.Staff)]
public class ModeratorLessonImportController : ControllerBase
{
    /// <summary>Trả về gần như toàn bộ văn bản trích (tránh cắt sớm khi tài liệu dài).</summary>
    private const int ExtractResponseMaxChars = 2_000_000;
    private const int ExtractPreviewMaxChars = 2_000;

    private static readonly string[] UploadDocumentExtensions = { ".pdf", ".docx", ".pptx" };

    private readonly ILessonAiImportService _aiImport;
    private readonly ILearningService _learning;
    private readonly IWebHostEnvironment _env;

    public ModeratorLessonImportController(
        ILessonAiImportService aiImport,
        ILearningService learning,
        IWebHostEnvironment env)
    {
        _aiImport = aiImport;
        _learning = learning;
        _env = env;
    }

    private int? GetOptionalUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) && id > 0 ? id : null;
    }

    /// <summary>Trích văn bản từ PDF/DOCX/PPTX hoặc text dán — không gọi AI, không cần ApiKey.</summary>
    [HttpPost("extract-text")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(32_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 32_000_000)]
    public async Task<ActionResult<ExtractLessonTextResponseDto>> ExtractText(
        [FromForm] GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        try
        {
            var (plain, err) = await TryBuildPlainFromFormAsync(form, cancellationToken);
            if (err != null)
                return BadRequest(new { message = err });

            var truncated = plain!.Length > ExtractResponseMaxChars;
            var body = truncated ? plain.Substring(0, ExtractResponseMaxChars) : plain;
            var previewLen = Math.Min(body.Length, ExtractPreviewMaxChars);
            var preview = previewLen < body.Length ? body.Substring(0, previewLen) + "…" : body;

            return Ok(new ExtractLessonTextResponseDto
            {
                CharacterCount = body.Length,
                Preview = preview,
                PlainText = body,
                Truncated = truncated,
                Warning = truncated
                    ? $"Nội dung chỉ trả về tối đa {ExtractResponseMaxChars:N0} ký tự đầu; phần sau bị cắt."
                    : null,
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, new { message = "Yêu cầu bị hủy hoặc hết thời gian chờ." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message =
                    "Lỗi khi trích văn bản (có thể file .pptx lỗi hoặc quá phức tạp). Thử PDF/.docx hoặc dán text. Chi tiết: "
                    + ex.Message,
            });
        }
    }

    /// <summary>Lưu PDF/DOCX/PPTX lên wwwroot/uploads — không trích chữ; trả URL tĩnh để chèn vào HTML bài học.</summary>
    [HttpPost("upload-document")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(32_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 32_000_000)]
    // Không dùng [FromForm] trên IFormFile — Swashbuckle ném SwaggerGeneratorException khi sinh swagger.json.
    public async Task<IActionResult> UploadDocument(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Gửi file .pdf / .docx / .pptx (form field: file)." });

        var safeName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(safeName))
            return BadRequest(new { message = "Tên file không hợp lệ." });

        var ext = Path.GetExtension(safeName);
        if (string.IsNullOrEmpty(ext) ||
            !UploadDocumentExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Chỉ cho phép .pdf, .docx hoặc .pptx." });
        }

        var uploadsRoot = _env.WebRootPath;
        if (string.IsNullOrWhiteSpace(uploadsRoot))
            uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

        var dir = Path.Combine(uploadsRoot, "uploads");
        if (!Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var url = $"/uploads/{storedName}";
        return Ok(new { url, originalFileName = safeName });
    }

    /// <summary>Upload PDF/DOCX hoặc gửi text — trích nội dung và gọi AI sinh bản nháp JSON.</summary>
    [HttpPost("generate-draft")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(32_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 32_000_000)]
    public async Task<ActionResult<GenerateLessonDraftResponseDto>> GenerateDraft(
        [FromForm] GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        var (plain, err) = await TryBuildPlainFromFormAsync(form, cancellationToken);
        if (err != null)
            return BadRequest(new { message = err });

        try
        {
            var lessonKind = form?.LessonKind?.Trim();
            var dto = await _aiImport.GenerateDraftAsync(plain!, lessonKind, cancellationToken);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Lưu bài học mới (chưa publish hoặc publish) kèm từ vựng / ngữ pháp / kanji / quiz.</summary>
    [HttpPost("create-from-draft")]
    public async Task<ActionResult<LessonFullDetailDto>> CreateFromDraft(
        [FromBody] StaffCreateLessonFromDraftRequest body)
    {
        try
        {
            var full = await _learning.StaffCreateLessonFromDraftAsync(body, GetOptionalUserId());
            return Ok(full);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<(string? Plain, string? ErrorMessage)> TryBuildPlainFromFormAsync(
        GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        form ??= new GenerateLessonDraftForm();
        var file = form.File;
        var trimmedText = (form.Text ?? "").Trim();

        var plain = "";

        if (file != null && file.Length > 0)
        {
            await using var ms = new MemoryStream();
            await file.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;
            plain = LessonDocumentTextExtractor.Extract(ms, file.FileName, out var extractError);
            if (!string.IsNullOrEmpty(extractError) && string.IsNullOrWhiteSpace(plain))
                return (null, extractError);
        }

        /* Gộp file + ô dán: trước đây chỉ dùng text khi file trích rỗng → moderator dán thêm vẫn bị mất. */
        if (string.IsNullOrWhiteSpace(plain))
            plain = trimmedText;
        else if (trimmedText.Length > 0)
        {
            if (!plain.Contains(trimmedText, StringComparison.Ordinal))
                plain = plain + "\n\n" + trimmedText;
        }

        if (string.IsNullOrWhiteSpace(plain))
        {
            var msg = file is { Length: > 0 }
                ? "Không trích được chữ từ file (slide có thể chỉ là ảnh, hoặc chữ nằm ngoài định dạng thường). Hãy thử: dán nội dung vào ô bên cạnh (gửi kèm file), xuất PDF/.docx, hoặc thêm ghi chú slide (Notes)."
                : "Gửi file .pdf / .docx / .pptx hoặc trường form text có nội dung.";
            return (null, msg);
        }

        return (plain, null);
    }
}
