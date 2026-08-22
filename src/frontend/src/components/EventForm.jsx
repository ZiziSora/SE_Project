import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  categoriesApi,
  eventsApi,
  uploadsApi,
} from '../api/eventApi.js';
import { getStatusDisplay } from '../utils/eventManagementUtils.js';

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
  AlertTriangle,
} from 'lucide-react';
import OrganizerHeader from './common/OrganizerHeader.jsx';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ icon, title, required, children }) {
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

function FieldLabel({ label, required }) {
  return (
    <label className="block text-[11px] font-semibold tracking-wider text-slate-500 mb-1 uppercase">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// Các biến thể `disabled:` dành cho chế độ chỉ xem — mặc định trình duyệt sẽ làm
// chữ mờ đi rất khó đọc, nên ép lại màu chữ cho rõ.
const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white ' +
  'disabled:bg-slate-50 disabled:text-slate-600 disabled:opacity-100 disabled:cursor-default';

// ─── Helpers: ISO ↔ giá trị của input date / time / datetime-local ────────────

/**
 * Cột start_time / end_time trong DB là `timestamp` KHÔNG timezone, backend trả về
 * dạng "2026-08-08T09:00:00". Vì vậy chỉ cắt chuỗi thay vì dùng `new Date()` —
 * new Date() sẽ hiểu là UTC rồi đổi sang giờ máy, làm lệch mất vài tiếng.
 */
function isoToDatePart(iso) {
  return iso ? iso.slice(0, 10) : '';
}

function isoToTimePart(iso) {
  return iso ? iso.slice(11, 16) : '';
}

/** datetime-local cần đúng định dạng "yyyy-MM-ddTHH:mm" */
function isoToDatetimeLocal(iso) {
  return iso ? iso.slice(0, 16) : '';
}

// ─── Trường bắt buộc khi gửi yêu cầu xét duyệt ────────────────────────────────

/**
 * Phải khớp `REQUIRED_FOR_SUBMIT` trong
 * `backend/app/schemas/organizer_event.py` — sửa một bên thì sửa cả hai.
 * Sức chứa và mô tả KHÔNG bắt buộc (để trống = không giới hạn).
 */
const REQUIRED_FOR_SUBMIT = [
  ['title', 'Tên sự kiện'],
  ['category_id', 'Lĩnh vực / Danh mục'],
  ['location', 'Địa điểm'],
  ['start_time', 'Ngày và giờ bắt đầu'],
  ['end_time', 'Ngày và giờ kết thúc'],
  ['registration_deadline', 'Hạn chót đăng ký'],
  ['file_url', 'Tệp kế hoạch sự kiện'],
];

/** @returns {string[]} nhãn tiếng Việt của các trường còn trống */
function missingRequiredFields(payload) {
  return REQUIRED_FOR_SUBMIT.filter(([field]) => {
    const value = payload[field];
    return value === null || value === undefined || (typeof value === 'string' && !value.trim());
  }).map(([, label]) => label);
}

// ─── Component ────────────────────────────────────────────────────────────────

const emptyForm = {
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
};

/**
 * Form dùng chung cho cả 3 màn hình sự kiện.
 *
 * @param {object}  props
 * @param {'create'|'edit'|'view'} props.mode  'view' = chỉ xem, mọi ô nhập bị khoá
 * @param {string} [props.eventId]             Bắt buộc khi mode = 'edit' hoặc 'view'
 */
export function EventForm({ mode, eventId }) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const isView = mode === 'view';
  // Cả 'edit' lẫn 'view' đều phải nạp dữ liệu sự kiện từ backend
  const needsLoad = mode !== 'create';

  const [dragOver, setDragOver] = useState(false);

  // Ảnh bìa: coverImage để hiển thị, bannerUrl là URL thật đã lưu trên Storage
  const [coverImage, setCoverImage] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Tài liệu kế hoạch: tệp lên bucket `event_plan`, URL lưu vào cột `file_url`
  const [planFileName, setPlanFileName] = useState(null);
  const [planFileUrl, setPlanFileUrl] = useState(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(needsLoad);
  const [loadError, setLoadError] = useState(null);

  // Trạng thái hiện tại của sự kiện (chỉ có nghĩa ở mode edit / view)
  const [currentStatus, setCurrentStatus] = useState('DRAFT');
  const [requiresReapproval, setRequiresReapproval] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [registeredLabel, setRegisteredLabel] = useState('');

  const fileInputRef = useRef(null);
  const planInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [suggestedLocations, setSuggestedLocations] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  // ─── Nạp danh mục + gợi ý địa điểm ───
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

  // ─── Nạp dữ liệu sự kiện (dùng cho cả xem lẫn sửa) ───
  useEffect(() => {
    if (!needsLoad || !eventId) return;
    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setLoadError(null);
      try {
        const event = await eventsApi.get(eventId);
        if (cancelled) return;

        setFormData({
          title: event.title ?? '',
          category_id: event.category_id != null ? String(event.category_id) : '',
          location: event.location ?? '',
          start_date: isoToDatePart(event.start_time),
          start_time: isoToTimePart(event.start_time),
          end_date: isoToDatePart(event.end_time),
          end_time: isoToTimePart(event.end_time),
          capacity: event.capacity != null ? String(event.capacity) : '',
          registration_deadline: isoToDatetimeLocal(event.registration_deadline),
          description: event.description ?? '',
        });

        setBannerUrl(event.banner_url);
        setCoverImage(event.banner_url);
        setPlanFileUrl(event.file_url);
        if (event.file_url) {
          setPlanFileName(decodeURIComponent(event.file_url.split('/').pop() ?? ''));
        }
        setCurrentStatus(event.event_status);
        setRequiresReapproval(event.requires_reapproval);
        setCanEdit(event.can_edit);
        setRegisteredLabel(`${event.registered_count}/${event.capacity ?? '∞'}`);
      } catch (err) {
        console.error('Lỗi tải sự kiện:', err);
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được sự kiện.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [needsLoad, eventId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- UPLOAD ẢNH BÌA → bucket banner_event ---
  const uploadCover = async (file) => {
    const previousUrl = bannerUrl;
    setCoverImage(URL.createObjectURL(file)); // preview ngay lập tức
    setUploadingBanner(true);
    try {
      const result = await uploadsApi.banner(file);
      setBannerUrl(result.url);
    } catch (err) {
      console.error('Lỗi tải ảnh bìa:', err);
      toast.error(err instanceof Error ? err.message : 'Không tải được ảnh bìa.');
      // Trả về ảnh cũ thay vì xoá trắng — quan trọng khi đang sửa sự kiện có ảnh sẵn
      setCoverImage(previousUrl);
      setBannerUrl(previousUrl);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadCover(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCover(file);
    }
  };

  // --- UPLOAD TÀI LIỆU KẾ HOẠCH → bucket event_plan ---
  const handlePlanChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlan(true);
    try {
      const result = await uploadsApi.eventPlan(file);
      setPlanFileUrl(result.url);
      setPlanFileName(file.name);
    } catch (err) {
      console.error('Lỗi tải tệp kế hoạch:', err);
      toast.error(err instanceof Error ? err.message : 'Không tải được tệp kế hoạch.');
    } finally {
      setUploadingPlan(false);
    }
  };

  /**
   * Lưu: tạo mới hoặc cập nhật.
   * @param {'DRAFT'|'PENDING'|'KEEP'} targetStatus
   */
  const handleSave = async (targetStatus) => {
    if (submitting) return;

    // Ghép ngày + giờ thành chuỗi ISO không timezone, khớp cột `timestamp` của DB
    const startDateTime =
      formData.start_date && formData.start_time
        ? `${formData.start_date}T${formData.start_time}:00`
        : null;

    const endDateTime =
      formData.end_date && formData.end_time
        ? `${formData.end_date}T${formData.end_time}:00`
        : null;

    const payload = {
      title: formData.title || (targetStatus === 'DRAFT' ? 'Sự kiện chưa có tên' : ''),
      category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
      location: formData.location || null,
      start_time: startDateTime,
      end_time: endDateTime,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      registration_deadline: formData.registration_deadline || null,
      description: formData.description || null,
      banner_url: bannerUrl,
      file_url: planFileUrl,
    };

    // 'KEEP' = giữ nguyên trạng thái hiện tại, để backend tự quyết định có cần
    // duyệt lại hay không (sự kiện đang công khai sẽ tự về PENDING).
    if (targetStatus !== 'KEEP') {
      payload.event_status = targetStatus;
    }

    // Gửi yêu cầu xét duyệt thì bắt buộc phải đủ thông tin. Kiểm tra ngay tại
    // client để người dùng thấy thiếu gì mà không cần chờ round-trip; backend
    // vẫn kiểm tra lại lần nữa và là nơi quyết định cuối cùng.
    const willSubmitForApproval =
      targetStatus === 'PENDING' || (targetStatus === 'KEEP' && requiresReapproval);

    if (willSubmitForApproval) {
      const missing = missingRequiredFields(payload);
      if (missing.length > 0) {
        toast.error(`Thiếu thông tin bắt buộc: ${missing.join(', ')}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEdit && eventId) {
        const updated = await eventsApi.update(eventId, payload);
        if (updated.event_status === 'PENDING' && requiresReapproval) {
          toast.success('Đã gửi yêu cầu duyệt lại sự kiện thành công');
        } else if (updated.event_status === 'PENDING') {
          toast.success('Đã gửi yêu cầu xét duyệt sự kiện thành công');
        } else {
          toast.success('Đã cập nhật sự kiện thành công');
        }
      } else {
        await eventsApi.create(payload);
        toast.success(
          targetStatus === 'DRAFT'
            ? 'Đã lưu bản nháp thành công'
            : 'Đã gửi yêu cầu xét duyệt sự kiện thành công',
        );
      }
      navigate('/organizer');
    } catch (err) {
      console.error('Lỗi khi lưu sự kiện:', err);
      toast.error(err instanceof Error ? err.message : 'Không lưu được sự kiện.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Trạng thái nạp dữ liệu ───
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <OrganizerHeader />
        <p className="mt-16 text-center text-xs text-slate-400">Đang tải thông tin sự kiện...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <OrganizerHeader />
        <div className="mt-16 text-center">
          <p className="text-xs text-red-500">{loadError}</p>
          <Link to="/organizer" className="mt-3 inline-block text-xs font-semibold text-primary">
            Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = currentStatus === 'DRAFT';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OrganizerHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* ── Header ── */}
        <div>
          <Link to="/organizer">
            <button className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 cursor-pointer hover:text-primary transition-colors mb-3 uppercase">
              <ArrowLeft size={13} />
              Quay lại Dashboard
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">
                {isView ? 'Chi Tiết Sự Kiện' : isEdit ? 'Chỉnh Sửa Sự Kiện' : 'Tạo Sự Kiện Mới'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isView
                  ? 'Chế độ chỉ xem — nội dung không thể chỉnh sửa tại đây.'
                  : isEdit
                    ? 'Cập nhật thông tin sự kiện của bạn.'
                    : 'Điền các thông tin chi tiết để thiết lập sự kiện của bạn.'}
              </p>
              {/* Ở chế độ xem hiển thị thêm trạng thái và số người đăng ký */}
              {isView && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1 font-mono text-[11px] font-medium ${getStatusDisplay(currentStatus).className}`}
                  >
                    {getStatusDisplay(currentStatus).label}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Đã đăng ký: {registeredLabel}
                  </span>
                </div>
              )}
            </div>
            {/* Nút Lưu bản nháp: chỉ có ý nghĩa khi tạo mới hoặc sự kiện đang là nháp */}
            {!isView && (!isEdit || isDraft) && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave('DRAFT')}
                className="shrink-0 mt-0.5 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Lưu bản nháp
              </button>
            )}
          </div>
        </div>

        {/* ── Cảnh báo phải duyệt lại ── */}
        {isEdit && requiresReapproval && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700">
              Sự kiện này đang được công khai. Mọi thay đổi về nội dung sẽ đưa sự kiện về trạng thái{' '}
              <strong>Chờ duyệt</strong> và tạm ẩn khỏi danh sách đăng ký cho tới khi Admin duyệt lại.
            </p>
          </div>
        )}

        {/* fieldset disabled khoá TOÀN BỘ input / select / textarea / button bên trong
            chỉ bằng một thuộc tính — không phải rải `disabled` vào từng ô. */}
        <fieldset disabled={isView} className="space-y-4 m-0 border-0 p-0">

        {/* ── Card 1: Cover Image ── */}
        <Card icon={<Image size={15} />} title="Ảnh bìa sự kiện">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Vùng thả ảnh là <div> nên fieldset KHÔNG khoá được — phải tự chặn sự kiện */}
          <div
            onClick={() => { if (!isView) fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); if (!isView) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { if (isView) { e.preventDefault(); return; } handleDrop(e); }}
            className={`relative rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center py-8 gap-1.5
              ${isView
                ? 'cursor-default border-slate-200 bg-slate-50'
                : dragOver
                  ? 'cursor-pointer border-primary bg-primary/10'
                  : 'cursor-pointer border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50'
              }`}
          >
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="max-h-36 rounded-lg object-cover" />
            ) : isView ? (
              <p className="text-xs text-slate-400">Sự kiện chưa có ảnh bìa</p>
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
            {!isView && (
              <button type="button" className="flex cursor-pointer items-center gap-1.5 border border-primary text-primary rounded-full px-3.5 py-1 text-xs font-medium hover:bg-primary/5 transition-colors">
                <Sparkles size={13} />
                Viết mô tả bằng AI
              </button>
            )}
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
          {!isView && (
            <button
              type="button"
              onClick={() => planInputRef.current?.click()}
              className="flex items-center cursor-pointer gap-1.5 border border-primary text-primary rounded-lg px-3.5 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors"
            >
              <FilePlus size={14} />
              {planFileUrl ? 'Thay tệp khác' : 'Thêm tệp'}
            </button>
          )}
          {uploadingPlan && (
            <p className="mt-2 text-[11px] text-slate-400">Đang tải tệp lên máy chủ...</p>
          )}
          {!planFileUrl && !uploadingPlan && (
            <p className="mt-2 text-[11px] text-slate-400">
              {isView
                ? 'Sự kiện chưa có tệp kế hoạch đính kèm.'
                : 'Bắt buộc khi gửi duyệt. Chấp nhận PDF hoặc Word (.docx). Bản nháp có thể để trống.'}
            </p>
          )}
          {planFileUrl && !uploadingPlan && (
            <p className="mt-2 text-[11px] text-slate-500">
              Đã đính kèm:{' '}
              <a href={planFileUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                {planFileName || 'tài liệu kế hoạch'}
              </a>
            </p>
          )}
        </Card>

        </fieldset>

        {/* ── Footer Actions ── */}
        {isView ? (
          <div className="flex items-center justify-end gap-3 pt-1 pb-4">
            <Link to="/organizer">
              <button type="button" className="text-xs cursor-pointer font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1.5">
                Quay lại
              </button>
            </Link>
            {/* Chỉ mời sửa khi backend cho phép (can_edit) */}
            {canEdit && (
              <Link to={`/organizer/edit-event/${eventId}`}>
                <button
                  type="button"
                  className="bg-primary cursor-pointer hover:bg-primary-700 text-white font-semibold text-xs rounded-lg px-5 py-2 transition-colors shadow-sm"
                >
                  Chỉnh sửa sự kiện
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 pt-1 pb-4">
            <Link to="/organizer">
              <button type="button" className="text-xs cursor-pointer font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1.5">
                Hủy bỏ
              </button>
            </Link>
            <button
              type="button"
              disabled={submitting}
              // Tạo mới / nháp → gửi duyệt (PENDING).
              // Đang sửa sự kiện đã gửi duyệt hoặc đã công khai → 'KEEP', để backend
              // tự đưa về PENDING nếu nội dung thay đổi.
              onClick={() => handleSave(!isEdit || isDraft ? 'PENDING' : 'KEEP')}
              className="bg-primary cursor-pointer hover:bg-primary-700 text-white font-semibold text-xs rounded-lg px-5 py-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting
                ? 'Đang xử lý...'
                : !isEdit
                  ? 'Tạo sự kiện ngay'
                  : isDraft
                    ? 'Gửi duyệt'
                    : requiresReapproval
                      ? 'Lưu và gửi duyệt lại'
                      : 'Lưu thay đổi'}
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 pb-2">
          © 2024 UniEvent Portal. Nền tảng quản lý sự kiện Đại học.
        </p>
      </main>
    </div>
  );
}
