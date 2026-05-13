/**
 * Lấy thông báo lỗi hiển thị cho người dùng: ưu tiên `response.data.message` từ API,
 * nếu không thì dịch các lỗi axios/network phổ biến sang tiếng Việt.
 */
export function getErrorMessageForUser(err, fallbackVi = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  const api = err?.response?.data?.message;
  if (typeof api === 'string' && api.trim()) return api.trim();

  const raw = err?.message;
  if (typeof raw !== 'string') return fallbackVi;

  const m = raw.toLowerCase();
  if (m.includes('network error')) {
    return 'Không kết nối được máy chủ. Kiểm tra mạng hoặc đảm bảo API backend đang chạy.';
  }
  if (m.includes('timeout')) {
    return 'Hết thời gian chờ. Vui lòng thử lại.';
  }
  if (m.includes('502')) {
    return 'Máy chủ chưa phản hồi (502). Kiểm tra backend có đang chạy không.';
  }
  if (m.includes('503')) {
    return 'Dịch vụ tạm không khả dụng (503). Thử lại sau.';
  }
  if (m.includes('500')) {
    return 'Lỗi máy chủ (500). Vui lòng thử lại sau.';
  }
  if (m.includes('401')) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (m.includes('403')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (m.includes('404')) {
    return 'Không tìm thấy dữ liệu.';
  }

  return fallbackVi;
}
