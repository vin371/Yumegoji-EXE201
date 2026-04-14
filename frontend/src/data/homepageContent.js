/** Ảnh mẫu theo link bạn cung cấp */
const HERO_IMAGE_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLA_MHEzHCfY-5kJAe4FDu1hRrb1cV8NHy0Feg9-6lZRIuJ_BKNddEexbfLE4jLLSFx6X9wVv3oCoGH_WSyhiEAsixgZSbC2y6CcZdEaGw7YmAMT_cMLrHmrFJg88D8-k_HkZy3GxOCO_x84qngV-kvX7toI4QLvOLRtJjsRX33AXnJF_bCPRpxdskgpSn28L3bxC8YsnaxlBIOZx-QjyuT79Avq0u6IR0SniXpbuMVnU5qzJyocL5e7aWgN0vEhzOnp3VAj_51HM';
const WHY_IMAGE_CITY =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCYa70aIBMvItlNHTnzM7sykqn5DQDjN0OrK-nh3fcXoJZOQxuugTujAt6FlueOa_ikoTu02l_n5Rk1yk1jKk9pWAaanGXIjKvLI1vOPWAFBturyFynMXqEjXI-qLAuLnSMelKj6PDBXBGF5Zpit0U414HeBjhGwxNb_V0LBLJBQmXOYeUXZ8oFywUDa58_hWTJpDjQIKvhpRL2PlYebo3wgW7IeuFIxefNuz2py5dDBpm3TIEUpYD-uPFtfo8qxpKEBq5a1d0asP8';
const WHY_IMAGE_PAGODA =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDMdUJlcoHNdBGtmPJDJkJwMGaYgG06zDCDOiiWiCsMMLoKrqb3rf8TAEuQ1KciyyzEFd_A_22hoYrdvQ8RcU3BitbKELLG4Fq-2AuX4BLA-SJOtKHdnyVNfYIs94x6IcEqQh99md9PESE_lyiDsZ_3MlxLXaSzFugWqxuqJMiaNdCefVeo3SUdWnC7u0dl_smiJXNjnqIroIGqdvAMfhjTuc1M1cWpfaduwnEuC99ZK1gEu7ivoydFt5i0ktOWjgViitAhjQs185c';

export const HOMEPAGE_HERO = {
  badge: 'Chinh phục tiếng Nhật từ hôm nay',
  title: 'Học tiếng Nhật',
  highlight: 'Thật phong cách.',
  description:
    'Khám phá lộ trình học tiếng Nhật hiện đại, kết hợp tri thức văn hóa và công nghệ học tập để biến hành trình mỗi ngày thành trải nghiệm thú vị.',
  primaryCta: 'Bắt đầu học ngay',
  secondaryCta: 'Xem demo',
  metricLabel: 'Tiến độ tuần này',
  metricValue: '+120 Kanji mới',
  image: HERO_IMAGE_SRC,
};

export const HOMEPAGE_METHOD = {
  title: 'Phương pháp Hanami độc bản',
  subtitle: 'Chúng tôi tái định nghĩa cách bạn tiếp cận ngôn ngữ thông qua sự kết hợp giữa tương tác và giải trí.',
  features: [
    {
      title: 'Học tập',
      icon: '📚',
      description:
        'Bài giảng có cấu trúc theo năng lực, bám sát JLPT và có bài tập tương tác giúp ghi nhớ từ vựng nhanh.',
      linkLabel: 'Tìm hiểu thêm',
    },
    {
      title: 'Trò chuyện',
      icon: '💬',
      description:
        'Luyện phản xạ hội thoại cùng cộng đồng học viên và giáo viên để tự tin giao tiếp trong ngữ cảnh thực tế.',
      linkLabel: 'Thử ngay',
    },
    {
      title: 'Trò chơi',
      icon: '🎮',
      description:
        'Mini-game theo chủ điểm giúp ôn Kanji, từ vựng và mẫu câu theo cách vui hơn, nhớ lâu hơn.',
      linkLabel: 'Khám phá kho game',
    },
  ],
};

export const HOMEPAGE_WHY = {
  title: 'Tại sao chọn Sakura Nihongo?',
  /** Thứ tự: đường phố hiện đại · chùa / biển (theo mockup hình 5) */
  images: [WHY_IMAGE_CITY, WHY_IMAGE_PAGODA],
  items: [
    {
      title: 'Đội ngũ giáo viên Top-tier',
      description:
        'Giáo viên có kinh nghiệm luyện thi JLPT và tập trung sửa lỗi phát âm, ngữ điệu theo từng học viên.',
    },
    {
      title: 'Lộ trình cá nhân hóa',
      description: 'Hệ thống theo dõi tiến độ và gợi ý nội dung phù hợp để bạn học đúng phần còn yếu.',
    },
    {
      title: 'Hỗ trợ 24/7',
      description: 'Đồng hành giải đáp trong suốt quá trình học để bạn không bị ngắt mạch tiến bộ.',
    },
  ],
};

export const HOMEPAGE_TESTIMONIALS = {
  title: 'Cảm nhận của học viên',
  subtitle: 'Hơn 50,000 học viên đã bắt đầu hành trình và thành công.',
  items: [
    {
      name: 'Minh Anh',
      level: 'Học viên N5',
      quote:
        'Lộ trình N5 rất dễ theo dõi, mỗi ngày mình học một ít nhưng vẫn thấy tiến bộ đều.',
    },
    {
      name: 'Hoàng Nam',
      level: 'Học viên N3',
      quote:
        'Lớp luyện nói giúp mình tự tin giao tiếp hơn trong công việc. Mình tiến bộ rõ chỉ sau vài tháng.',
    },
    {
      name: 'Thu Thảo',
      level: 'Học viên N4',
      quote:
        'Nội dung N4 được sắp theo tuần rất rõ ràng, học xong là mình ôn lại được ngay.',
    },
  ],
};

export const HOMEPAGE_CTA = {
  title: 'Sẵn sàng để bắt đầu chưa?',
  subtitle: 'Nhận ngay ưu đãi 30% cho khóa học đầu tiên khi đăng ký tài khoản trong hôm nay.',
  button: 'Tạo tài khoản ngay',
};
