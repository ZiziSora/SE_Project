# Gợi ý trả lời vấn đáp cuối kì — Nhập môn Công nghệ phần mềm
**Đồ án: Smart University Event Ecosystem – UniEvent**

---

## Câu 1. Vai trò trong đồ án, công cụ sử dụng và khó khăn gặp phải

**Vai trò.** Em phụ trách **fullstack cho module Tạo và Quản lí sự kiện** của vai trò Organizer — tức là làm cả phía backend lẫn frontend cho các chức năng: tạo sự kiện (lưu nháp / gửi duyệt), cập nhật sự kiện, huỷ sự kiện, và quản lí danh sách người tham gia (xem, thống kê, lọc, tìm kiếm, phân trang). Cụ thể phía backend em viết schema kiểm tra dữ liệu (Pydantic), tầng service xử lí nghiệp vụ và các API cho Organizer; phía frontend em dựng form tạo/sửa sự kiện, bảng danh sách sự kiện và các trang quản lí người tham gia.

**Công cụ.**
- **VS Code** làm môi trường code chính.
- **Git / GitHub** để quản lí phiên bản, làm việc theo nhánh và review code giữa các thành viên.
- **Claude** hỗ trợ trong quá trình code: gợi ý cách tổ chức code, giải thích lỗi, rà soát lại các trường hợp biên và soạn tài liệu kiểm thử. Em xem AI như một người đồng hành để tăng tốc, còn phần thiết kế nghiệp vụ và quyết định cuối cùng vẫn do em kiểm chứng lại — code AI sinh ra em đều đọc hiểu và chạy thử trước khi commit.
- **Swagger UI** (FastAPI tự sinh ở `/docs`) để thử API mà không cần frontend.
- **Supabase / PostgreSQL** để quản lí cơ sở dữ liệu.
- **ESLint** cho frontend và **pytest** cho backend.

**Khó khăn.**

*Thứ nhất, đồng bộ ràng buộc kiểm tra dữ liệu giữa frontend và backend.* Một quy tắc nghiệp vụ phải tồn tại ở hai nơi: frontend kiểm tra để báo lỗi ngay cho người dùng, backend kiểm tra để bảo vệ dữ liệu (vì người dùng có thể gọi thẳng API). Ví dụ trong module của em có ba nhóm ràng buộc: (1) danh sách trường bắt buộc khi gửi duyệt — tiêu đề, danh mục, địa điểm, thời gian bắt đầu/kết thúc, hạn đăng kí, tài liệu minh chứng; (2) thời gian bắt đầu và hạn đăng kí không được ở quá khứ; (3) không được giảm sức chứa của sự kiện, chỉ được giữ nguyên hoặc tăng, vì giảm xuống dưới số người đã đăng kí sẽ phải huỷ đăng kí của người ta. Ban đầu em sửa một bên mà quên bên còn lại, dẫn tới tình huống frontend cho bấm Lưu nhưng backend trả lỗi 422, mà thông báo lỗi hiển thị chỉ là "Request failed with status code 422" nên rất khó hiểu. Em xử lí bằng cách: gom các ràng buộc thành hằng số dùng chung ở mỗi phía, ghi chú rõ "sửa bên này phải sửa bên kia", và viết một hàm tiện ích để bóc thông điệp lỗi thật từ response API ra hiển thị cho người dùng.

*Thứ hai, nghiệp vụ trạng thái sự kiện phức tạp hơn em tưởng.* Giao diện cần hiển thị 6 trạng thái — Nháp, Chờ duyệt, Đã duyệt, Đang diễn ra, Đã kết thúc, Đã huỷ — nhưng cơ sở dữ liệu chỉ lưu hai cột trạng thái; "Đang diễn ra" và "Đã kết thúc" phải **suy ra** từ thời gian bắt đầu/kết thúc tại thời điểm gọi API. Kèm theo đó là quy tắc phân quyền theo trạng thái: sự kiện đang diễn ra hoặc đã kết thúc thì không cho sửa/xoá, còn sự kiện đã được duyệt mà muốn sửa thì không ghi đè trực tiếp mà phải tạo một **bản sửa chờ duyệt** để Admin duyệt lại. Lúc đầu em so sánh thẳng giá trị trong cơ sở dữ liệu nên hiển thị sai trạng thái. Bài học em rút ra là phải đặt logic suy ra trạng thái vào **một hàm duy nhất** ở mỗi tầng và bắt buộc mọi nơi đi qua hàm đó, thay vì rải điều kiện `if` khắp các file — đúng tinh thần "single source of truth" mà môn học nhấn mạnh.

> *Nếu bị hỏi sâu:* "Vì sao không bỏ kiểm tra ở frontend cho đỡ trùng?" → Vì frontend kiểm tra để **trải nghiệm** (báo lỗi tức thì, không tốn một vòng gọi mạng), backend kiểm tra để **an toàn dữ liệu**. Bỏ frontend thì UX kém, bỏ backend thì hệ thống mất tin cậy. Hai lớp phục vụ hai mục đích khác nhau nên không phải là trùng lặp thừa.

---

## Câu 2. Nhóm có gặp khó khăn gì trong giao tiếp không?

Nhìn chung nhóm em **phối hợp khá tốt**, không xảy ra mâu thuẫn hay tình trạng mất liên lạc. Chỉ có một vài trục trặc nhỏ ở giai đoạn đầu, và nhóm đã giải quyết được:

- **Ranh giới giữa các module chưa rõ ở buổi đầu.** Ví dụ chức năng điểm danh bằng QR nằm giữa module "Quản lí người tham gia" (của em) và module "Điểm danh" (của bạn khác), lúc đầu cả hai đều tưởng người kia làm. Nhóm xử lí bằng cách họp lại, chốt phạm vi từng người bằng văn bản và ghi vào tài liệu phân công, sau đó không còn chồng lấn nữa.
- **Frontend và backend làm song song nên phải thống nhất "hợp đồng" API trước.** Có phần em dựng giao diện xong trước khi API sẵn sàng, nên nhóm quy ước trước tên endpoint, tên trường, định dạng response và mã lỗi; em tạm dùng một lớp dữ liệu mẫu để chạy thử giao diện, khi API thật xong thì gỡ lớp đó ra. Nhờ vậy không ai phải ngồi chờ ai.

Những điều giúp nhóm giao tiếp hiệu quả: chia việc theo module rõ ràng (mỗi người sở hữu một nhóm chức năng nên ít đụng file của nhau, giảm hẳn xung đột khi merge), trao đổi hằng ngày trên nhóm chat và họp định kì để cập nhật tiến độ, mọi quyết định về nghiệp vụ đều được ghi lại chứ không chỉ nói miệng, và dùng Git theo nhánh + review trước khi gộp vào nhánh chính.

Bài học: khó khăn trong giao tiếp phần lớn không đến từ việc "ít nói chuyện" mà từ việc **không ghi lại những gì đã thống nhất**. Khi mọi thoả thuận (phạm vi công việc, hợp đồng API, quy tắc nghiệp vụ) đều được viết ra thì nhóm ít hiểu nhầm hẳn.

---

## Câu 3. Ngôn ngữ và công cụ dùng để code

**Ngôn ngữ:**

| Thành phần | Ngôn ngữ |
|---|---|
| Backend | **Python** |
| Frontend | **JavaScript (JSX)** |
| Cơ sở dữ liệu | **SQL (PostgreSQL)** |
| Giao diện | **HTML / CSS** (qua JSX và TailwindCSS) |

**Thư viện / framework:**

- **Backend:** FastAPI (xây dựng REST API), Pydantic (định nghĩa và kiểm tra dữ liệu đầu vào/ra), SQLAlchemy và Alembic (làm việc với cơ sở dữ liệu và quản lí migration), PyJWT (xác thực bằng token), Supabase Python client.
- **Frontend:** React 19, Vite (công cụ build và dev server), React Router (điều hướng trang), Axios (gọi API), TailwindCSS (giao diện), react-toastify (thông báo), Lucide (bộ icon).
- **Cơ sở dữ liệu / hạ tầng:** Supabase (PostgreSQL, Authentication và Storage để lưu ảnh banner, tài liệu minh chứng).

**Công cụ hỗ trợ:** VS Code, Git và GitHub, Swagger UI để thử API, ESLint để kiểm tra chất lượng mã frontend, pytest để viết kiểm thử cho backend, và Claude để hỗ trợ trong quá trình lập trình và soạn tài liệu.

**Kiến trúc:** hệ thống theo mô hình **client – server ba tầng**: React SPA ở tầng giao diện, FastAPI ở tầng nghiệp vụ (tách thành routers – services – schemas), PostgreSQL ở tầng dữ liệu; hai tầng đầu giao tiếp với nhau qua REST API dạng JSON.

---

## Câu 4. Bài viết 150 từ: Em học được gì từ môn học này

Môn học cho em thấy viết code chỉ là một phần nhỏ của việc làm phần mềm. Trước khi code, nhóm phải hiểu người dùng cần gì, chuyển yêu cầu thành use case và đặc tả, rồi mới thiết kế cơ sở dữ liệu và kiến trúc. Khi làm UniEvent, em hiểu vì sao phải tách tầng giao diện, nghiệp vụ và dữ liệu: nhiều người làm song song mà không giẫm chân nhau. Em cũng học được rằng yêu cầu luôn thay đổi, nên quy trình lặp và tăng dần thực tế hơn làm một lần cho xong. Quan trọng không kém là các kĩ năng đi kèm: quản lí phiên bản bằng Git, viết tài liệu, thiết kế test case cho cả trường hợp biên, và trao đổi trong nhóm. Cuối cùng, phần mềm tốt không chỉ là chạy được, mà còn phải dễ bảo trì và đáng tin cậy với người dùng thật.

*(khoảng 150 từ)*

---

## Câu 5. Trong các vai trò của một dự án phần mềm, em thích vai trò nào nhất? Vì sao?

**Em thích vai trò Tester (Kiểm thử viên) nhất.**

**Lí do:**

1. **Tester là người bảo vệ chất lượng sản phẩm và người dùng cuối.** Lỗi phát hiện sớm ở giai đoạn kiểm thử tốn ít chi phí sửa hơn rất nhiều so với khi sản phẩm đã đến tay người dùng. Với UniEvent, một lỗi trong đăng kí hay điểm danh có thể khiến sinh viên mất suất tham gia hoặc mất dữ liệu điểm danh của cả một sự kiện — hậu quả thật chứ không chỉ là một dòng log.

2. **Công việc này hợp với cách suy nghĩ của em: luôn đặt câu hỏi "nếu… thì sao?".** Khi làm phần tạo và sửa sự kiện, em quen với việc nghĩ ra các trường hợp bất thường: nếu người dùng đặt hạn đăng kí sau ngày diễn ra thì sao? Nếu giảm sức chứa xuống thấp hơn số người đã đăng kí thì sao? Nếu hai người cùng đăng kí vào suất cuối cùng cùng lúc thì sao? Nếu sự kiện đang diễn ra mà bị sửa giờ thì sao? Chính thói quen này giúp nhóm phát hiện được những ràng buộc nghiệp vụ mà lúc đầu đặc tả chưa nói tới.

3. **Tester phải hiểu hệ thống một cách toàn diện.** Muốn viết test case tốt thì phải nắm cả yêu cầu, luồng nghiệp vụ, phân quyền lẫn cách các module ghép với nhau — nên đây là vai trò giúp em nhìn được bức tranh tổng thể của dự án chứ không chỉ phần mình code.

4. **Kết quả công việc rõ ràng và có tính xây dựng.** Một bộ test case, một báo cáo lỗi mô tả đúng các bước tái hiện là thứ giúp cả nhóm sửa nhanh hơn. Trong đồ án, khi soạn tài liệu kiểm thử cho module của mình, em thấy quá trình viết test case còn giúp phát hiện chỗ đặc tả chưa rõ — tức là kiểm thử không chỉ tìm lỗi trong code mà còn tìm lỗi trong chính yêu cầu.

**Lưu ý khi trả lời:** có thể thêm một câu cân bằng, ví dụ "tuy nhiên em cho rằng kiểm thử không nên là việc của riêng một người — trong nhóm em, mỗi thành viên đều tự kiểm thử phần của mình trước khi gộp code, còn vai trò Tester đảm bảo tính hệ thống và khách quan cho toàn bộ sản phẩm."

---

## Câu 6. Nhóm đã áp dụng kiến thức và kĩ năng của môn học như thế nào?

**1. Thu thập và phân tích yêu cầu.** Nhóm bắt đầu từ vấn đề thực tế: việc tổ chức sự kiện ở trường đang bị phân mảnh trên Google Form, Excel, Zalo, Facebook và danh sách điểm danh giấy. Từ đó nhóm xác định ba nhóm người dùng (Sinh viên, Ban tổ chức, Quản trị viên), viết yêu cầu chức năng và phi chức năng, dựng sơ đồ use case và mô tả luồng cho từng chức năng chính.

**2. Thiết kế hệ thống.** Nhóm thiết kế cơ sở dữ liệu (sơ đồ thực thể – liên kết cho các bảng người dùng, sự kiện, danh mục, đăng kí, danh sách chờ, bản sửa chờ duyệt…) và chọn kiến trúc ba tầng client – server. Backend được tách theo trách nhiệm: `routers` nhận yêu cầu, `schemas` kiểm tra dữ liệu, `services` chứa nghiệp vụ — áp dụng nguyên tắc phân tách mối quan tâm (separation of concerns) đã học.

**3. Quy trình phát triển lặp và tăng dần.** Nhóm chia dự án theo các giai đoạn bàn giao (PA1 – PA2 – PA3): mỗi giai đoạn hoàn thiện thêm một nhóm chức năng và cập nhật lại tài liệu, thay vì làm một lần rồi mới kiểm tra. Sau mỗi giai đoạn nhóm nhận góp ý và điều chỉnh yêu cầu — thực tế đã có những quy tắc nghiệp vụ chỉ xuất hiện sau khi dùng thử, ví dụ quy tắc không cho giảm sức chứa sự kiện.

**4. Quản lí cấu hình và làm việc nhóm.** Dùng Git/GitHub, mỗi tính năng làm trên một nhánh riêng, có review trước khi gộp; chia module theo người sở hữu để giảm xung đột; thống nhất quy ước đặt tên và cấu trúc thư mục chung cho cả frontend lẫn backend.

**5. Kiểm thử.** Nhóm viết test case theo hướng hộp đen dựa trên đặc tả: mỗi chức năng có trường hợp hợp lệ, trường hợp không hợp lệ, trường hợp biên (ví dụ sức chứa bằng đúng số người đã đăng kí, thời gian ngay tại thời điểm hiện tại) và trường hợp phân quyền (người dùng không phải chủ sự kiện thì không được sửa). Backend có kiểm thử tự động bằng pytest, frontend kiểm tra chất lượng mã bằng ESLint.

**6. Thiết kế giao diện và trải nghiệm người dùng.** Nhóm thống nhất một hệ thống giao diện chung (màu sắc, kiểu nút, thông báo dạng toast, hộp thoại xác nhận trước các thao tác nguy hiểm như xoá hay huỷ sự kiện) để sản phẩm nhất quán giữa các module do nhiều người làm.

**7. Viết tài liệu.** Toàn bộ đặc tả yêu cầu, thiết kế và tài liệu kiểm thử đều được viết và cập nhật theo tiến độ — đây cũng là điều môn học nhấn mạnh: tài liệu là phương tiện giao tiếp trong nhóm, không phải thủ tục làm cho có.

---

## Phụ lục: một số câu hỏi phụ có thể bị hỏi thêm

- **"Nếu làm lại, em sẽ làm khác chỗ nào?"** → Chốt hợp đồng API và mô hình dữ liệu kĩ hơn ngay từ đầu, đặc biệt là mô hình trạng thái sự kiện; và viết test case song song với code thay vì viết sau.
- **"Em dùng AI hỗ trợ thì phần nào là của em?"** → Thiết kế nghiệp vụ, quyết định ràng buộc, kiểm chứng và sửa lại code, kiểm thử. AI hỗ trợ tốc độ, nhưng trách nhiệm về tính đúng đắn vẫn là của em; em không commit đoạn code nào mà mình không giải thích được.
- **"Chức năng nào khó nhất hệ thống?"** → Cơ chế danh sách chờ tự động (khi có người huỷ đăng kí thì người đầu danh sách chờ được đẩy lên) vì phải xử lí đồng thời, và luồng sửa sự kiện đã duyệt phải qua bản sửa chờ duyệt.
- **"Phi chức năng thì sao?"** → Bảo mật (xác thực JWT, phân quyền theo vai trò), hiệu năng (phân trang danh sách người tham gia thay vì tải toàn bộ), khả năng bảo trì (tách tầng, quy ước chung), khả dụng (giao diện responsive, thông báo lỗi rõ ràng bằng tiếng Việt).
