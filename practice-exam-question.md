# Practice question — same format and level as Question 2 (5 points)

## Đề chính: Blood Donation Management System

**Question 2 (5 points).**

Assume that you are responsible for developing a **Blood Donation Management System**, which consists of three sub-systems: the back-end Server, the front-end Web, and the front-end Mobile App. The Web sub-system lets **hospital staff** create blood donation campaigns and update the available time slots of each campaign. The hospital staff can also view statistic information about registered donors and the blood units collected. The Mobile App sub-system lets **donors** find nearby campaigns that meet their needs and register for an interested time slot. Donors can also submit a health declaration form and receive reminders through the Mobile App. The back-end Server lets **administrator** manage profiles of hospital staff and donors. The whole system uses **third-party services** for displaying maps and for sending notifications by email/SMS.

a) Draw Use Case diagram for the whole system.

b) Draw Class diagram to describe domain objects in the system.

c) Write necessary test cases for the functional requirement **"Register for a donation time slot"**.

---

## Đề dự phòng: Job Recruitment System

**Question 2 (5 points).**

Assume that you are responsible for developing a **Job Recruitment System**, which consists of three sub-systems: the back-end Server, the front-end Web, and the front-end Mobile App. The Web sub-system lets **employers** post job vacancies and update their status. The employer can also view statistic information about the applications received for each vacancy. The Mobile App sub-system lets **candidates** search for jobs that meet their needs, apply to the interested ones with their CV, and follow the status of each application. The back-end Server lets **administrator** manage profiles of employers and candidates. The whole system uses **third-party services** for storing CV files and for sending emails.

a) Draw Use Case diagram for the whole system.

b) Draw Class diagram to describe domain objects in the system.

c) Write necessary test cases for the functional requirement **"Apply for a job vacancy"**.

---

## Vì sao hai đề này cùng độ khó với đề gốc

Đề gốc (Hotel Booking) có một khuôn rất rõ, hai đề trên giữ nguyên khuôn đó:

| Thành phần trong đề gốc | Đề gốc | Đề Blood Donation | Đề Job Recruitment |
|---|---|---|---|
| 3 hệ thống con | Server / Web / Mobile | giữ nguyên | giữ nguyên |
| Actor dùng Web (bên cung) | Hotel owner | Hospital staff | Employer |
| Actor dùng Mobile (bên cầu) | Tourist | Donor | Candidate |
| Actor dùng Server | Administrator | Administrator | Administrator |
| Chức năng thống kê | room usage, revenue | donors, blood units | applications per vacancy |
| Chức năng lõi để viết test case | Book hotel rooms | Register for a time slot | Apply for a job |
| Dịch vụ bên thứ ba | maps, online payment | maps, email/SMS | file storage, email |

Điểm khó giống nhau: có **tài nguyên giới hạn** (phòng trống / suất hiến máu / vacancy) nên phải nghĩ tới trường hợp hết chỗ và trường hợp hai người cùng đăng kí một suất; có **actor ngoài** là third-party service phải vẽ vào use case diagram; và câu c) đều rơi vào chức năng lõi có nhiều trường hợp biên.

---

## Gợi ý cách làm câu c) để không mất điểm

Bảng test case nên có các cột: **ID – Test case name – Precondition – Steps – Input – Expected result**.

Với một chức năng "đăng kí / đặt chỗ", cần đủ 4 nhóm:

1. **Normal (happy path):** dữ liệu hợp lệ, còn chỗ → đăng kí thành công, số chỗ trống giảm 1, gửi thông báo.
2. **Invalid data:** thiếu trường bắt buộc, sai định dạng, ngày ở quá khứ.
3. **Boundary:** còn đúng 1 chỗ cuối; đăng kí đúng thời điểm hết hạn; hai người cùng đăng kí chỗ cuối cùng.
4. **Business rule / permission:** đăng kí trùng (đã đăng kí rồi), chưa đăng nhập, campaign đã bị huỷ hoặc đã kết thúc, third-party service lỗi (không gửi được email → hệ thống phải xử lí ra sao).
