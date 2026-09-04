const maxProofFiles = 5;
const maxProofFileBytes = 5 * 1024 * 1024;

const proofContentTypes = new Map([
  ["application/pdf", "application/pdf"],
  ["application/msword", "application/msword"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["image/jpeg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
  ["image/gif", "image/gif"],
]);

const proofExtensionTypes = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

const getProofContentType = (file) => {
  if (proofContentTypes.has(file.type)) return proofContentTypes.get(file.type);

  const extension = file.name.split(".").pop()?.toLowerCase();
  return proofExtensionTypes.get(extension);
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const contentBase64 = result.split(",", 2)[1];

      if (!contentBase64) {
        reject(new Error(`Không thể đọc tệp '${file.name}'.`));
        return;
      }
      resolve(contentBase64);
    };
    reader.onerror = () => reject(new Error(`Không thể đọc tệp '${file.name}'.`));
    reader.readAsDataURL(file);
  });

export const prepareOrganizerProofFiles = async (files, retainedCount = 0) => {
  if (files.length + retainedCount > maxProofFiles) {
    throw new Error(`Chỉ được gửi tối đa ${maxProofFiles} tệp minh chứng.`);
  }

  return Promise.all(
    files.map(async (file) => {
      const contentType = getProofContentType(file);
      if (!contentType) {
        throw new Error(
          `Tệp '${file.name}' không đúng định dạng PDF, Word hoặc hình ảnh.`,
        );
      }
      if (file.size === 0) {
        throw new Error(`Tệp '${file.name}' không có nội dung.`);
      }
      if (file.size > maxProofFileBytes) {
        throw new Error(`Tệp '${file.name}' vượt quá giới hạn 5MB.`);
      }

      return {
        filename: file.name,
        content_type: contentType,
        content_base64: await readFileAsBase64(file),
      };
    }),
  );
};
