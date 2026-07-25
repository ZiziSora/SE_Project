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

export const changePassword = async (passwords) => {
  const response = await api.put("/users/me/password", {
    current_password: passwords.currentPassword,
    new_password: passwords.newPassword,
    confirm_password: passwords.confirmPassword,
  });

  return response.data;
};
