import api from "./axios"

const signin = async (data) => {
    const reponse = await api.post("/login", data);
    return reponse.data; 
}