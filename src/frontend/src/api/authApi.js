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

export const verifyEmail = async (accessToken) => {
    const response = await api.post(
        "/auth/verify-email",
        {},
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );
    return response.data;
}

export const resendVerificationEmail = async (email) => {
    const response = await api.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
    });
    return response.data;
}

export const getEmailVerificationStatus = async (verificationState) => {
    const response = await api.post("/auth/verification-status", {
        verification_state: verificationState,
    });
    return response.data;
}


export async function forgotPassword(email) {
    try {
        const response = await api.post(
            "/auth/forgot-password",
            {
                email: email.trim().toLowerCase(),
            }
        );

        return response.data;
    } catch (error) {
        throw new Error(
            error.response?.data?.detail ||
            "Không thể gửi email đặt lại mật khẩu.",
            { cause: error },
        );
    }
}
