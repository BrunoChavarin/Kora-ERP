import { db } from './db';
import { User, Company } from '../types';

export const authService = {
  async getSession(): Promise<{ user: User; company: Company } | null> {
    const session = db.get('session');
    if (!session || !session.user) return null;
    return session;
  },

  async login(email: string, password: string): Promise<{ user: User; company: Company }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users: User[] = db.get('users');
        const user = users.find(u => u.email === email);
        if (!user) {
          return reject(new Error('El usuario no existe o las credenciales son incorrectas.'));
        }
        
        const company: Company = db.get('company');
        const session = { user, company };
        db.save('session', session);
        resolve(session);
      }, 500);
    });
  },

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    companyName: string;
  }): Promise<{ user: User; company: Company }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCompany: Company = {
          id: `comp-${Math.random().toString(36).substr(2, 9)}`,
          name: data.companyName,
          currency: 'MXN',
          taxRate: 16,
          language: 'es',
          createdAt: new Date().toISOString()
        };

        const newUser: User = {
          id: `usr-${Math.random().toString(36).substr(2, 9)}`,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: 'role-admin',
          companyId: newCompany.id,
          createdAt: new Date().toISOString()
        };

        const currentUsers = db.get('users');
        db.save('users', [...currentUsers, newUser]);
        db.save('company', newCompany);

        const session = { user: newUser, company: newCompany };
        db.save('session', session);
        resolve(session);
      }, 500);
    });
  },

  async recoverPassword(email: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 400);
    });
  },

  async logout(): Promise<void> {
    db.save('session', null);
  }
};
