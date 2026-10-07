export interface User {
  id: number;
  email?: string | null;
  phone: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
  is_online: boolean;
  registration_complete?: boolean;
  last_seen_at?: string;
  created_at: string;
}

export interface Contact {
  id: number;
  user_id: number;
  contact_user_id: number;
  display_name?: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  name?: string;
  is_group: boolean;
  avatar_url?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  latest_message_time?: string;
  unread_count?: number;
  last_message?: string;
  is_online?: boolean;
  last_seen_at?: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  reply_to_id?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  reaction?: string;
  disappears_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: number;
  conversation_id: number;
  user_id: number;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface OTPRequest {
  phone: string;
}

export interface OTPVerifyRequest {
  phone: string;
  otp_code: string;
}

export interface ProfileSetupRequest {
  user_id: number;
  display_name: string;
  email?: string;
  avatar_url?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  requires_profile_setup: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  requestOtp: (phone: string) => Promise<any>;
  verifyOtp: (phone: string, otp_code: string) => Promise<TokenResponse>;
  completeProfile: (userId: number, displayName: string, email?: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  requiresProfileSetup: boolean;
}
