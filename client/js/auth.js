/**
 * Authentication management module.
 */

import api from './api.js';
import { showToast } from './ui.js';

const TOKEN_KEY = 'cpg_token';
const USER_KEY = 'cpg_user';

let currentUser = null;

export const auth = {
  getUser() {
    return currentUser;
  },

  isAuthenticated() {
    return currentUser !== null;
  },

  hasRole(...roles) {
    return currentUser && roles.includes(currentUser.role);
  },

  async init() {
    // 1. Try restoring cached user from localStorage for instant smooth render
    const cachedUserJson = localStorage.getItem(USER_KEY);
    if (cachedUserJson) {
      try {
        currentUser = JSON.parse(cachedUserJson);
        this.updateNav();
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    // 2. Validate session with backend
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        if (res.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
        }
        currentUser = res.user;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        this.updateNav();
        return currentUser;
      }
    } catch { /* network or server error */ }

    // If backend returns 401 or user not found, and no valid session
    if (!localStorage.getItem(TOKEN_KEY)) {
      currentUser = null;
      localStorage.removeItem(USER_KEY);
      this.updateNav();
      return null;
    }

    return currentUser;
  },

  async login(email, password) {
    const res = await api.login({ email, password });
    if (res.success && res.user) {
      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      currentUser = res.user;
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      this.updateNav();
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      window.location.hash = '#dashboard';
      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  },

  async register(data) {
    const res = await api.register(data);
    if (res.success) {
      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      if (res.user && res.user.role === 'student') {
        currentUser = res.user;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        this.updateNav();
        showToast('Registration successful! Welcome to College Placement Guide.', 'success');
        window.location.hash = '#profile';
      } else {
        showToast(res.message || 'Registration submitted! Waiting for approval.', 'info');
        window.location.hash = '#login';
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed' };
  },

  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    await api.logout();
    currentUser = null;
    this.updateNav();
    showToast('You have been logged out.', 'info');
    window.location.hash = '#login';
  },

  updateNav() {
    const sidebar = document.getElementById('sidebar');
    const userDisplay = document.getElementById('user-display');
    const userRoleBadge = document.getElementById('user-role-badge');
    const navLinks = document.querySelectorAll('[data-role]');

    if (!currentUser) {
      if (sidebar) sidebar.classList.add('hidden');
      if (userDisplay) userDisplay.textContent = '';
      return;
    }

    if (sidebar) sidebar.classList.remove('hidden');
    if (userDisplay) userDisplay.textContent = currentUser.name;
    if (userRoleBadge) {
      userRoleBadge.textContent = currentUser.role.toUpperCase();
      userRoleBadge.className = `badge badge-${currentUser.role}`;
    }

    // Show/hide nav links based on role
    navLinks.forEach((link) => {
      const allowedRoles = link.getAttribute('data-role').split(',');
      if (allowedRoles.includes('all') || allowedRoles.includes(currentUser.role)) {
        link.classList.remove('hidden');
      } else {
        link.classList.add('hidden');
      }
    });
  },
};

export default auth;
