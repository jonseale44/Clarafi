class ApiService {
  private baseUrl = '/api';

  private async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async login(username: string, password: string) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getUser() {
    return this.request('/user');
  }

  async getPatients() {
    return this.request('/patients');
  }

  async getPatient(id: number) {
    return this.request(`/patients/${id}`);
  }

  async startEncounter(patientId: number) {
    return this.request('/encounters', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  }
}

export const apiService = new ApiService();