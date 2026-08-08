import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import {
  categoriesApi,
  eventsApi,
  uploadsApi,
  type CategoryDTO,
  type EventPayload,
} from '../lib/api'; // Backend Python (FastAPI) — không còn gọi Supabase trực tiếp

import {
  ArrowLeft,
  Image,
  Info,
  Calendar,
  FileText,
  FolderOpen,
  UploadCloud,
  MapPin,
  Sparkles,
  FilePlus,
} from 'lucide-react';
import { TopNav } from '../components/top-nav';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode;
  title: string;
  required?: boolean;
  children: React.ReactNode;
}

function Card({ icon, title, required, children }: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100">
        <span className="text-primary">{icon}</span>
        <span className="font-semibold text-slate-700 text-xs">{title}</span>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

function FieldLabel({ label, required }: FieldLabelProps) {
  return (
    <label className="block text-[11px] font-semibold tracking-wider text-slate-500 mb-1 uppercase">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white';

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateEvent() {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);

  // Ảnh bìa: preview hiển thị tại chỗ, bannerUrl là URL thật do backend trả về
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Tài liệu kế hoạch sự kiện: tệp lên bucket `event_plan`, URL lưu vào cột `file_url`
  const [planFileName, setPlanFileName] = useState<string | null>(null);
  const [planFileUrl, setPlanFileUrl] = useState<string | null>(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([]);

  // Gom toàn bộ state của form nhập liệu
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    capacity: '',
    registration_deadline: '',
    description: '',
  });

  // Lấy danh mục + gợi ý địa điểm từ Backend khi trang vừa load
  useEffect(() => {
    let cancelled = false;

    async function loadDropdownData() {
      try {
        const [cats, locations] = await Promise.all([
          categoriesApi.list(),
          eventsApi.locations(),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setSuggestedLocations(locations);
      } catch (err) {
        console.error('Lỗi tải dữ liệu danh mục / địa điểm:', err);
      }
    }

    loadDropdownData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- UPLOAD ẢNH BÌA QUA BACKEND (backend đẩy lên Supabase Storage) ---
  const uploadCover = async (file: File) => {
    setCoverImage(URL.createObjectURL(file)); // preview ngay lập tức
    setUploadingBanner(true);
    try {
      const result = await uploadsApi.banner(file);
      setBannerUrl(result.url);
    } catch (err) {
      console.error('Lỗi tải ảnh bìa:', err);
      alert(err instanceof Error ? err.message : 'Không tải được ảnh bìa.');
      setCoverImage(null);
      setBannerUrl(null);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadCover(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCover(file);
    }
  };

  // --- UPLOAD TÀI LIỆU KẾ HOẠCH → bucket event_plan ---
  const handlePlanChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlan(true);
    try {
      const result = await uploadsApi.eventPlan(file);
      setPlanFileUrl(result.url);
      setPlanFileName(file.name);
    } catch (err) {
      console.error('Lỗi tải tệp kế hoạch:', err);
      alert(err instanceof Error ? err.message : 'Không tải được tệp kế hoạch.');
    } finally {
      setUploadingPlan(false);
    }
  };

  // --- HÀM XỬ LÝ LƯU BẢN NHÁP HOẶC TẠO SỰ KIỆN ---
  const handleSaveEvent = async (statusType: 'DRAFT' | 'PENDING') => {
    if (submitting) return;

    // Ghép ngày và giờ thành chuẩn ISO để backend parse
    const startDateTime =
      formData.start_date && formData.start_time
        ? `${formData.start_date}T${formData.start_time}:00`
        : null;

    const endDateTime =
      formData.end_date && formData.end_time
        ? `${formData.end_date}T${formData.end_time}:00`
        : null;

    const payload: EventPayload = {
      title: formData.title || (statusType === 'DRAFT' ? 'Sự kiện chưa có tên' : ''),
      category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
      location: formData.location || null,
      start_time: startDateTime,
      end_time: endDateTime,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      registration_deadline: formData.registration_deadline || null,
      description: formData.description || null,
      banner_url: bannerUrl,
      file_url: planFileUrl,
      event_status: statusType, // 'DRAFT' cho lưu nháp, 'PENDING' cho tạo sự kiện chờ duyệt
    };

    setSubmitting(true);
    try {
      await eventsApi.create(payload);
      alert(statusType === 'DRAFT' ? 'Đã lưu bản nháp thành công!' : 'Tạo sự kiện thành công!');
      navigate('/');
    } catch (err) {
      console.error('Lỗi khi lưu sự kiện:', err);
      alert('Có lỗi xảy ra: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* ── Header ── */}
        <div>
          <Link to="/">
            <button className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 cursor-pointer hover:text-primary transition-colors mb-3 uppercase">
              <ArrowLeft size={13} />
              Quay lại Dashboard
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">Tạo Sự Kiện Mới</h1>
              <p className="text-xs text-slate-400 mt-0.5">Điền các thông tin chi tiết để thiết lập sự kiện của bạn.</p>
            </div>
            {/* Nút Lưu bản nháp */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveEvent('DRAFT')}
              className="shrink-0 mt-0.5 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              Lưu bản nháp
            </button>
          </div>
        </div>

        {/* ── Card 1: Cover Image ── */}
        <Card icon={<Image size={15} />} title="Ảnh bìa sự kiện">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center py-8 gap-1.5
              ${dragOver
                ? 'border-primary bg-primary/10'
                : 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50'
              }`}
          >
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="max-h-36 rounded-lg object-cover" />
            ) : (
              <>
                <UploadCloud size={30} className="text-primary/70" />
                <p className="text-xs font-semibold text-primary">Nhấn để tải lên hoặc kéo thả tệp</p>
                <p className="text-[11px] text-slate-400">SVG, PNG, JPG hoặc GIF (tối đa 800x400px)</p>
              </>
            )}
          </div>
          {uploadingBanner && (
            <p className="mt-2 text-[11px] text-slate-400">Đang tải ảnh lên máy chủ...</p>
          )}
        </Card>

        {/* ── Card 2: Basic Info ── */}
        <Card icon={<Info size={15} />} title="Thông tin cơ bản">
          <div className="space-y-3">
            <div>
              <FieldLabel label="Tên sự kiện" required />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={inputCls}
                placeholder="VD: Hội thảo Công nghệ Thường niên 2024"
              />
            </div>
            <div>
              <FieldLabel label="Lĩnh vực / Danh mục" required />
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className={inputCls}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel label="Địa điểm" required />
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  list="location-list"
                  className={`${inputCls} pl-8`}
                  placeholder="Tìm kiếm tòa nhà, phòng học..."
                />
                <datalist id="location-list">
                  {suggestedLocations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Card 3: Time & Logistics ── */}
        <Card icon={<Calendar size={15} />} title="Thời gian & Hậu cần">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            <div>
              <FieldLabel label="Ngày & Giờ Bắt đầu" required />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={`${inputCls} w-28`}
                />
              </div>
            </div>
            <div>
              <FieldLabel label="Ngày & Giờ Kết thúc" required />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className={`${inputCls} w-28`}
                />
              </div>
            </div>
            <div>
              <FieldLabel label="Số lượng tham gia tối đa" />
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min={1}
                className={inputCls}
                placeholder="Để trống nếu không giới hạn"
              />
            </div>
            <div>
              <FieldLabel label="Hạn chót đăng ký" required />
              <input
                type="datetime-local"
                name="registration_deadline"
                value={formData.registration_deadline}
                onChange={handleInputChange}
                className={inputCls}
              />
            </div>
          </div>
        </Card>

        {/* ── Card 4: Description ── */}
        <Card icon={<FileText size={15} />} title="Mô tả sự kiện">
          <div className="space-y-2.5">
            <button type="button" className="flex cursor-pointer items-center gap-1.5 border border-primary text-primary rounded-full px-3.5 py-1 text-xs font-medium hover:bg-primary/5 transition-colors">
              <Sparkles size={13} />
              Viết mô tả bằng AI
            </button>
            <textarea
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${inputCls} resize-none`}
              placeholder="Cung cấp thông tin chi tiết về nội dung sự kiện, diễn giả và các yêu cầu đối với người tham gia..."
            />
          </div>
        </Card>

        {/* ── Card 5: Event Plan ── */}
        <Card icon={<FolderOpen size={15} />} title="Kế hoạch sự kiện" required>
          <input
            ref={planInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handlePlanChange}
          />
          <button
            type="button"
            onClick={() => planInputRef.current?.click()}
            className="flex items-center cursor-pointer gap-1.5 border border-primary text-primary rounded-lg px-3.5 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors"
          >
            <FilePlus size={14} />
            Thêm tệp
          </button>
          {uploadingPlan && (
            <p className="mt-2 text-[11px] text-slate-400">Đang tải tệp lên máy chủ...</p>
          )}
          {planFileName && !uploadingPlan && (
            <p className="mt-2 text-[11px] text-slate-500">Đã đính kèm: {planFileName}</p>
          )}
        </Card>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-4">
          <Link to="/">
            <button type="button" className="text-xs cursor-pointer font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1.5">
              Hủy bỏ
            </button>
          </Link>
          {/* Nút tạo sự kiện chính thức (gửi lên Backend với trạng thái PENDING chờ duyệt) */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSaveEvent('PENDING')}
            className="bg-primary cursor-pointer hover:bg-primary-700 text-white font-semibold text-xs rounded-lg px-5 py-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Tạo sự kiện ngay'}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 pb-2">
          © 2024 UniEvent Portal. Nền tảng quản lý sự kiện Đại học.
        </p>
      </main>
    </div>
  );
}