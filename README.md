# Smart University Event Ecosystem

Hệ thống quản lý sự kiện dành cho trường đại học, gồm:

- Frontend: React 19, Vite, Tailwind CSS 4.
- Backend: FastAPI, Pydantic, SQLAlchemy, Supabase.
- Database migration: Alembic.
- Kiểm thử backend: pytest.

Tài liệu này là quy ước chung cho toàn bộ repository. Mọi thành viên cần đọc trước khi tạo file, phát triển tính năng hoặc mở Pull Request.

## 1. Cài đặt và chạy dự án

### Yêu cầu

- Git.
- Node.js bản LTS.
- Python 3.10 trở lên.

### Backend

```powershell
cd src/backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tạo `src/backend/.env`:

```dotenv
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CORS_ORIGINS=http://localhost:5173
```

Chạy backend:

```powershell
cd src/backend
python main.py
```

Backend mặc định chạy tại `http://localhost:8000`; Swagger UI tại `http://localhost:8000/docs`.

### Frontend

```powershell
cd src/frontend
npm install
```

Tạo `src/frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Chạy frontend:

```powershell
cd src/frontend
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

> Không commit file `.env`, token, mật khẩu hoặc Supabase service-role key. Chỉ biến bắt đầu bằng `VITE_` mới được Vite đưa vào mã frontend, vì vậy không đặt secret trong các biến này.

## 2. Cấu trúc repository

```text
SE_Project/
├── docs/                         # Tài liệu phân tích, thiết kế và API
├── src/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/             # Cấu hình, xác thực, bảo mật, client dùng chung
│   │   │   ├── models/           # SQLAlchemy model, một entity mỗi file
│   │   │   ├── routers/          # Khai báo endpoint FastAPI
│   │   │   ├── schemas/          # Pydantic request/response schema
│   │   │   ├── services/         # Logic nghiệp vụ và truy cập dữ liệu
│   │   │   └── main.py           # Khởi tạo ứng dụng FastAPI
│   │   ├── alembic/              # Migration cơ sở dữ liệu
│   │   │   └── versions/         # Các revision Alembic
│   │   ├── tests/                 # Test backend
│   │   ├── main.py               # Entry point chạy local
│   │   ├── pytest.ini
│   │   └── requirements.txt
│   └── frontend/
│       ├── public/                # Tài nguyên tĩnh giữ nguyên tên khi build
│       ├── src/
│       │   ├── api/               # API cho auth/profile theo axios
│       │   ├── assets/            # Ảnh, font và tài nguyên được import
│       │   ├── components/        # Component tái sử dụng
│       │   ├── lib/               # Client/hạ tầng dùng chung: API, Supabase
│       │   ├── pages/             # Component cấp trang
│       │   ├── utils/             # Hàm tiện ích thuần, không chứa UI
│       │   ├── App.jsx            # Route và layout cấp ứng dụng
│       │   ├── index.css          # Tailwind và design token toàn cục
│       │   └── main.jsx           # Entry point React
│       ├── eslint.config.js
│       ├── package.json
│       └── vite.config.js
├── .gitignore
└── README.md
```

Không commit các thư mục được sinh tự động như `node_modules/`, `dist/`, `venv/`, `__pycache__/` hoặc `.pytest_cache/`.

## 3. Quy tắc tổ chức code

### Backend

Luồng xử lý chuẩn:

```text
HTTP request → router → schema validation → service → model/database
HTTP response ← router ← response schema ← service
```

- `routers/` chỉ nhận request, khai báo dependency/phân quyền, gọi service và trả response. Không đặt truy vấn hoặc logic nghiệp vụ dài trong router.
- `schemas/` định nghĩa dữ liệu vào/ra bằng Pydantic. Không trả trực tiếp SQLAlchemy model ra API.
- `services/` chứa logic nghiệp vụ và thao tác dữ liệu. Mỗi domain có một service, ví dụ `event_service.py`.
- `models/` chứa SQLAlchemy model. Mỗi entity chính nằm trong một file riêng.
- `core/` chỉ chứa hạ tầng dùng chung như config, auth, security và Supabase client; không đặt logic riêng của một tính năng tại đây.
- `tests/` phản chiếu đối tượng được kiểm thử. Ví dụ `app/services/saved_event_service.py` tương ứng với `tests/test_saved_event_service.py`.
- `alembic/versions/` chỉ chứa migration. Không sửa migration đã chạy trên môi trường dùng chung; tạo revision mới để thay đổi schema.
- Biến môi trường được đọc tập trung qua `app/core/config.py`, không gọi `os.getenv()` rải rác trong router hoặc service.
- Dùng dependency auth có sẵn như `get_current_user`, `require_approved_organizer` hoặc `require_admin`; không tự viết lại kiểm tra role ở từng endpoint.

Khi thêm một domain mới, ưu tiên tạo đủ các file cần thiết theo cùng tên domain:

```text
app/models/ticket.py
app/schemas/ticket.py
app/services/ticket_service.py
app/routers/ticket_router.py
tests/test_ticket_service.py
tests/test_ticket_router.py
```

### Frontend

- `pages/` chứa component gắn với route. Page chịu trách nhiệm tải dữ liệu và điều phối các component con.
- `components/` chứa UI có thể tái sử dụng. Component trình bày nên nhận dữ liệu qua props và không tự gọi API nếu page có thể đảm nhiệm.
- Khi một page có từ ba component riêng trở lên, nhóm chúng trong một thư mục theo tính năng, ví dụ `components/EventDetail/`.
- `api/` hiện dùng axios cho auth/profile. Tính năng auth/profile mới tiếp tục dùng client trong `api/axios.js`.
- `lib/api.js` là lớp gọi backend cho event/registration; `lib/supabase.js` là Supabase client dùng chung. Không tạo thêm API client hoặc Supabase client thứ ba.
- `utils/` chỉ chứa hàm thuần, không dùng React hook và không render JSX. File có JSX phải dùng đuôi `.jsx`.
- `assets/` dành cho tài nguyên được import từ source; `public/` dành cho tài nguyên được truy cập trực tiếp bằng URL.
- State cục bộ dùng `useState` hoặc `useReducer`. Không thêm thư viện quản lý state toàn cục khi chưa được nhóm thống nhất.
- Dùng Tailwind utility class và token trong `index.css`. Giá trị màu/spacing lặp lại nhiều nơi cần được đưa về token chung.
- Icon dùng `lucide-react`; thông báo dùng `react-toastify`.
- Text hiển thị cho người dùng thống nhất bằng tiếng Việt.

## 4. Convention đặt tên

### 4.1. Quy tắc chung

- Tên phải mô tả ý nghĩa nghiệp vụ, không dùng tên mơ hồ như `data1`, `temp`, `obj`, `item2` hoặc `handle`.
- Dùng tiếng Anh không dấu cho tên file, thư mục, biến, hàm và class. Tiếng Việt chỉ dùng cho nội dung hiển thị, comment hoặc tài liệu.
- Không tự đặt viết tắt nếu viết tắt đó chưa phổ biến trong dự án. Dùng `event`, `registration`, `organizer` thay cho `evt`, `reg`, `org`.
- ID trong JavaScript viết theo dạng từ ghép `eventId`, `userId`; trong Python và JSON/API dùng `event_id`, `user_id`.
- Tên boolean bắt đầu bằng `is`, `has`, `can`, `should` hoặc `requires`, ví dụ `isLoading`, `hasError`, `canEdit`.
- Tên collection dùng danh từ số nhiều, ví dụ `events`, `selectedCategories`, `registered_users`.
- Hằng số và biến môi trường dùng `UPPER_SNAKE_CASE`.

### 4.2. Frontend: JavaScript/React

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| Biến, hàm | `camelCase` | `eventList`, `formatDateTime()` |
| Component React | `PascalCase` | `EventCard`, `ProtectedRoute` |
| File component | `PascalCase.jsx` | `EventCard.jsx` |
| Export component | `default export` trực tiếp từ file `.jsx` | `export default function EventCard()` |
| File page | `PascalCasePage.jsx` | `EventDetailPage.jsx` |
| Custom hook | `use` + `PascalCase` | `useCurrentUser.js`, `useCurrentUser()` |
| Hàm xử lý trong component | `handle` + hành động | `handleSubmit`, `handleDeleteEvent` |
| Callback prop | `on` + hành động | `onSubmit`, `onEventDeleted` |
| API object/file | `<domain>Api` | `profileApi`, `profileApi.js` |
| File utility | `camelCase.js` | `eventDetailUtils.js` |
| Hằng số | `UPPER_SNAKE_CASE` | `DEFAULT_PAGE_SIZE` |
| Thư mục kỹ thuật | chữ thường | `components`, `pages`, `utils` |
| Nhóm component theo tính năng | `PascalCase` | `EventDetail/` |

Mỗi file `.jsx` chỉ được chứa một component React. Không định nghĩa nhiều component chính/phụ trong cùng một file; component phụ phải được tách thành file riêng trong feature folder tương ứng, ví dụ `components/ReviewOrganizerRequest/`. Mỗi file component dùng `default export` và được import trực tiếp từ file tương ứng. Không tạo barrel `index.js` chỉ để re-export các component trong cùng feature folder.

Ví dụ:

```jsx
const DEFAULT_PAGE_SIZE = 10

export default function EventList({ events, isLoading, onEventSelected }) {
  const handleSelectEvent = (eventId) => {
    onEventSelected(eventId)
  }

  // ...
}
```

Tên field gửi đến hoặc nhận từ API phải giữ nguyên contract `snake_case` của backend:

```js
const payload = {
  event_status: "PENDING",
  registration_deadline: deadline,
}
```

Không đổi các field trên thành `eventStatus` trước khi gửi nếu API không có lớp chuyển đổi rõ ràng.

### 4.3. Backend: Python/FastAPI

Tuân theo PEP 8:

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| File/module | `snake_case.py` | `saved_event_service.py` |
| Biến, hàm | `snake_case` | `event_id`, `get_event()` |
| Class/model/schema/enum | `PascalCase` | `Event`, `EventCreate`, `UserRole` |
| Hằng số | `UPPER_SNAKE_CASE` | `TABLE_EVENTS`, `MAX_PAGE_SIZE` |
| Hàm/biến nội bộ | tiền tố `_` | `_parse_datetime()` |
| Router file mới | `<domain>_router.py` | `ticket_router.py` |
| Service file mới | `<domain>_service.py` | `ticket_service.py` |
| Test file | `test_<subject>.py` | `test_ticket_service.py` |
| Test function | `test_<expected_behavior>` | `test_create_ticket_rejects_full_event()` |

Ví dụ:

```python
MAX_PAGE_SIZE = 100


def list_events(organizer_id: str, page_size: int) -> list[EventOut]:
    normalized_page_size = min(page_size, MAX_PAGE_SIZE)
    return event_service.list_events(
        organizer_id=organizer_id,
        page_size=normalized_page_size,
    )
```

Schema nên dùng hậu tố thể hiện vai trò:

- `Create`, `Update`: dữ liệu đầu vào, ví dụ `EventCreate`, `EventUpdate`.
- `Out`, `Response`: dữ liệu trả về, ví dụ `EventOut`, `UserProfileResponse`.
- `ListOut`: response dạng danh sách có phân trang, ví dụ `EventListOut`.

### 4.4. URL, database và migration

- API path dùng danh từ số nhiều và `kebab-case` khi có nhiều từ: `/api/events`, `/api/organizer-requests`.
- Path parameter dùng `snake_case`: `/api/events/{event_id}`.
- Tên bảng và cột database dùng `snake_case`; tên bảng ưu tiên số nhiều: `saved_events`, `registration_deadline`.
- Foreign key có hậu tố `_id`: `user_id`, `category_id`.
- Tên migration do Alembic sinh, phần mô tả ngắn gọn bằng `snake_case`, ví dụ `add_checkin_qr_table`.

## 5. Quy tắc import và chất lượng code

### Frontend

- Thứ tự import: package bên ngoài, module nội bộ, sau cùng là CSS/assets; ngăn các nhóm bằng một dòng trống.
- Không hard-code URL backend trong component. Dùng `VITE_API_BASE_URL` thông qua API client có sẵn.
- Không để lại `console.log`, code comment-out hoặc import không dùng.
- Ưu tiên component nhỏ, một trách nhiệm. Nếu tên component cần từ `And` để mô tả, cân nhắc tách component.

Kiểm tra frontend:

```powershell
cd src/frontend
npm run lint
npm run build
```

Có thể lint riêng file trong lúc phát triển:

```powershell
npx eslint src/components/EventCard.jsx
```

### Backend

- Thứ tự import: thư viện chuẩn, package bên thứ ba, module nội bộ; ngăn các nhóm bằng một dòng trống.
- Hàm public cần type hint cho tham số và giá trị trả về.
- Không dùng raw SQL ghép chuỗi; dùng SQLAlchemy hoặc Supabase query builder.
- Không dùng `except Exception` mà bỏ qua lỗi. Nếu bắt lỗi rộng tại boundary, phải chuyển thành lỗi có ngữ cảnh hoặc ghi nhận phù hợp.
- Không để lại `print`, code comment-out hoặc import không dùng.

Kiểm tra backend:

```powershell
cd src/backend
pytest -q
```

Có thể chạy riêng test liên quan trong lúc phát triển:

```powershell
pytest tests/test_saved_event_service.py -q
```

## 6. Quy ước cho code hiện có chưa đồng nhất

Repository có một số tên cũ như `auth_services.py`, `events.py`, `UI/` hoặc các module trùng vai trò. Đây là code legacy, không phải mẫu để tạo file mới.

- File mới phải theo convention trong README này.
- Không đổi tên hàng loạt chỉ để làm đẹp vì có thể làm vỡ import trên hệ điều hành phân biệt chữ hoa/thường.
- Khi chỉnh sửa trực tiếp một module legacy, có thể chuẩn hóa tên trong cùng Pull Request nếu phạm vi nhỏ, đã cập nhật toàn bộ import và đã chạy kiểm tra liên quan.
- Không tạo thêm bản sao để né việc chọn module hiện có. Ví dụ, tiếp tục dùng `lib/supabase.js` thay vì tạo một Supabase client mới.

## 7. Git convention

Tên branch:

```text
feature/create-event
fix/registration-deadline
refactor/event-service
docs/update-readme
test/saved-event-service
```

Commit message theo Conventional Commits:

```text
feat: add event registration flow
fix: prevent registration after deadline
refactor: move event queries to service layer
docs: define naming conventions
test: cover saved event service
```

Một commit chỉ nên chứa một thay đổi logic. Pull Request cần mô tả mục tiêu, phạm vi ảnh hưởng, cách kiểm tra và ảnh chụp nếu có thay đổi giao diện.

Quy trình Pull Request:

1. Sau khi hoàn thành và kiểm tra thay đổi, developer tự push branch của mình lên remote.
2. Developer tự tạo Pull Request và chọn branch đích là `develop`.
3. Yêu cầu ít nhất một thành viên khác review Pull Request.
4. Chỉ được merge vào `develop` sau khi Pull Request đã được review, approve và các góp ý bắt buộc đã được xử lý.
5. Người tạo Pull Request không tự ý merge khi chưa có approve, kể cả khi kiểm tra tự động đã thành công.

## 8. Checklist trước khi mở Pull Request

- [ ] File mới nằm đúng thư mục và đúng convention đặt tên.
- [ ] Router không chứa logic nghiệp vụ hoặc truy vấn dài.
- [ ] Request/response mới có Pydantic schema phù hợp.
- [ ] Component không tạo API/Supabase client riêng.
- [ ] Không có secret, `.env`, file build hoặc dependency directory trong diff.
- [ ] Không còn `console.log`, `print`, code thử hoặc import không dcùng.
- [ ] Test backend liên quan đã chạy thành công.
- [ ] Frontend đã lint; đã build nếu thay đổi ảnh hưởng luồng tích hợp.
- [ ] Text hiển thị cho người dùng thống nhất bằng tiếng Việt.
- [ ] Migration mới đã được review trước khi áp dụng lên database dùng chung.
- [ ] Pull Request nhắm đúng branch `develop` và đã được ít nhất một thành viên khác approve trước khi merge.

## 9. Nguồn tham chiếu

- API contract: Swagger UI tại `/docs` và các schema trong `src/backend/app/schemas/`.
- Backend routes: `src/backend/app/routers/`.
- Design token frontend: `src/frontend/src/index.css`.
- Quy tắc dành cho coding agent: `src/AGENTS.md`.
