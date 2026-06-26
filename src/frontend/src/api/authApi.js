import api from "./axios"

export const login = async (data) => {
    const reponse = await api.post("/auth/login", data);
    return reponse.data; 
}

export const signup = async (data) => {
    const response = await api.post("/auth/signup", data);
    return response.data;
}