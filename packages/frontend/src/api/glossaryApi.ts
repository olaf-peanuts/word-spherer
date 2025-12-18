import axios from 'axios';
import { useAuth } from '../auth/AuthProvider';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

export const setupInterceptor = async () => {
  const { getAccessToken } = useAuth();
  api.interceptors.request.use(async config => {
    const token = await getAccessToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

export interface TermDto {
  id: string;
  title: string;
  slug: string;
  htmlContent: string;
  // other fields as needed
}

/* CRUD */
export const createTerm = (data: any) => api.post('/terms', data);
export const updateTerm = (id: string, data: any) => api.patch(`/terms/${id}`, data);
export const deleteTerm = (id: string) => api.delete(`/terms/${id}`);
export const getTermBySlug = (slug: string) => api.get<TermDto>(`/terms/${slug}`).then(r => r.data);
export const searchTerms = (q: string) => api.get<any>('/terms/search', { params: { q } }).then(r => r.data);
export const getGroupedTerms = () => api.get<any>('/terms/grouped').then(r => r.data);
