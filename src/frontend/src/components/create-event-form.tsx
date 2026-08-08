/**
 * GHI CHÚ REFACTOR
 * ----------------
 * File gốc `events-data.ts` chứa component `CreateEventForm` — trùng chức năng với
 * `pages/create-event.tsx`. Bản này giữ nguyên HTML/CSS cũ nhưng đã bỏ toàn bộ
 * supabase-js, thay bằng các hàm gọi Backend Python.
 *
 * Khuyến nghị: đổi tên file thành `create-event-form.tsx` (file .ts không chứa được JSX),
 * hoặc xoá hẳn nếu dự án chỉ dùng `pages/create-event.tsx`.
 */
import { useEffect, useState } from 'react'
import { categoriesApi, eventsApi, type CategoryDTO, type EventPayload } from '../lib/api'

export default function CreateEventForm() {
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    location: '',
    start_time: '',
    end_time: '',
    registration_deadline: '',
    capacity: '',
    description: '',
    banner_url: '',
    file_url: '',
  })

  // --- HÀM XỬ LÝ KHI NGƯỜI DÙNG GÕ VÀO CÁC Ô INPUT ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // --- GỬI DỮ LIỆU LÊN BACKEND PYTHON (backend mới ghi vào Supabase) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const payload: EventPayload = {
      title: formData.title,
      category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
      location: formData.location,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      registration_deadline: formData.registration_deadline || null,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      description: formData.description,
      banner_url: formData.banner_url || null,
      file_url: formData.file_url || null,
      event_status: 'PENDING',
    }

    setSubmitting(true)
    try {
      const created = await eventsApi.create(payload)
      console.log('Tạo sự kiện thành công!', created)
      alert('Tạo sự kiện thành công!')
    } catch (err) {
      console.error('Lỗi khi tạo sự kiện:', err)
      alert('Có lỗi xảy ra: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  // --- LẤY DANH MỤC + GỢI Ý ĐỊA ĐIỂM TỪ BACKEND ---
  useEffect(() => {
    let cancelled = false

    async function fetchDropdownData() {
      try {
        const [cats, locations] = await Promise.all([
          categoriesApi.list(),
          eventsApi.locations(),
        ])
        if (cancelled) return
        setCategories(cats)
        setSuggestedLocations(locations)
      } catch (err) {
        console.error('Lỗi tải dữ liệu danh mục / địa điểm:', err)
      }
    }

    fetchDropdownData()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">Tạo Sự Kiện Mới</h2>
      <p className="text-gray-500 mb-6">Điền các thông tin chi tiết để thiết lập sự kiện của bạn.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* THÔNG TIN CƠ BẢN */}
        <div className="border p-4 rounded-md space-y-4">
          <h3 className="font-semibold text-lg text-gray-700">Thông tin cơ bản</h3>

          {/* Tên sự kiện */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TÊN SỰ KIỆN *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="VD: Hội thảo Công nghệ Thường niên 2024"
              className="w-full border rounded-md p-2"
              required
            />
          </div>

          {/* Lĩnh vực / Danh mục */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LĨNH VỰC / DANH MỤC *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className="w-full border rounded-md p-2 bg-white"
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Địa điểm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ĐỊA ĐIỂM *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              list="location-list"
              placeholder="Tìm kiếm tòa nhà, phòng học..."
              className="w-full border rounded-md p-2"
              required
            />
            {/* Gợi ý địa điểm lấy từ endpoint GET /api/events/locations */}
            <datalist id="location-list">
              {suggestedLocations.map((loc, index) => (
                <option key={index} value={loc} />
              ))}
            </datalist>
          </div>
        </div>

        {/* THỜI GIAN & HẬU CẦN */}
        <div className="border p-4 rounded-md space-y-4">
          <h3 className="font-semibold text-lg text-gray-700">Thời gian & Hậu cần</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ngày giờ bắt đầu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NGÀY & GIỜ BẮT ĐẦU *</label>
              <input
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2"
                required
              />
            </div>

            {/* Ngày giờ kết thúc */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NGÀY & GIỜ KẾT THÚC *</label>
              <input
                type="datetime-local"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Số lượng tối đa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SỐ LƯỢNG THAM GIA TỐI ĐA</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min={1}
                placeholder="Để trống nếu không giới hạn"
                className="w-full border rounded-md p-2"
              />
            </div>

            {/* Hạn chót đăng ký */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HẠN CHÓT ĐĂNG KÝ *</label>
              <input
                type="datetime-local"
                name="registration_deadline"
                value={formData.registration_deadline}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2"
                required
              />
            </div>
          </div>
        </div>

        {/* MÔ TẢ SỰ KIỆN */}
        <div className="border p-4 rounded-md space-y-4">
          <h3 className="font-semibold text-lg text-gray-700">Mô tả sự kiện</h3>
          <div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Cung cấp thông tin chi tiết về nội dung sự kiện, diễn giả và các yêu cầu đối với người tham gia..."
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>

        {/* NÚT SUBMIT */}
        <div className="flex justify-end gap-4">
          <button type="button" className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100">
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Tạo sự kiện ngay'}
          </button>
        </div>
      </form>
    </div>
  )
}
