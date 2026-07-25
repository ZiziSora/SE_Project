import api from "./axios";

export const getMyProfile = async () => {
  const response = await api.get("/me");
  return response.data;
};

export const getOrganizationTypes = async () => {
  const response = await api.get("/users/organization-types");
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

export const updateMyProfile = async (role, profile) => {
  const payload = {
    full_name:
      role === "organizer" ? profile.organizationName : profile.fullName,
    contact_phone: profile.phone,
  };

  if (role === "organizer") {
    payload.organization_type_id = profile.organizationTypeId || null;
    payload.office_address = profile.address;
  } else {
    payload.department_name = profile.university;
  }

  const response = await api.put("/users/me/profile", payload);
  return response.data;
};
