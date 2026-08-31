# AGENTS.md

README dành cho AI coding agent làm việc trên repo **SE_Project – Smart University Event Ecosystem**.
Đọc file này trước khi sửa code. Mục tiêu: không phải hỏi lại những quy tắc dưới đây ở mỗi prompt.

Stack: FastAPI + SQLAlchemy + Supabase (backend/) · React 19 + Vite + Tailwind v4 (frontend/).

---

## 1. Do / Don't

### Backend (Python)
-  Đặt logic nghiệp vụ trong `app/services/*_service(s).py`. Router chỉ nhận request, gọi service, trả response.
-  Validate input/output bằng Pydantic schema trong `app/schemas/`. Không trả thẳng SQLAlchemy model ra ngoài router.
-  Lấy user hiện tại qua `Depends(get_current_user)` (xem `app/core/auth.py`). Dùng `require_approved_organizer` / `require_admin` cho các route cần phân quyền, đừng tự viết lại kiểm tra role trong từng router.
-  Đọc config qua `app/core/config.py` (biến môi trường qua `.env`, dùng `python-dotenv`). Không đọc `os.getenv` rải rác trong service.
-  Không tự tạo Supabase client mới trong service — dùng client có sẵn từ `app/core/supabase_client.py` / `app/database.py`.
-  Không viết raw SQL string nối tay — dùng SQLAlchemy ORM/Session (`app/database.py::get_db`).
-  Không commit `.env`, credentials, service-role key.

### Frontend (React)
- Khi task liên quan tới UI/UX, redesign hoặc visual polish, đọc và tuân theo mục **12. Frontend UI / UX design rules** trước khi sửa component.
- Nếu có `gpt-taste` / `design-taste-frontend` skill, dùng skill để hỗ trợ visual quality nhưng **AGENTS.md là nguồn quyết định mức độ phức tạp và information architecture**.
-  State cục bộ dùng `useState`/`useReducer` của React thuần. Repo **không dùng Redux/MobX/Zustand** — đừng thêm state library mới mà không hỏi trước.
-  Styling bằng Tailwind utility classes (Tailwind v4, cấu hình ở `frontend/src/index.css` qua `@theme`). Không hard-code màu hex rời rạc trong nhiều file — nếu một màu/spacing lặp lại ≥3 nơi, cân nhắc thêm token vào `@theme` trong `index.css`.
-  Icon dùng `lucide-react` (đã là dependency), không thêm thư viện icon khác.
-  Toast/thông báo dùng `react-toastify` (`ToastContainer` đã mount ở `App.jsx`).
-  Text hiển thị cho người dùng viết bằng tiếng Việt (xem convention hiện có trong toàn bộ `pages/`, message lỗi backend).
-  **Đừng tạo thêm client Supabase hoặc API helper mới.** Repo hiện có 2 cặp trùng lặp do lịch sử — coi đây là nợ kỹ thuật cần dọn dần, không nhân bản thêm:
  - Supabase client: dùng `frontend/src/lib/supabase.js` (bản này có cảnh báo khi thiếu env). File `frontend/src/libs/supabaseClient.js` là bản trùng cũ — khi sửa code đụng tới, hãy chuyển import sang `lib/supabase.js` thay vì giữ cả hai.
  - Gọi API: có 2 pattern song song — `frontend/src/api/axios.js` (axios + token từ `localStorage`, dùng bởi `authApi.js`/`profileApi.js`) và `frontend/src/lib/api.js` (fetch + token từ Supabase session, dùng bởi `EventDetailPage.jsx`). Khi thêm endpoint mới cho tính năng liên quan tới auth/profile, theo pattern `api/axios.js`; liên quan tới event/booking theo `lib/api.js`. Không tự bịa pattern thứ 3.
- Không hard-code URL backend (`http://localhost:8000`) trong component — dùng qua `api` instance hoặc `import.meta.env.VITE_API_BASE_URL`.

---

## 2. Lệnh chạy theo từng file (không build/test toàn project)

### Backend
```bash
cd backend
# lint/format 1 file
python -m py_compile app/services/event_service.py      # syntax check nhanh
# test 1 file / 1 test cụ thể
pytest tests/test_saved_event_service.py -q
pytest tests/test_saved_event_service.py::test_ten_ham -q
```
(chưa có flake8/black/ruff cấu hình trong repo — nếu thêm, cập nhật mục này)

### Frontend
```bash
cd frontend
# lint 1 file
npx eslint src/components/EventDetail/BookmarkButton.jsx
# lint + auto-fix 1 file
npx eslint src/pages/LoginPage.jsx --fix
```
Chưa có Prettier/TypeScript/test runner (Jest/Vitest) trong `package.json` hiện tại — đừng chạy hoặc giả định `tsc`/`npm test` tồn tại. Nếu thêm test framework, cập nhật mục này kèm lệnh chạy theo file.

Chỉ chạy `npm run build` / `pytest` (toàn bộ) / `npm run lint` (toàn repo) khi thực sự cần xác nhận trước khi tạo PR — không chạy mặc định sau mỗi lần sửa nhỏ.

---

## 3. Quyền hạn & an toàn

**Được làm tự do:**
- Đọc file, tìm kiếm (grep/glob), chạy lint/test cho file đang sửa.
- Sửa code trong `frontend/src/**` và `backend/app/**`, `backend/tests/**`.
- Tạo file mới nếu đúng vị trí theo cấu trúc ở mục 4.

**Phải hỏi trước khi làm:**
- Cài/gỡ package (`npm install`, `pip install`, sửa `package.json`/`requirements*.txt`).
- Chạy migration Alembic (`alembic upgrade/downgrade`), sửa schema DB, sửa file trong `backend/alembic/versions/`.
- Đọc/ghi vào Supabase project thật (mọi thao tác cần `SUPABASE_SERVICE_ROLE_KEY`) — không tự chạy script động tới dữ liệu thật.
- `git push`, tạo/đóng PR, tạo/xoá branch.
- Xoá file, đặc biệt `.env`, `backend/venv/`, `frontend/node_modules/`, `frontend/dist/`.
- Sửa `.env` / thêm biến môi trường mới cần giá trị thật (URL Supabase, key...).

---

## 4. Cấu trúc project

```
backend/
  app/
    main.py            # khởi tạo FastAPI, include_router, CORS
    database.py         # SQLAlchemy session + supabase client instance
    core/
      config.py          # đọc .env: SUPABASE_URL, SERVICE_ROLE_KEY, CORS_ORIGINS
      auth.py             # get_current_user, require_approved_organizer, require_admin
      security.py
      supabase_client.py
    models/              # SQLAlchemy ORM models (1 file/entity: user.py, event.py, registration.py...)
    schemas/              # Pydantic request/response schema, theo domain (auth.py, event.py, profile.py...)
    services/             # business logic, 1 file/domain (*_service.py hoặc *_services.py — không nhất quán, giữ nguyên tên file khi thêm hàm)
    routers/               # FastAPI route, mỏng: auth_router.py, events.py, profile_router.py
  alembic/                  # migration DB
  tests/                     # pytest, conftest.py set biến env giả để test không cần .env thật

frontend/
  src/
    App.jsx               # định nghĩa route (react-router-dom v7), route auth nằm dưới /auth, profile dưới /account
    main.jsx                # entry point
    index.css                # Tailwind import + @theme (design tokens: font-inter, font-manrope)
    pages/                    # 1 file/trang, có subfolder pages/profile/
    components/                # component dùng chung (Header, InputField, ProtectedRoute...)
      EventDetail/               # component con chỉ dùng cho trang event detail
    api/                          # gọi API pattern axios+localStorage (auth, profile)
    lib/                           # supabase client + api pattern fetch+session (event/booking)
    libs/                           # bản cũ trùng lib/, xem mục 1
    utils/                           # hàm thuần (validateStudentEmail.jsx)
```

Không có sidebar riêng — điều hướng hiện chỉ qua `react-router-dom` trong `App.jsx`. Chưa có global design-token file ngoài `index.css`.

---

## 5. Ví dụ code cụ thể (good/bad)

**Backend — router mỏng, gọi service, dùng auth dependency (theo đúng chuẩn):**
- File mẫu tốt: `backend/app/routers/profile_router.py` + `backend/app/services/profile_services.py`.
- Test mẫu tốt (mock service, không đụng DB thật): `backend/tests/test_saved_event_service.py`, `backend/tests/test_saved_event_router.py`.

**Frontend — component nhỏ, nhận props, không tự fetch bên trong (theo đúng chuẩn):**
- File mẫu tốt: `frontend/src/components/EventDetail/BookmarkButton.jsx` — component thuần, loading/state đến từ props, không gọi API trực tiếp trong component.
- Trang gọi API qua `lib/api.js` + xử lý lỗi qua `ApiError`: `frontend/src/EventDetailPage.jsx`.

**Tránh copy theo (nợ kỹ thuật đã biết):**
- `frontend/src/libs/supabaseClient.js` — trùng `lib/supabase.js`, thiếu cảnh báo env. Đừng nhân bản thêm client kiểu này.
- Đừng viết thêm biến thể thứ 3 cho việc gọi API (đã có 2, xem mục 1).

---

## 6. Tài liệu API

- Không có file OpenAPI/Postman check-in trong repo. Nguồn sự thật cho contract API là:
  - FastAPI tự sinh Swagger UI khi backend chạy: `http://localhost:8000/docs`.
  - Pydantic schema trong `backend/app/schemas/*.py` = request/response shape chính xác.
- Danh sách endpoint hiện có: xem trực tiếp `backend/app/routers/{auth_router,events,profile_router}.py` — đó là nguồn đúng nhất, không đoán route.
- Supabase Auth: dùng qua `@supabase/supabase-js` ở frontend (`lib/supabase.js`) và `supabase-auth`/`supabase` SDK ở backend — không tự implement JWT verify thủ công, dùng `get_current_user` có sẵn.
- Biến môi trường cần thiết: xem key (không xem value) trong `backend/.env` và `frontend/.env` hiện có trước khi thêm biến mới, tránh trùng tên.

---

## 7. AGENTS.md lồng nhau

Hiện tại **chỉ có 1 file AGENTS.md này ở root**. Nếu sau này backend/ hoặc frontend/ phát triển đủ phức tạp để cần quy tắc riêng (VD: coding convention riêng cho `backend/app/services/`), có thể tạo `backend/AGENTS.md` hoặc `frontend/AGENTS.md` — file gần thư mục đang sửa hơn sẽ override/bổ sung file gốc này. Chưa cần thiết ở quy mô hiện tại của đồ án.

---

## 8. PR checklist

Trước khi coi 1 thay đổi là "xong":
- [ ] Backend: file Python sửa/tạo mới có `pytest <file test liên quan> -q` pass (nếu có test tương ứng; nếu chưa có test cho service/route mới, cân nhắc thêm theo mẫu ở `backend/tests/`).
- [ ] Frontend: `npx eslint <file đã sửa>` không còn lỗi (warning có thể chấp nhận, lỗi thì không).
- [ ] Không để lại `console.log`/`print` debug thừa.
- [ ] Không commit `.env`, key, file build (`dist/`, `__pycache__/`, `venv/`).
- [ ] Diff gọn — chỉ sửa những gì task yêu cầu, không tiện tay refactor file không liên quan.
- [ ] Text hiển thị người dùng vẫn nhất quán tiếng Việt như phần còn lại của UI/thông báo lỗi.
- [ ] Nếu thêm route/service mới có phân quyền, đã dùng đúng dependency (`get_current_user` / `require_approved_organizer` / `require_admin`), không tự viết check role riêng.

---

## 9. Khi agent bị bí

- Nếu route/schema/model liên quan không tồn tại hoặc mơ hồ (VD: không rõ field nào của `User` được phép sửa qua API), **hỏi lại** thay vì đoán và tạo field/endpoint mới tuỳ tiện.
- Nếu task đụng tới 1 trong 2 pattern trùng lặp ở mục 1 (Supabase client, API helper) mà không rõ nên theo bản nào, **đề xuất kế hoạch ngắn** (chọn pattern nào, có dọn bản cũ không) trước khi sửa hàng loạt file.
- Nếu cần đổi schema DB (migration), luôn trình bày kế hoạch migration trước, không tự `alembic upgrade` vào DB thật.
- Không tự ý sửa hàng loạt file "tiện thể dọn dẹp" ngoài phạm vi task được giao.

---

## 10. Test-first mode (tuỳ chọn)

Mặc định: không bắt buộc test-first. Áp dụng khi người dùng yêu cầu rõ ("viết test trước") hoặc khi sửa `backend/app/services/*` — nơi đã có tiền lệ test (`backend/tests/test_saved_event_service.py`):
1. Viết test trong `backend/tests/test_<tên_service>.py` mô tả hành vi mong muốn, dùng `pytest-mock` để mock Supabase/DB như file mẫu.
2. Chạy `pytest tests/test_<tên_service>.py -q`, xác nhận fail đúng lý do (chưa implement).
3. Viết code trong `services/` tới khi test pass.
4. Không mở rộng sang test khác ngoài phạm vi trừ khi được yêu cầu.

Frontend hiện chưa có test runner nên chưa áp dụng test-first cho React component.

---

## 11. Design system indexing

Repo chưa tách design system thành package riêng. Token hiện có duy nhất:
- `frontend/src/index.css` — khai báo `@theme` với `--font-inter`, `--font-manrope` (Tailwind v4 CSS-first config).
- Không có file màu/spacing token tập trung — màu đang được viết trực tiếp bằng Tailwind class (VD: `text-purple-600`, `bg-[#F8F9FF]`) rải trong component.

Nếu sau này tách design system (component/token dùng chung nhiều nơi) thành package riêng, cập nhật mục này với đường dẫn tới file index component + token, để agent không phải dò lại từ đầu.

## 12. Frontend UI / UX design rules

Các quy tắc dưới đây áp dụng khi task liên quan tới thiết kế mới, redesign, polish hoặc sửa layout trong `frontend/`.

### 12.1. Design skill

Khi task có liên quan tới UI/UX frontend:

1. Kiểm tra skill `gpt-taste` / `design-taste-frontend` đã cài trong agent skills.
2. Đọc skill phù hợp trước khi bắt đầu thiết kế.
3. Dùng skill như nguồn tham khảo về visual quality, typography, hierarchy và spacing.
4. Các rule trong `AGENTS.md` này có ưu tiên cao hơn aesthetic mặc định của skill.

Không áp dụng style của `gpt-taste` một cách máy móc cho mọi trang.

`gpt-taste` chỉ là công cụ hỗ trợ polish visual, không phải nguồn quyết định information architecture của application.

---

### 12.2. Product UI is the default

Repo này là một **product application / university management system**, không phải portfolio, creative website hoặc Awwwards landing page.

Mặc định khi thiết kế frontend, ưu tiên theo thứ tự:

1. Usability
2. Information hierarchy
3. Proximity of related information
4. Consistency with existing pages
5. Accessibility
6. Visual polish
7. Visual novelty

**Complexity must be earned.**

Nếu một trang có workflow đơn giản thì layout cũng phải đơn giản.

Một layout đơn giản nhưng polished tốt hơn một layout bắt mắt nhưng rời rạc hoặc phức tạp không cần thiết.

Không tối ưu application screen chỉ để screenshot trông ấn tượng.

Tối ưu cho người dùng thực hiện task nhanh và sử dụng lặp lại.

---

### 12.3. Default design intensity

Đối với các trang application thông thường, giả định:

* DESIGN_VARIANCE: 2-3
* MOTION_INTENSITY: 1
* VISUAL_DENSITY: 5-6

Ví dụ:

* Login / Signup
* Profile
* Organizer request
* Organizer re-request
* Event create/edit
* My Events
* Notifications
* Dashboard
* Admin review
* Forms
* Settings

Các trang này phải restrained, compact và task-oriented.

Chỉ các trang discovery / marketing như:

* Home
* Event discovery landing sections
* Promotional sections

mới có thể dùng visual treatment mạnh hơn:

* DESIGN_VARIANCE: 5-7
* MOTION_INTENSITY: 2-4
* VISUAL_DENSITY: 4-5

---

### 12.4. Avoid over-design

Không tự thêm các pattern sau nếu không có lý do UX rõ ràng:

* cinematic hero
* oversized page title
* giant typography
* bento grid
* asymmetrical layout chỉ để tạo visual interest
* excessive whitespace
* decorative floating elements
* gradients chỉ để trang trông "modern"
* scroll-driven animation
* GSAP
* parallax
* glassmorphism
* excessive shadows
* excessive rounded cards
* card bên trong card
* biến mọi metadata thành badge/pill
* chia một workflow đơn giản thành nhiều section xa nhau
* mỗi section một visual style khác nhau

Không tạo thêm section chỉ để lấp khoảng trống.

Không dùng animation nếu animation không cung cấp feedback hoặc giúp hiểu state transition.

---

### 12.5. Proximity and cohesion

Thông tin liên quan phải ở gần nhau.

Ví dụ:

* validation message → gần field liên quan
* event date/location → gần event title
* rejection reason → gần status/request information
* primary action → gần nơi người dùng hoàn thành workflow
* supporting documents → gần phần request mà document hỗ trợ

Tránh:

```text
Title

      huge whitespace

Status

      huge whitespace

Information

      huge whitespace

Action
```

Ưu tiên:

```text
Title
Description

Status / important feedback

Main information or form

Supporting information

Primary action
```

Mỗi page nên có một visual flow rõ ràng từ trên xuống dưới.

---

### 12.6. Cards

Không mặc định dùng card cho mọi nhóm nội dung.

Chỉ dùng card/container khi nó thể hiện một grouping có ý nghĩa.

Ưu tiên hierarchy bằng:

* spacing
* typography
* border
* divider
* subtle background
* alignment

trước khi tạo thêm card.

Tránh:

```text
Card
 ├── Card
 ├── Card
 └── Card
```

nếu các nội dung thực chất thuộc cùng một workflow.

---

### 12.7. Forms and workflow pages

Form nên ưu tiên một column chính.

Desktop:

* centered content container
* width phù hợp với lượng thông tin
* thường khoảng `max-w-2xl` đến `max-w-4xl`
* không dùng 2-column nếu nó làm người dùng phải scan qua lại

Hai column chỉ dùng nếu hai nhóm thông tin thực sự độc lập hoặc sidebar mang tính contextual.

Form fields:

* label sát input
* helper text sát field
* error sát field
* spacing giữa các field nhất quán

Primary action nằm gần cuối workflow.

Không tạo một giant CTA section riêng cho nút submit.

---

### 12.8. Existing page redesign workflow

Trước khi redesign một page đang tồn tại:

1. Đọc component hiện tại.
2. Xác định business logic và API call đang có.
3. Đọc các component/page gần đó để hiểu visual convention.
4. Đọc `frontend/src/index.css`.
5. Tìm component reusable hiện có.
6. Xác định vấn đề UX/UI.
7. Sau đó mới redesign.

Không redesign một page hoàn toàn tách biệt khỏi phần còn lại của application.

Giữ nguyên nếu task chỉ yêu cầu UI:

* API endpoint
* API calling behavior
* routing
* authentication
* authorization
* form validation business rules
* backend contract
* business logic

Có thể restructure presentational component nếu cần.

---

### 12.9. Organizer request / re-request UX

Các trang organizer request là workflow-oriented pages.

Không thiết kế giống landing page.

Đối với organizer re-request sau khi admin reject, hierarchy bắt buộc là:

1. Page title
2. Current request status
3. Admin rejection reason
4. Information cần chỉnh sửa
5. Existing request information
6. Supporting documents
7. Resubmit action

`Admin rejection reason` là một trong những thông tin quan trọng nhất trên page và phải xuất hiện gần đầu trang.

Organizer phải hiểu được trong vài giây:

* request trước bị từ chối vì sao
* mình cần sửa gì
* dữ liệu nào từ request cũ vẫn còn
* document nào đang tồn tại
* submit lại sẽ xảy ra chuyện gì

Nếu dữ liệu request cũ tồn tại, pre-fill form thay vì bắt user nhập lại từ đầu.

UI phải:

* calm
* compact
* clear
* coherent
* task-oriented

Không dùng:

* hero section
* bento layout
* giant heading
* decorative illustration không cần thiết
* large empty spacing
* scroll animation
* marketing CTA

---

### 12.10. Before implementing a redesign

Với task redesign đáng kể, agent nên tự thực hiện:

1. Inspect current implementation.
2. Identify 3-5 concrete UI/UX problems.
3. Determine page type:

   * product/workflow
   * dashboard
   * discovery
   * marketing
4. Chọn mức design intensity phù hợp.
5. Implement.

Không cần hỏi người dùng lại những rule đã được định nghĩa trong file này.

Nếu yêu cầu của user đủ rõ thì tự đưa ra quyết định thiết kế hợp lý thay vì hỏi các câu hỏi aesthetic không cần thiết.

---

### 12.11. Final UI self-review

Sau khi implement UI, tự kiểm tra:

* Related information có bị tách quá xa không?
* Có dùng quá nhiều card không?
* Có section nào tồn tại chỉ để trang trông phức tạp hơn không?
* Typography hierarchy có quá dramatic so với loại page không?
* Có whitespace dư thừa không?
* Primary action có dễ tìm không?
* Mobile layout có giữ đúng information hierarchy không?
* UI mới có nhất quán với application hiện có không?
* Có animation/dependency mới không cần thiết không?

Nếu có, simplify trước khi coi task hoàn thành.
