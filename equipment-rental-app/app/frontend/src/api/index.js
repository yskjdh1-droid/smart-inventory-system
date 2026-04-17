import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://192.168.200.177:5000/api';
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:          (data)        => api.post('/auth/login', data),
  adminLogin:     (data)        => api.post('/auth/admin/login', data),
  me:             ()            => api.get('/auth/me'),
  register:       (data)        => api.post('/auth/register', data),
  sendCode:       (email)       => api.post('/auth/send-code', { email }),
  verifyCode:     (email, code) => api.post('/auth/verify-code', { email, code }),
  updateFCMToken: (fcmToken)    => api.put('/auth/fcm-token', { fcmToken }),
};

export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getOne: (id)     => api.get(`/equipment/${id}`),
  create: (data)   => api.post('/equipment', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, d)  => api.put(`/equipment/${id}`, d),
  delete: (id)     => api.delete(`/equipment/${id}`),
  getQR:  (id)     => api.get(`/equipment/${id}/qr`),
};

export const categoryAPI = {
  getAll: ()       => api.get('/categories'),
  create: (data)   => api.post('/categories', data),
  update: (id, d)  => api.put(`/categories/${id}`, d),
  delete: (id)     => api.delete(`/categories/${id}`),
};

export const rentalAPI = {
  getAll:       (params) => api.get('/rentals', { params }),
  getMyRentals: ()       => api.get('/rentals/my'),
  create:       (data)   => api.post('/rentals', data),
  returnItem:   (id, d)  => api.put(`/rentals/${id}/return`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  extend:       (id, d)  => api.put(`/rentals/${id}/extend`, d),
  forceReturn:  (id, d)  => api.put(`/rentals/${id}/force-return`, d),
};

export const adminAPI = {
  stats:         ()          => api.get('/admin/stats'),
  overdue:       ()          => api.get('/admin/overdue'),
  dueToday:      ()          => api.get('/admin/due-today'),
  users:         ()          => api.get('/admin/users'),
  addPenalty:    (data)      => api.post('/admin/penalty', data),
  reducePenalty: (uid, d)    => api.put(`/admin/penalty/${uid}/reduce`, d),
};

export const reportAPI = {
  damageList:   ()       => api.get('/reports/damage'),
  updateDamage: (id, d)  => api.put(`/reports/damage/${id}`, d),
};

export default api;