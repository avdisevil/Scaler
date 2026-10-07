import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async requestOtp(phone: string) {
    const response = await this.client.post('/api/auth/request-otp', { phone });
    return response.data;
  }

  async verifyOtp(phone: string, otp_code: string) {
    const response = await this.client.post('/api/auth/verify-otp', { phone, otp_code });
    return response.data;
  }

  async completeProfile(user_id: number, display_name: string, email?: string, avatar_url?: string) {
    const response = await this.client.post('/api/auth/complete-profile', {
      user_id,
      display_name,
      email,
      avatar_url,
    });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/users/me');
    return response.data;
  }

  async updateUser(data: { display_name?: string; avatar_url?: string }) {
    const response = await this.client.put('/api/users/me', data);
    return response.data;
  }

  async searchUsers(query: string) {
    const response = await this.client.get(`/api/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async addContact(contact_user_id: number, display_name?: string) {
    const response = await this.client.post('/api/users/contacts', { contact_user_id, display_name });
    return response.data;
  }

  async getContacts(query?: string) {
    const url = query ? `/api/users/contacts?q=${encodeURIComponent(query)}` : '/api/users/contacts';
    const response = await this.client.get(url);
    return response.data;
  }

  async deleteContact(contact_id: number) {
    const response = await this.client.delete(`/api/users/contacts/${contact_id}`);
    return response.data;
  }

  async getConversations(query?: string) {
    const url = query ? `/api/conversations?q=${encodeURIComponent(query)}` : '/api/conversations';
    const response = await this.client.get(url);
    return response.data;
  }

  async createConversation(name: string | null, is_group: boolean, participant_ids: number[]) {
    const response = await this.client.post('/api/conversations', {
      name,
      is_group,
      participant_ids,
    });
    return response.data;
  }

  async getConversation(id: number) {
    const response = await this.client.get(`/api/conversations/${id}`);
    return response.data;
  }

  async updateConversation(id: number, data: { name?: string; avatar_url?: string }) {
    const response = await this.client.put(`/api/conversations/${id}`, data);
    return response.data;
  }

  async deleteConversation(id: number) {
    const response = await this.client.delete(`/api/conversations/${id}`);
    return response.data;
  }

  async getParticipants(conversation_id: number) {
    const response = await this.client.get(`/api/conversations/${conversation_id}/participants`);
    return response.data;
  }

  async addParticipant(conversation_id: number, user_id: number) {
    const response = await this.client.post(`/api/conversations/${conversation_id}/participants`, {
      user_id,
    });
    return response.data;
  }

  async removeParticipant(conversation_id: number, user_id: number) {
    const response = await this.client.delete(
      `/api/conversations/${conversation_id}/participants/${user_id}`
    );
    return response.data;
  }

  async updateParticipantRole(conversation_id: number, user_id: number, role: string) {
    const response = await this.client.put(
      `/api/conversations/${conversation_id}/participants/${user_id}/role`,
      { role }
    );
    return response.data;
  }

  async getMessages(conversation_id: number, limit: number = 50, offset: number = 0, before_id?: number) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (before_id) {
      params.append('before_id', before_id.toString());
    }
    const response = await this.client.get(
      `/api/conversations/${conversation_id}/messages?${params.toString()}`
    );
    return response.data;
  }

  async createMessage(conversation_id: number, content: string, message_type: string = 'text', reply_to_id?: number) {
    const response = await this.client.post(`/api/conversations/${conversation_id}/messages`, {
      content,
      message_type,
      reply_to_id,
    });
    return response.data;
  }

  async updateMessageStatus(message_id: number, status: string) {
    const response = await this.client.put(`/api/conversations/messages/${message_id}/status`, { status });
    return response.data;
  }

  async createMessageReceipt(message_id: number, status: string) {
    const response = await this.client.post(`/api/conversations/messages/${message_id}/receipt`, { status });
    return response.data;
  }
}

export const apiClient = new ApiClient();
