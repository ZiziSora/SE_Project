import api from "./axios";

export const getMyProfile = async () => {
  const response = await api.get("/me");
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.put("/users/me/avatar", formData);

  return response.data;
};
