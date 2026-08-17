import axios from "axios";

const authAPI = axios.create({
  baseURL: "http://localhost:5000/api/auth",
});

export default authAPI;