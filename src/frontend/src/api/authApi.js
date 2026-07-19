import api from "./axios"

export const login = async (data) => {
    const reponse = await api.post("/auth/login", data);
    return reponse.data;
}


export const signupStudent = async (data) => {
    const response = await api.post("/auth/signup/student", data);
    return response.data;
}

export const signupOrganizer = async (data) => {
    const response = await api.post("/auth/signup/organizer", data);
    return response.data;
}

export const verifyStudentEmail = async (accessToken) => {
    const response = await api.post(
        "/auth/verify-email/student",
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );
    return response.data;
}
