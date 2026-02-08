
export interface Client {
  id: string;
  name: string;
  avatarUrl: string;
  lastVisit: string; // ISO date
  frequency: number; // weeks
  churnProbability: number; // 0-100
  notes: string;
  status: 'active' | 'risk' | 'churned';
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  visitsCount: number; // Total number of completed visits
  reviews?: Review[];
}

export interface Review {
  id: string;
  clientId: string;
  barberName: string;
  serviceName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface EmotionalProfile {
  mood: string;
  context: string;
  motivation: string;
  confidenceLevel: number; // 1-10
}

export interface StyleSuggestion {
  name: string;
  visualDescription: string;
  emotionalVibe: string;
  pitch: string;
}

export interface FutureLetter {
  content: string;
  generatedAt: string;
}

export interface Transaction {
  id: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  date: string; // ISO date
  type: 'income' | 'expense';
  category: string; // 'Service', 'Product', 'Rent', 'Supplies', 'Salary', 'Other'
  description: string;
  method?: 'card' | 'cash' | 'free';
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  avatarUrl: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  isFree?: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  reminderSet?: boolean; // Indicates if a master reminder is scheduled
}

export interface AdminReminder {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  requestedDate: string;
  requestedTime: string;
  telegramReminderTime: string; // The time the notification will be sent (10h before)
  status: 'new' | 'processed';
  createdAt: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CLIENT_PROFILE = 'CLIENT_PROFILE',
  SESSION = 'SESSION',
  FINANCE = 'FINANCE',
  ANALYTICS = 'ANALYTICS',
  CLIENT_HOME = 'CLIENT_HOME',
}

// Telegram Web App Types
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setText: (text: string) => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
      };
    };
  }
}
