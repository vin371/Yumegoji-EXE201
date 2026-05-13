/**
 * Định nghĩa path và tên route dùng trong app
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PLACEMENT_TEST: '/placement-test',
  LEVEL_UP_TEST: '/level-up-test/:toLevel',
  ADMIN: '/admin',
  MODERATOR: '/moderator',
  CHAT: '/chat',
  UPGRADE: '/upgrade',
  PLAY: '/play',
  PLAY_LEADERBOARD: '/play/leaderboard',
  PLAY_ACHIEVEMENTS: '/play/achievements',
  PLAY_SHOP: '/play/shop',
  LEARN: '/learn',
  CHAT_ROOM: '/chat/room/:roomId',
  UNAUTHORIZED: '/unauthorized',
  ACCOUNT: '/account',
};

export const ROUTE_NAMES = {
  [ROUTES.HOME]: 'Trang chủ',
  [ROUTES.LOGIN]: 'Đăng nhập',
  [ROUTES.REGISTER]: 'Đăng ký',
  [ROUTES.FORGOT_PASSWORD]: 'Quên mật khẩu',
  [ROUTES.RESET_PASSWORD]: 'Đặt lại mật khẩu',
  [ROUTES.DASHBOARD]: 'Bảng điều khiển',
  [ROUTES.PLACEMENT_TEST]: 'Bài test đầu vào',
  [ROUTES.LEVEL_UP_TEST]: 'Thi nâng level',
  [ROUTES.ADMIN]: 'Quản trị',
  [ROUTES.MODERATOR]: 'Điều hành',
  [ROUTES.CHAT]: 'Trò chuyện',
  [ROUTES.UPGRADE]: 'Nâng cấp',
  [ROUTES.PLAY]: 'Trò chơi',
  [ROUTES.LEARN]: 'Học tập',
  [ROUTES.UNAUTHORIZED]: 'Không có quyền',
  [ROUTES.ACCOUNT]: 'Tài khoản',
};
