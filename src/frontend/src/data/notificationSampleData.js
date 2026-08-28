const SAMPLE_USER_ID = "22222222-2222-2222-2222-222222222222";

const SAMPLE_DEFINITIONS = [
  {
    notification_id: "91000000-0000-0000-0000-000000000001",
    event_id: "11111111-1111-1111-1111-111111111111",
    type: "REGISTRATION_CONFIRMED",
    title: "Đăng ký sự kiện thành công",
    content: "Bạn đã đăng ký thành công Hội thảo AI và Tương lai nghề nghiệp.",
    detail_content:
      "Đăng ký của bạn cho sự kiện “Hội thảo AI và Tương lai nghề nghiệp” đã được xác nhận. Sự kiện diễn ra lúc 08:00 ngày 25/08/2026 tại Hội trường I. Vui lòng có mặt trước 15 phút để hoàn tất thủ tục check-in.",
    is_read: false,
    minutes_ago: 8,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000002",
    event_id: "11111111-1111-1111-1111-111111111112",
    type: "EVENT_REMINDER",
    title: "Sự kiện sẽ bắt đầu vào ngày mai",
    content: "Workshop Kỹ năng viết CV sẽ bắt đầu lúc 13:30 ngày mai.",
    detail_content:
      "Nhắc bạn: Workshop Kỹ năng viết CV và phỏng vấn thực chiến sẽ bắt đầu lúc 13:30 ngày 20/08/2026 tại Phòng E101. Hãy chuẩn bị CV cá nhân và mang theo thẻ sinh viên để check-in.",
    is_read: false,
    minutes_ago: 35,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000003",
    event_id: "11111111-1111-1111-1111-111111111113",
    type: "EVENT_LOCATION_CHANGED",
    title: "Thay đổi địa điểm sự kiện",
    content: "Ngày hội Câu lạc bộ đã chuyển sang Nhà thi đấu đa năng.",
    detail_content:
      "Địa điểm tổ chức “Ngày hội Câu lạc bộ Sinh viên 2026” đã thay đổi từ Sân trường A sang Nhà thi đấu đa năng. Thời gian tổ chức vẫn giữ nguyên: 07:30 ngày 22/08/2026.",
    is_read: false,
    minutes_ago: 90,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000004",
    event_id: "11111111-1111-1111-1111-111111111114",
    type: "EVENT_TIME_CHANGED",
    title: "Cập nhật thời gian sự kiện",
    content: "Seminar An toàn thông tin được dời sang 09:00 ngày 28/08/2026.",
    detail_content:
      "Thời gian của “Seminar An toàn thông tin trong kỷ nguyên số” đã được điều chỉnh từ 08:00 sang 09:00 ngày 28/08/2026. Địa điểm vẫn là Hội trường B, cơ sở Nguyễn Văn Cừ.",
    is_read: true,
    minutes_ago: 210,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000005",
    event_id: "11111111-1111-1111-1111-111111111115",
    type: "EVENT_CANCELLED",
    title: "Sự kiện đã bị hủy",
    content: "Chương trình Tình nguyện Mùa hè xanh ngày 30/08 đã bị hủy.",
    detail_content:
      "Chương trình “Tình nguyện Mùa hè xanh – Chặng cuối 2026” dự kiến diễn ra ngày 30/08/2026 đã bị hủy do điều kiện thời tiết không bảo đảm. Ban tổ chức xin lỗi vì sự thay đổi này và sẽ cập nhật kế hoạch thay thế sau.",
    is_read: true,
    minutes_ago: 1_440,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000006",
    event_id: "11111111-1111-1111-1111-111111111116",
    type: "WAITLIST_JOINED",
    title: "Bạn đã vào danh sách chờ",
    content: "Cuộc thi Hackathon UniCode đã đủ chỗ và bạn đang ở danh sách chờ.",
    detail_content:
      "Sự kiện “Hackathon UniCode 2026” hiện đã đủ số lượng đăng ký. Bạn đã được thêm vào danh sách chờ. Hệ thống sẽ thông báo ngay khi bạn được chuyển sang danh sách tham gia chính thức.",
    is_read: false,
    minutes_ago: 2_880,
  },
  {
    notification_id: "91000000-0000-0000-0000-000000000007",
    event_id: "11111111-1111-1111-1111-111111111117",
    type: "WAITLIST_PROMOTED",
    title: "Bạn đã có chỗ tham gia sự kiện",
    content: "Bạn đã được chuyển từ danh sách chờ sang danh sách tham gia chính thức.",
    detail_content:
      "Một vị trí tại “Chuyến tham quan Doanh nghiệp Công nghệ 2026” vừa được mở. Bạn đã được tự động chuyển từ danh sách chờ sang danh sách tham gia chính thức. Vui lòng kiểm tra lại thông tin sự kiện và mã QR check-in.",
    is_read: false,
    minutes_ago: 4_320,
  },
];


function toCreatedAt(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}


export function getNotificationSampleList() {
  return SAMPLE_DEFINITIONS.map((item) => ({
    notification_id: item.notification_id,
    user_id: SAMPLE_USER_ID,
    event_id: item.event_id,
    type: item.type,
    title: item.title,
    content: item.content,
    is_read: item.is_read,
    created_at: toCreatedAt(item.minutes_ago),
    is_sample: true,
  }));
}


export function getNotificationSampleDetail(notificationId) {
  const definition = SAMPLE_DEFINITIONS.find(
    (item) => item.notification_id === notificationId,
  );

  if (!definition) return null;

  const { detail_content, minutes_ago, ...item } = definition;
  return {
    ...item,
    user_id: SAMPLE_USER_ID,
    content: detail_content,
    created_at: toCreatedAt(minutes_ago),
    is_sample: true,
  };
}

