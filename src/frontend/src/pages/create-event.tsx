import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabase'; // Đảm bảo đường dẫn này đúng với file supabase client của bạn

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
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thêm state categories để lấy danh mục từ bảng event_categories nếu có, hoặc dùng danh sách tĩnh
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([]);

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

  // Lấy danh mục từ database khi trang vừa load
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('event_categories').select('category_id, name');
      if (error) {
        console.error('Lỗi tải danh mục:', error.message);
      } else {
        setCategories(data || []);
      }
    }
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(URL.createObjectURL(file));
      // Nếu bạn có làm upload storage, có thể xử lý ở đây để lấy URL ảnh gán vào banner_url
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(URL.createObjectURL(file));
    }
  };

  // --- HÀM XỬ LÝ LƯU BẢN NHÁP HOẶC TẠO SỰ KIỆN ---
  const handleSaveEvent = async (statusType: 'DRAFT' | 'PENDING') => {
    // Ghép ngày và giờ thành chuẩn timestamp ISO (hoặc giữ nguyên định dạng datetime của DB)
    const startDateTime = formData.start_date && formData.start_time 
      ? `${formData.start_date}T${formData.start_time}:00` 
      : null;
      
    const endDateTime = formData.end_date && formData.end_time 
      ? `${formData.end_date}T${formData.end_time}:00` 
      : null;

    const eventPayload = {
      title: formData.title || 'Sự kiện chưa có tên',
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      location: formData.location,
      start_time: startDateTime,
      end_time: endDateTime,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      registration_deadline: formData.registration_deadline || null,
      description: formData.description,
      event_status: statusType, // 'DRAFT' cho lưu nháp, 'PENDING' cho tạo sự kiện chờ duyệt
      banner_url: coverImage, // Hoặc link ảnh sau khi upload storage
    };

    const { error } = await supabase
      .from('events')
      .insert([eventPayload]);

    if (error) {
      console.error('Lỗi khi lưu sự kiện:', error.message);
      alert('Có lỗi xảy ra: ' + error.message);
    } else {
      alert(statusType === 'DRAFT' ? 'Đã lưu bản nháp thành công!' : 'Tạo sự kiện thành công!');
      // Điều hướng về trang Dashboard (hoặc trang danh sách sự kiện quản lý)
      navigate('/'); // Điều chỉnh lại đường dẫn `/` hoặc `/dashboard` tùy route của bạn
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
              onClick={() => handleSaveEvent('DRAFT')}
              className="shrink-0 mt-0.5 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap"
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
                  className={`${inputCls} pl-8`}
                  placeholder="Tìm kiếm tòa nhà, phòng học..."
                />
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
          <button type="button" className="flex items-center cursor-pointer gap-1.5 border border-primary text-primary rounded-lg px-3.5 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors">
            <FilePlus size={14} />
            Thêm tệp
          </button>
        </Card>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-4">
          <Link to="/">
            <button type="button" className="text-xs cursor-pointer font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1.5">
              Hủy bỏ
            </button>
          </Link>
          {/* Nút tạo sự kiện chính thức (status: PENDING hoặc PUBLISHED tùy quy trình của bạn) */}
          <button 
            type="button"
            onClick={() => handleSaveEvent('PENDING')}
            className="bg-primary cursor-pointer hover:bg-primary-700 text-white font-semibold text-xs rounded-lg px-5 py-2 transition-colors shadow-sm"
          >
            Tạo sự kiện ngay
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 pb-2">
          © 2024 UniEvent Portal. Nền tảng quản lý sự kiện Đại học.
        </p>
      </main>
    </div>
  );
}