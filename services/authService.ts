import { User } from '@/types';

// Mock in-memory user storage
const mockUsers: { [email: string]: { password: string; user: User } } = {
  'demo@example.com': {
    password: 'demo123',
    user: {
      id: '1',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'marketing_user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      createdAt: new Date(),
    },
  },
  'admin@example.com': {
    password: 'admin123',
    user: {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      createdAt: new Date(),
    },
  },
};

// TODO: Replace mock authentication with real backend API
// Integration points:
// - Connect to actual authentication provider (Firebase, Auth0, Supabase, etc.)
// - Store sessions in database
// - Implement JWT token management
// - Add password hashing and validation

export const authService = {
  async login(email: string, password: string): Promise<User> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = mockUsers[email];
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Store token in localStorage (mock)
    localStorage.setItem('authToken', JSON.stringify(user.user));
    return user.user;
  },

  async register(email: string, name: string, password: string): Promise<User> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (mockUsers[email]) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
      role: 'marketing_user',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date(),
    };

    mockUsers[email] = {
      password,
      user: newUser,
    };

    localStorage.setItem('authToken', JSON.stringify(newUser));
    return newUser;
  },

  async resetPassword(email: string): Promise<void> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!mockUsers[email]) {
      throw new Error('Email not found');
    }

    // TODO: Send password reset email
    // - Generate reset token
    // - Send email with reset link
    // - Handle token verification and password update

    console.log(`Password reset email would be sent to ${email}`);
  },

  logout(): void {
    localStorage.removeItem('authToken');
  },

  getCurrentUser(): User | null {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      return JSON.parse(token);
    } catch {
      return null;
    }
  },
};
