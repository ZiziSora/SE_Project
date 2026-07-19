const SCHOOL_DOMAIN = "student.hcmus.edu.vn";
const STUDENT_CODE_REGEX = /^\d{8}$/;

export function validateStudentEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const parts = normalizedEmail.split("@");

  if (parts.length !== 2) {
    return {
      valid: false,
      message: "Định dạng email không hợp lệ.",
    };
  }

  const [studentCode, domain] = parts;

  if (domain !== SCHOOL_DOMAIN) {
    return {
      valid: false,
      message: `Vui lòng sử dụng email @${SCHOOL_DOMAIN}.`,
    };
  }

  if (!STUDENT_CODE_REGEX.test(studentCode)) {
    return {
      valid: false,
      message: "Định dạng email sinh viên không hợp lệ.",
    };
  }

  return {
    valid: true,
    studentCode,
  };
}
