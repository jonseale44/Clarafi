// API Service for Clarafi Mobile
// Connects to your existing Express backend

// Use Replit URL in production, localhost for local development
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiClient {
  private token: string | null = null;

  // Authentication
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // For cookie-based auth
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.token || null;
    return data;
  }

  // Get authenticated user
  async getUser() {
    return this.authenticatedRequest('/api/user');
  }

  // Get patients
  async getPatients() {
    return this.authenticatedRequest('/api/patients');
  }

  // Get patient by ID
  async getPatient(id: number) {
    return this.authenticatedRequest(`/api/patients/${id}`);
  }

  // Start new encounter
  async startEncounter(patientId: number) {
    return this.authenticatedRequest('/api/encounters', {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  }

  // Generate SOAP note from transcription
  async generateSOAPNote(transcription: string, encounterId?: number) {
    return this.authenticatedRequest('/api/generate-soap', {
      method: 'POST',
      body: JSON.stringify({ transcription, encounterId }),
    });
  }

  // Parse orders from natural language
  async parseOrders(text: string) {
    return this.authenticatedRequest('/api/parse-orders', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Update chart from SOAP note
  async updateChartFromNote(soapNote: string, encounterId: number) {
    const endpoints = [
      '/api/medical-problems/process-unified',
      '/api/medications/process-unified',
      '/api/allergies/process-unified',
      '/api/social-history/process-unified',
      '/api/family-history/process-unified',
    ];

    const updates = await Promise.all(
      endpoints.map(endpoint =>
        this.authenticatedRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify({ soapNote, encounterId }),
        }).catch(err => {
          console.error(`Failed to update ${endpoint}:`, err);
          return null;
        })
      )
    );

    return updates.filter(Boolean);
  }

  // Helper method for authenticated requests
  private async authenticatedRequest(endpoint: string, options?: RequestInit) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...options?.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // WebSocket connection for real-time transcription
  connectToRealtimeTranscription() {
    // Your existing WebSocket proxy endpoint
    const ws = new WebSocket(`ws://localhost:5000/api/realtime/connect`);
    return ws;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();