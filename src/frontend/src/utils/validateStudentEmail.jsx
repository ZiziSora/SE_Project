const SCHOOL_DOMAIN = "student.hcmus.edu.vn";
const STUDENT_CODE_REGEX = /^\d{8}$/;

export function validateStudentEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const parts = normalizedEmail.split("@");

  if (parts.length !== 2) {
    return {
      valid: false,
      message: "Invalid email format.",
    };
  }

  const [studentCode, domain] = parts;

  if (domain !== SCHOOL_DOMAIN) {
    return {
      valid: false,
      message: `Please use your @${SCHOOL_DOMAIN} email.`,
    };
  }

  if (!STUDENT_CODE_REGEX.test(studentCode)) {
    return {
      valid: false,
      message: "Invalid student email format.",
    };
  }

  return {
    valid: true,
    studentCode,
  };
}
