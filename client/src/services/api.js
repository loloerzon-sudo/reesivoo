const BASE_URL = '/api';

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || (typeof data === 'string' ? data : `HTTP ${res.status}`);
    throw new Error(errorMsg);
  }

  return data;
}

export const authApi = {
  async getAuthUrl() {
    return fetchApi('/auth/url');
  },

  async handleCallback(code) {
    return fetchApi('/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  },

  async getCurrentUser() {
    return fetchApi('/auth/me');
  },

  async logout() {
    return fetchApi('/auth/logout', { method: 'POST' });
  },
};

export const receiptApi = {
  async analyzeReceipt(file) {
    const formData = new FormData();
    formData.append('receipt', file);

    return fetchApi('/receipts/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  async submitReceipt(tempImageId, verifiedData) {
    return fetchApi('/receipts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempImageId, verifiedData }),
    });
  },

  async discardReceipt(tempImageId) {
    return fetchApi('/receipts/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempImageId }),
    });
  },
};

export const couponApi = {
  async redeem(code) {
    return fetchApi('/coupons/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  },
};

export const adminApi = {
  async getCoupons() {
    return fetchApi('/admin/coupons');
  },

  async generateBatch(data) {
    return fetchApi('/admin/coupons/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createCoupon(data) {
    return fetchApi('/admin/coupons/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteCoupon(id) {
    return fetchApi(`/admin/coupons/${id}`, {
      method: 'DELETE',
    });
  },

  async getUsers() {
    return fetchApi('/admin/users');
  },

  async updateUserCredits(id, credits) {
    return fetchApi(`/admin/users/${id}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits }),
    });
  },
};
