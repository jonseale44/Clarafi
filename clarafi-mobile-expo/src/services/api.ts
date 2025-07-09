import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://jonathanseale-07-08-jonathanseale.replit.app';

class ApiService {
  private token: string | null = null;

  async init() {
    try {
      this.token = await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  async apiRequest(method: string, endpoint: string, data?: any) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.status === 401) {
        await SecureStore.deleteItemAsync('authToken');
        this.token = null;
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async login(username: string, password: string) {
    const data = await this.apiRequest('POST', '/api/login', { username, password });
    if (data.token) {
      this.token = data.token;
      await SecureStore.setItemAsync('authToken', data.token);
    }
    return data;
  }

  async logout() {
    await SecureStore.deleteItemAsync('authToken');
    this.token = null;
  }

  // Patient endpoints
  async getPatients() {
    return this.apiRequest('GET', '/api/patients');
  }

  async getPatient(id: number) {
    return this.apiRequest('GET', `/api/patients/${id}`);
  }

  async createPatient(patient: any) {
    return this.apiRequest('POST', '/api/patients', patient);
  }

  // Encounter endpoints
  async getEncounters(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/encounters`);
  }

  async createEncounter(patientId: number, encounter: any) {
    return this.apiRequest('POST', `/api/patients/${patientId}/encounters`, encounter);
  }

  // Voice transcription
  async transcribeAudio(patientId: number, encounterId: number, audioUri: string) {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    
    return this.apiRequest('POST', `/api/voice/transcribe`, formData);
  }

  // Orders
  async parseOrders(text: string) {
    return this.apiRequest('POST', '/api/parse-orders', { text });
  }

  // Chart sections
  async getVitals(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/vitals`);
  }

  async getMedicalProblems(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/medical-problems`);
  }

  async getMedications(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/medications`);
  }

  async getAllergies(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/allergies`);
  }

  async getLabResults(patientId: number) {
    return this.apiRequest('GET', `/api/patients/${patientId}/lab-results`);
  }
}

export const api = new ApiService();