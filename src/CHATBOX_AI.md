# Hoàn thiện chức năng Chatbox trợ lý AI (UniEvent)

> Tài liệu ghi lại toàn bộ quá trình từ khảo sát → thiết kế → triển khai → kiểm thử
> cho tính năng chatbox AI ở trang **Khám phá sự kiện**.
> Nhánh: `feature/SUEE-134-Chatbot`.

---

## 1. Mục tiêu

Trước khi làm, dự án đã có sẵn **giao diện chatbox** (`FloatingChatbox.jsx`) nhưng
phần trả lời chỉ là **giả lập**: chọn ngẫu nhiên một câu trong mảng `AI_RESPONSES`
sau `setTimeout(1200ms)`. Không có gọi API, không đọc dữ liệu thật.

Yêu cầu hoàn thiện:

1. Chatbox trả lời được câu hỏi thật của người dùng.
2. **Trả lời chính xác dựa trên database sẵn có** (sự kiện sắp diễn ra, đang mở
   đăng ký, gợi ý theo chuyên ngành, cách dùng hệ thống…).
3. **Chặn câu hỏi ngoài phạm vi**: nếu người dùng hỏi chuyện không liên quan
   (sức khoẻ, kiến thức chung, lập trình…), hệ thống phải trả về một thông điệp
   tiếng Việt kiểu *“trợ lý AI chỉ trả lời các câu hỏi liên quan đến sự kiện
   trong hệ thống”*, thay vì cố trả lời.

Yêu cầu bổ sung (phát sinh trong quá trình làm):

4. **Dự phòng khi dịch vụ AI lỗi** — báo lịch sự, không crash / lộ lỗi kỹ thuật.
5. **Chặn câu hỏi rỗng ngay ở frontend** — không gọi API, nhắc người dùng nhập.
6. **Nhãn “Nội dung do AI tạo”** trên mỗi câu trả lời của trợ lý.
7. **Thẻ sự kiện bấm được** → mở trang chi tiết `/events/:eventId`.
8. **Gợi ý theo khoa/chuyên ngành của chính người dùng** — lấy `Khoa/đơn vị`
   trong hồ sơ, KHÔNG hỏi lại khi người dùng bấm quick reply.
9. **Lưu lịch sử trò chuyện trong phiên đăng nhập**, xoá khi đăng xuất.
10. **Khai thác tối đa liên kết database** — ban tổ chức, số lượt đăng ký, chỗ
    còn lại, sự kiện đã đăng ký / điểm danh / lưu / đang chờ của người dùng.

---

## 2. Quá trình tìm hiểu (khảo sát codebase)

| Hạng mục | Kết quả khảo sát |
|---|---|
| **Giao diện chatbox** | `frontend/src/components/FloatingChatbox.jsx` — UI hoàn chỉnh (mở/đóng, typing indicator, quick replies, avatar, badge tin chưa đọc). Điểm cần sửa: hàm `sendText()` (giả lập). Component chỉ được render ở `pages/ExploreEventsPage.jsx`. |
| **Backend** | FastAPI + Supabase (client service-role). Router đặt tại `app/routers/*.py`, đăng ký ở `app/main.py`. Service tại `app/services/*.py`, schema Pydantic tại `app/schemas/*.py`. |
| **Đã có sẵn tích hợp AI** | `app/services/recommendation_service.py` đã dùng **Gemini** cho tính năng “Gợi ý cho bạn”: thư viện `google-genai==2.19.0` trong `requirements.txt`, biến môi trường `GEMINI_API_KEY` (đã có giá trị trong `backend/.env`). → Tái sử dụng được ngay, không thêm dependency. |
| **Xác thực** | `app/core/security.py::get_current_user` — đọc header `Authorization: Bearer`, trả `None` nếu không có/không hợp lệ (auth **không bắt buộc**). Frontend `api/axios.js` tự đính token từ `localStorage.access_token`. |
| **Gọi API từ frontend** | Quy ước: mỗi nhóm endpoint một file `src/api/*.js`, dùng chung instance `api` từ `axios.js`. |
| **Schema database** (`src/database.png`) | Bảng `events`: `event_id, organizer_id, category_id, title, description, location, start_time, end_time, registration_deadline, capacity, event_status, approval_status, banner_url, file_url`. Bảng `event_categories(category_id, name)`. Giá trị trạng thái lưu **CHỮ HOA**: `event_status = 'PUBLISHED'`, `approval_status = 'APPROVED'` (đã kiểm chứng bằng truy vấn thực tế). |

---

## 3. Các phương án đã cân nhắc

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **Rule-based thuần** (match từ khoá → query DB → câu mẫu) | Miễn phí, offline, tất định | Khó phân biệt “tư vấn sức khoẻ” (ngoài phạm vi) với “sự kiện về sức khoẻ” (trong phạm vi); test case nhiều cách diễn đạt sẽ trượt | Không đủ cho yêu cầu chặn ngoài phạm vi |
| **LLM khác** (Groq / Ollama…) | Không phụ thuộc Google | Phải thêm cấu hình / hạ tầng mới | Để dành như phương án thay thế |
| **Gemini + RAG + guard** ✅ | Đã tích hợp sẵn trong repo; hiểu ngữ nghĩa tốt; tiếng Việt tốt | Phụ thuộc mạng + quota | **Đã chọn** |

---

## 4. Kiến trúc giải pháp — 3 lớp

```
FloatingChatbox.sendText(message, history)
        │  POST /api/chatbot/messages
        ▼
┌─────────────────────────────────────────────────────────────┐
│ chatbot_service.answer_chat_message()                        │
│                                                             │
│ Lớp 1 — TRUY XUẤT (RAG, khai thác tối đa liên kết database)  │
│   _fetch_context_events(): sự kiện PUBLISHED + APPROVED,     │
│   chưa kết thúc, sắp theo start_time (tối đa 25) — kèm:      │
│     · event_categories(name)          — chủ đề               │
│     · users qua organizer_id          — ban tổ chức + khoa   │
│     · event_registrations             — số lượt đăng ký,     │
│                                         số chỗ còn lại       │
│   _build_user_profile_context() (khi đã đăng nhập):          │
│     · users.department_name           — khoa/chuyên ngành    │
│     · event_registrations của user    — đã đăng ký/điểm danh │
│     · saved_events / waiting_list      — đã lưu / đang chờ    │
│   → khối "DỮ LIỆU SỰ KIỆN" + "HỒ SƠ NGƯỜI DÙNG"              │
│                                                             │
│ Lớp 2 — SINH CÂU TRẢ LỜI + PHÂN LOẠI PHẠM VI                 │
│   Gọi Gemini 1 lần, ép trả JSON có cấu trúc:                 │
│   { in_scope: bool, reply: str, relevant_event_ids: [str] }  │
│   system prompt: chỉ trả lời chủ đề sự kiện UniEvent;        │
│   chỉ dùng dữ liệu được cung cấp, không bịa; dùng luôn khoa  │
│   trong hồ sơ khi được hỏi "theo khoa của tôi".             │
│                                                             │
│ Lớp 3 — CHỐT CHẶN Ở BACKEND                                  │
│   • in_scope == false → thay reply bằng CÂU TỪ CHỐI CỐ ĐỊNH  │
│     (tiếng Việt, không phụ thuộc model → test ổn định)       │
│   • map relevant_event_ids → thẻ sự kiện (tối đa 5) lấy từ   │
│     dữ liệu đã truy xuất ở Lớp 1                             │
└─────────────────────────────────────────────────────────────┘
        │  { reply, in_scope, events[] }
        ▼
Chatbox hiển thị câu trả lời + thẻ sự kiện đính kèm
```

**Vì sao tách Lớp 3:** câu từ chối cho câu hỏi ngoài phạm vi được sinh bởi **code**
(hằng số `OUT_OF_SCOPE_REPLY`), không phải bởi model → mọi test case ngoài phạm vi
nhận đúng một thông điệp giống nhau, không bị model diễn đạt mỗi lần một khác.

**Cơ chế dự phòng (degrade an toàn):** thiếu `GEMINI_API_KEY`, chưa cài thư viện,
hoặc gọi API lỗi/quá tải → service trả câu `FALLBACK_REPLY` lịch sự, **không văng
lỗi 500**. Có thử lại với model thứ 2 (`gemini-flash-latest`) khi model chính 404/503.

---

## 5. Chi tiết triển khai

### 5.1. Backend

| File | Loại | Nội dung |
|---|---|---|
| `backend/app/schemas/chatbot.py` | **mới** | `ChatTurn`, `ChatMessageIn` (message ≤ 1000 ký tự, history ≤ 20 lượt), `ChatEventOut`, `ChatMessageOut`. |
| `backend/app/services/chatbot_service.py` | **mới** | Toàn bộ logic 3 lớp. Hằng số quan trọng: `OUT_OF_SCOPE_REPLY`, `FALLBACK_REPLY`, `SYSTEM_PROMPT`, `DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"`. Helper khai thác liên kết DB: `_fetch_organizers()`, `_fetch_registration_counts()`, `_fetch_user_activity()`, `_build_user_profile_context()` (tái dùng `recommendation_service._fetch_student_signals`). |
| `backend/app/routers/chatbot_router.py` | **mới** | `POST /api/chatbot/messages`, `Depends(get_current_user)` (không bắt buộc đăng nhập); truyền `user_id` xuống service để cá nhân hoá. |
| `backend/app/main.py` | **sửa** | Thêm `chatbot_router` vào `from app.routers import (...)` và `app.include_router(chatbot_router.router)`. |

**Endpoint**

```
POST /api/chatbot/messages
Body:  { "message": "Sắp tới có sự kiện nào không?",
         "history": [ { "role": "user"|"ai", "text": "..." }, ... ] }

200:   { "reply": "…",
         "in_scope": true,
         "events": [ { "event_id", "title", "start_time", "end_time",
                       "location", "registration_deadline", "category_name" } ] }
422:   message rỗng hoặc quá dài
```

**Truy vấn dữ liệu (Lớp 1)**

```python
# 1) Sự kiện ứng viên — _fetch_context_events()
get_supabase().table("events")
  .select("event_id, title, description, location, start_time, end_time, "
          "registration_deadline, capacity, category_id, organizer_id, "
          "event_status, approval_status")
  .gte("end_time", now)               # chưa kết thúc
  .order("start_time", desc=False)
  .limit(75).execute()
# lọc Python: event_status == "PUBLISHED" và approval_status == "APPROVED"
# → lấy tối đa 25 sự kiện đầu

# 2) Làm giàu qua liên kết (chỉ query theo id đã có, không N+1):
_category_map()                       # event_categories        -> {id: name}
_fetch_organizers(organizer_ids)      # users                   -> {id: {full_name, department_name}}
_fetch_registration_counts(event_ids) # event_registrations     -> {event_id: số đăng ký còn hiệu lực}

# 3) Nếu đã đăng nhập — _build_user_profile_context(user_id):
#    recommendation_service._fetch_student_signals()  -> khoa + danh mục hay tham gia
#    _fetch_user_activity()  -> đã đăng ký / đã điểm danh / đã lưu / đang chờ (join events)
```

Mỗi dòng "DỮ LIỆU SỰ KIỆN" gửi cho model có dạng:

```
- event_id=<uuid> | "<tiêu đề>" | chủ đề: <category> | ban tổ chức: <tên> — <khoa>
  | bắt đầu: <...> | kết thúc: <...> | hạn đăng ký: <...> | địa điểm: <...>
  | sức chứa: <capacity> (còn <capacity − đã đăng ký>) | đã đăng ký: <n> người
  | mô tả: <160 ký tự đầu>
```

**Khai thác liên kết database (Lớp 1)** — mỗi sự kiện trong ngữ cảnh được bổ sung:

| Liên kết | Bảng | Dùng để trả lời |
|---|---|---|
| `events.category_id → event_categories` | `event_categories` | chủ đề sự kiện |
| `events.organizer_id → users` | `users` | “ai là ban tổ chức của sự kiện X” |
| `event_registrations.event_id → events` | `event_registrations` | “sự kiện X có bao nhiêu người đăng ký / còn chỗ không” |
| `event_registrations.user_id → users` | `event_registrations` | “tôi đã đăng ký / điểm danh sự kiện nào” |
| `saved_events.student_id` | `saved_events` | “tôi đã lưu sự kiện nào” |
| `waiting_list.student_id` | `waiting_list` | “tôi đang chờ danh sách sự kiện nào” |
| `users.department_name` | `users` | “gợi ý sự kiện theo khoa của tôi” (không hỏi lại) |

**Prompt (Lớp 2)** — điểm chính trong `SYSTEM_PROMPT`:

- Chỉ hỗ trợ: sự kiện sắp diễn ra / đang mở đăng ký / đã kết thúc; thông tin sự
  kiện (kể cả ban tổ chức, số người đăng ký, số chỗ còn lại); gợi ý theo khoa;
  hoạt động của chính sinh viên; cách dùng UniEvent.
- Quy tắc 1: câu hỏi ngoài các nội dung trên → `in_scope = false`, **không trả lời**.
- Quy tắc 3: chỉ dùng khối “DỮ LIỆU SỰ KIỆN” + “HỒ SƠ NGƯỜI DÙNG”, không bịa.
- Quy tắc 5: hỏi “theo khoa/ngành của tôi” + hồ sơ có khoa → **dùng luôn, không hỏi lại**.
- Quy tắc 6: câu hỏi về hoạt động của user → trả lời theo “HỒ SƠ NGƯỜI DÙNG”.
- Quy tắc 7–8: `relevant_event_ids` tối đa 5; câu trả lời ≤ 120 từ.
- Tin nhắn cuối gửi cho model có kèm `Hôm nay là <ngày giờ>` để tính “sắp diễn ra”.

Gọi model: `client.models.generate_content(..., config=GenerateContentConfig(
system_instruction=SYSTEM_PROMPT, temperature=0, max_output_tokens=2048,
response_mime_type="application/json", response_schema=_LlmChatResult))`.
`temperature=0` để câu trả lời ổn định, dễ viết test.

### 5.2. Frontend

| File | Loại | Nội dung |
|---|---|---|
| `frontend/src/api/chatbotApi.js` | **mới** | `sendChatMessage({ message, history })` → `POST /api/chatbot/messages`. |
| `frontend/src/lib/chatHistory.js` | **mới** | `CHAT_HISTORY_KEY`, `loadChatHistory()`, `saveChatHistory()`, `clearChatHistory()` — lưu lịch sử vào `localStorage`. |
| `frontend/src/utils/authStorage.js` | **sửa** | `clearStoredAuthentication()` gọi thêm `clearChatHistory()` → đăng xuất là xoá lịch sử chat. |
| `frontend/src/components/FloatingChatbox.jsx` | **sửa** | Xem bên dưới. |

Thay đổi trong `FloatingChatbox.jsx`:

1. Import `sendChatMessage`, `Link` (react-router), `loadChatHistory`/`saveChatHistory`.
2. **Xoá** mảng `AI_RESPONSES` (không còn giả lập).
3. `sendText` chuyển thành `async`:
   - Gom `history` = tối đa 10 lượt gần nhất, map `sender` → `role` (`user` / `ai`).
   - Gọi `sendChatMessage`, đẩy câu trả lời + `events` vào state `messages`.
   - `try/catch`: lỗi mạng → hiển thị câu `ERROR_REPLY` (cờ `isError`).
   - `finally`: tắt typing indicator, bật badge nếu chatbox đang đóng.
   - Chặn gửi chồng: `if (isTyping) return;`.
4. Thêm helper `fmtEventDate()` và render **thẻ sự kiện** (tiêu đề • danh mục •
   thời gian • địa điểm) ngay dưới bong bóng trả lời của trợ lý khi có `msg.events`.
   Mỗi thẻ là một `<Link to={`/events/${event_id}`}>` — **bấm vào mở trang chi tiết
   sự kiện** và tự đóng chatbox (`setIsOpen(false)`).
5. Bong bóng chat thêm `whitespace-pre-wrap` để giữ xuống dòng trong câu trả lời.
6. Nhãn **“Nội dung do AI tạo”** hiển thị dưới mỗi câu trả lời của trợ lý.
7. Câu hỏi rỗng / chỉ có khoảng trắng: hiện dòng đỏ *“Vui lòng nhập câu hỏi trước
   khi gửi.”* và **không gọi API** (state `inputError`).
8. **Lưu lịch sử phiên đăng nhập:** `messages` khởi tạo từ `loadChatHistory()`;
   `useEffect` gọi `saveChatHistory(messages)` mỗi khi đổi. Lịch sử sống qua reload,
   chỉ bị xoá khi đăng xuất (`clearStoredAuthentication` → `clearChatHistory`).
9. Quick reply thứ 2 đổi thành **“Gợi ý sự kiện theo khoa của tôi”**.

Không đổi: bố cục UI, animation, typing indicator, nút reset hội thoại.

---

## 6. Cách 2 yêu cầu cốt lõi được đáp ứng

### 6.1. Câu hỏi ngoài phạm vi

- Model đặt `in_scope = false`.
- Backend **bỏ qua** `reply` của model, trả về đúng hằng số:

  > *Xin lỗi, mình là trợ lý AI của UniEvent nên chỉ có thể hỗ trợ các câu hỏi
  > liên quan đến sự kiện trong hệ thống. Bạn hãy thử hỏi về sự kiện sắp diễn ra,
  > sự kiện đang mở đăng ký, hoặc nhờ mình gợi ý sự kiện theo chuyên ngành nhé!*

  (Sửa nội dung tại `OUT_OF_SCOPE_REPLY` trong `chatbot_service.py` nếu test cần
  câu chữ khác.)

### 6.2. Trả lời chính xác theo database

- Mọi thông tin sự kiện trong câu trả lời đều lấy từ khối “DỮ LIỆU SỰ KIỆN” do
  Lớp 1 truy vấn trực tiếp Supabase.
- Prompt cấm model bịa; nếu không có dữ liệu phù hợp, model phải nói rõ “hiện
  chưa có”.
- Thẻ sự kiện đính kèm được backend dựng lại **từ dữ liệu gốc** (không lấy từ text
  của model) → số liệu luôn khớp DB.

---

## 7. Cấu hình

| Biến môi trường (`backend/.env`) | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `GEMINI_API_KEY` | Có (để bật AI) | – | Dùng chung với `recommendation_service`. Thiếu → chatbox chạy chế độ dự phòng. |
| `GEMINI_CHAT_MODEL` | Không | `gemini-3.5-flash-lite` | Ghi đè model riêng cho chatbox. |
| `GEMINI_MODEL` | Không | – | Ghi đè chung (chatbox + gợi ý). Ưu tiên thấp hơn `GEMINI_CHAT_MODEL`. |

> Lưu ý: model `gemini-2.5-flash-lite` (đang dùng ở `recommendation_service`) trả
> **404 “no longer available to new users”** khi test qua `generate_content`. Chatbox
> dùng `gemini-3.5-flash-lite` và tự thử lại với `gemini-flash-latest` khi lỗi.

---

## 8. Đối chiếu 4 test case chính thức (U011 – Ask Event Question)

| # | Test case | Cách hệ thống đáp ứng | Kết quả chạy thử |
|---|---|---|---|
| 1 | **Ask an out-of-scope question** — Input: *“Thoi tiet ngay mai o TP.HCM the nao?”*. Expected: báo cho sinh viên rằng trợ lý chỉ trả lời câu hỏi về sự kiện, không cố trả lời. | Gemini đặt `in_scope=false` → backend trả `OUT_OF_SCOPE_REPLY`. | `200`, `in_scope=false`, reply = *“Xin lỗi, mình là trợ lý AI của UniEvent nên chỉ có thể hỗ trợ các câu hỏi liên quan đến sự kiện trong hệ thống…”* ✅ |
| 2 | **Chatbot fallback when AI service is down** — Input: *“Su kien Career Fair 2026 co nhung cong ty nao tham gia?”* + giả lập mất kết nối Google AI. Expected: báo trợ lý tạm thời không dùng được, mời thử lại sau — **không crash, không lộ lỗi kỹ thuật**. | Mọi exception trong `_call_gemini()` (kể cả API key sai, 503, timeout) bị bắt → trả `FALLBACK_REPLY`, HTTP `200`. Nếu backend cũng không tới được → frontend hiện `ERROR_REPLY`. | Thử cả 2 đường (ép exception + API key sai): `200`, reply = *“Hiện mình chưa kết nối được với trợ lý AI. Bạn vui lòng thử lại sau ít phút, hoặc xem trực tiếp danh sách sự kiện ở trang Khám phá nhé.”* ✅ |
| 3 | **Chatbot rejects an empty/invalid question** — Input: bỏ trống hoặc chỉ có khoảng trắng. Expected: **không gửi request** tới AI, yêu cầu nhập câu hỏi hợp lệ. | Frontend `sendText()`: `text = raw.trim()`; nếu rỗng → hiện dòng đỏ *“Vui lòng nhập câu hỏi trước khi gửi.”* và **return trước khi gọi API**. Backend (phòng thủ lớp 2): `message` sau khi cắt khoảng trắng có `min_length=1` → `422`. | Frontend: không có request nào được gửi, hiện thông báo. Backend: `''`, `'   '`, `'\t\n'` → `422`. ✅ |
| 4 | **Ask a valid event question** — Input: *“Su kien AI Workshop 2026 dien ra o dau va can chuan bi gi?”*. Expected: câu trả lời do AI sinh, **dựa trên mô tả sự kiện**, **có nhãn “AI-generated”**, trong khoảng **5 giây**. | Lớp 1 nạp mô tả sự kiện vào ngữ cảnh → Gemini trả lời bám mô tả; backend đính kèm thẻ sự kiện lấy từ DB. Mỗi câu trả lời của trợ lý hiển thị nhãn **“Nội dung do AI tạo”** ngay dưới bong bóng. | `200`, `~3.0s` (< 5s), `in_scope=true`, trả lời đúng địa điểm + nội dung chuẩn bị theo mô tả, kèm thẻ sự kiện. Nhãn “Nội dung do AI tạo” hiển thị trên UI. ✅ |

> **Ghi chú về “home page”:** các bước test ghi “open the home page”. Với tài khoản
> **Student**, route `/` (sau đăng nhập) chuyển hướng sang `/explore` — đúng trang có
> chatbox (`ExploreEventsPage`). Nếu cần chatbox xuất hiện ở cả trang Landing `/`,
> chỉ việc thêm `<FloatingChatbox />` vào component tương ứng.

---

## 9. Kiểm thử kỹ thuật đã thực hiện

Chạy trực tiếp service + gọi endpoint qua `fastapi.testclient` với DB thật:

| Tình huống | Input | Kết quả |
|---|---|---|
| Sự kiện sắp diễn ra | “Sắp tới có sự kiện nào không?” | `in_scope=true`, liệt kê đúng sự kiện trong DB, kèm 5 thẻ sự kiện |
| Đang mở đăng ký | “Sự kiện nào đang mở đăng ký?” | `in_scope=true`, lọc theo hạn đăng ký, dữ liệu khớp DB |
| Gợi ý theo chuyên ngành | “Gợi ý vài sự kiện về công nghệ thông tin” | `in_scope=true`, chọn đúng các sự kiện CNTT/việc làm |
| Ngoài phạm vi – sức khoẻ | “Cách chữa đau đầu nhanh nhất?” | `in_scope=false` → câu từ chối cố định |
| Ngoài phạm vi – lập trình | “Viết hàm sắp xếp nổi bọt bằng Python” | `in_scope=false` → câu từ chối cố định |
| Ngoài phạm vi – thời sự | “Ai là tổng thống Mỹ hiện nay?” | `in_scope=false` → câu từ chối cố định |
| Hướng dẫn dùng hệ thống | “Làm sao để điểm danh / huỷ đăng ký?” | `in_scope=true`, hướng dẫn hợp lý |
| Hội thoại nhiều lượt | Hỏi tiếp “sự kiện đầu tiên bắt đầu lúc mấy giờ?” kèm history | Trả lời đúng theo ngữ cảnh + đúng giờ trong DB |
| Validation | `message` rỗng / chỉ khoảng trắng | HTTP `422` |
| Không có key / lỗi API | – | Trả `FALLBACK_REPLY`, HTTP `200`, không crash |
| Cá nhân hoá theo khoa | “Gợi ý sự kiện theo khoa của tôi” (đã đăng nhập) | Dùng luôn `department_name` trong hồ sơ, **không hỏi lại** |
| Hoạt động của user | “Tôi đã đăng ký / điểm danh sự kiện nào?” | Trả lời từ `event_registrations` của user |
| Liên kết ban tổ chức | “Ai là ban tổ chức của sự kiện X?” | Trả đúng tên + khoa từ `users` |
| Sức chứa / lượt đăng ký | “Sự kiện X còn chỗ không?” | Trả `capacity − số đăng ký` từ `event_registrations` |
| Lưu lịch sử | Gửi vài tin → F5 lại trang | Hội thoại vẫn còn; sau khi **đăng xuất** thì mất |

Frontend: `npx eslint` (không lỗi) và `npx vite build` (build thành công).

---

## 10. Hạn chế & hướng mở rộng

- **Chưa có rate-limit:** nên thêm giới hạn theo user/IP để tránh cháy quota.
- **Ngữ cảnh giới hạn 25 sự kiện:** với hệ thống nhiều sự kiện, nên thay bằng
  tìm kiếm ngữ nghĩa (embedding) thay vì nhồi toàn bộ.
- **Lịch sử chat lưu ở `localStorage` (không mã hoá, không theo user_id):** đủ cho
  yêu cầu “giữ trong phiên, xoá khi đăng xuất”; nếu đổi tài khoản trên cùng máy mà
  không đăng xuất đúng cách thì lịch sử cũ vẫn còn cho tới lần `clearStoredAuthentication` kế tiếp.
- **Thẻ sự kiện:** đã bấm vào được (dẫn tới `/events/:eventId`). Trang chi tiết
  nằm trong `ProtectedRoute` nên cần đăng nhập.
- **Số liệu đăng ký** đếm mọi bản ghi khác `CANCELLED` (gồm cả `CHECKED_IN`); chưa
  trừ danh sách chờ.
- **Phụ thuộc Gemini:** nếu cần bỏ Google, `_call_gemini()` là chỗ duy nhất phải
  thay (đổi sang Groq/OpenAI-compatible hoặc Ollama); phần còn lại giữ nguyên.

---

## 11. Cách chạy thử

```bash
# Backend
cd src/backend
venv/Scripts/activate           # Windows
uvicorn app.main:app --reload   # http://localhost:8000

# Frontend
cd src/frontend
npm run dev                     # http://localhost:5173
```

Mở trang **Khám phá sự kiện** (`/explore`) → bấm nút chat góc dưới phải → thử các
tình huống ở mục 8 và 9. Xem nhanh API: `http://localhost:8000/docs` →
`POST /api/chatbot/messages`.

---

## 12. Danh sách file thay đổi

```
Mới:
  src/backend/app/schemas/chatbot.py
  src/backend/app/services/chatbot_service.py
  src/backend/app/routers/chatbot_router.py
  src/frontend/src/api/chatbotApi.js
  src/frontend/src/lib/chatHistory.js
  src/CHATBOX_AI.md                      (tài liệu này)

Sửa:
  src/backend/app/main.py                          (đăng ký router)
  src/frontend/src/components/FloatingChatbox.jsx  (gọi API thật; thẻ sự kiện bấm được;
                                                   nhãn AI; lưu lịch sử phiên; quick reply)
  src/frontend/src/utils/authStorage.js            (xoá lịch sử chat khi đăng xuất)
```
