import { useParams } from 'react-router-dom';
import { EventForm } from '../components/event-form';

/**
 * Trang xem chi tiết sự kiện — route: /organizer/events/:eventId
 * Dùng lại đúng form của trang tạo / sửa, nhưng ở chế độ chỉ xem:
 * mọi ô nhập bị khoá, không có nút lưu.
 */
export default function ViewEvent() {
  const { eventId } = useParams();

  return <EventForm mode="view" eventId={eventId} />;
}
