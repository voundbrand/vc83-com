// Cal.com API Client
// Documentation: https://cal.com/docs/api-reference/v2/introduction

export class CalAPI {
  private apiKey: string;
  private apiUrl: string;
  private apiUrlV2: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.CAL_API_KEY || '';
    this.apiUrl = apiUrl || process.env.CAL_API_URL || 'https://api.cal.com/v1';
    this.apiUrlV2 = 'https://api.cal.com/v2';
  }

  private async request(endpoint: string, options?: RequestInit) {
    // For availability endpoints, we might not need API key
    const url = endpoint.includes('/availability') && endpoint.includes('username=')
      ? `${this.apiUrl}${endpoint}` // Public availability doesn't require API key
      : `${this.apiUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${this.apiKey}`;
      
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cal.com API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // V2 Event Types
  async getEventTypesV2(params?: {
    username?: string;
    eventSlug?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.username) queryParams.append('username', params.username);
    if (params?.eventSlug) queryParams.append('eventSlug', params.eventSlug);
    const query = queryParams.toString();
    
    return this.requestV2(`/event-types${query ? `?${query}` : ''}`);
  }

  async getEventTypeV2(id: number) {
    return this.requestV2(`/event-types/${id}`);
  }

  // V1 Event Types (legacy)
  async getEventTypes() {
    return this.request('/event-types');
  }

  async getEventType(id: number) {
    return this.request(`/event-types/${id}`);
  }

  // Bookings
  async getBookings(params?: {
    userId?: number;
    teamId?: number;
    eventTypeId?: number;
    status?: 'upcoming' | 'past' | 'cancelled';
    startTime?: string;
    endTime?: string;
  }) {
    const queryParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams[key] = String(value);
        }
      });
    }
    const query = new URLSearchParams(queryParams).toString();
    return this.request(`/bookings${query ? `?${query}` : ''}`);
  }

  async getBooking(id: number) {
    return this.request(`/bookings/${id}`);
  }

  // V2 Create Booking
  async createBookingV2(data: {
    start: string; // ISO 8601 format
    eventTypeId: number;
    attendee: {
      name: string;
      email: string;
      timeZone: string;
      language?: string;
    };
    meetingUrl?: string;
    location?: string;
    metadata?: Record<string, unknown>;
    customInputs?: Array<unknown>;
  }) {
    return this.requestV2('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // V1 Create Booking (legacy)
  async createBooking(data: {
    eventTypeId: number;
    start: string;
    end: string;
    name: string;
    email: string;
    timeZone: string;
    language?: string;
    metadata?: Record<string, unknown>;
    customInputs?: Array<unknown>;
    location?: string;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelBooking(id: number, reason?: string) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // V2 API request method
  private async requestV2(endpoint: string, options?: RequestInit) {
    const url = `${this.apiUrlV2}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cal.com API V2 Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // V2 Availability - Get available slots
  // Note: v2 slots API might have different structure, let's try the public availability endpoint
  async getAvailabilitySlots(params: {
    eventTypeId: number;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    timeZone?: string;
    duration?: number;
  }) {
    // First try the v2 slots endpoint
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('eventTypeId', params.eventTypeId.toString());
      queryParams.append('startTime', params.startTime);
      queryParams.append('endTime', params.endTime);
      if (params.timeZone) queryParams.append('timeZone', params.timeZone);
      if (params.duration) queryParams.append('duration', params.duration.toString());
      
      return await this.requestV2(`/slots?${queryParams.toString()}`);
    } catch (v2Error) {
      console.error('V2 slots API failed:', v2Error);
      // Fall back to v1 availability API
      throw v2Error; // Re-throw to handle in the calling code
    }
  }

  // V1 Availability (legacy)
  async getAvailability(params: {
    eventTypeId?: number;
    userId?: number;
    username?: string;
    dateFrom: string;
    dateTo: string;
    timeZone?: string;
  }) {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    });
    const query = new URLSearchParams(queryParams).toString();
    return this.request(`/availability${query ? `?${query}` : ''}`);
  }

  async getBusyTimes(params: {
    userId?: number;
    username?: string;
    dateFrom: string;
    dateTo: string;
    timeZone?: string;
  }) {
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    });
    const query = new URLSearchParams(queryParams).toString();
    return this.request(`/busy-times${query ? `?${query}` : ''}`);
  }

  // Schedules
  async getSchedules() {
    return this.request('/schedules');
  }

  async getSchedule(id: number) {
    return this.request(`/schedules/${id}`);
  }

  // Users
  async getMe() {
    return this.request('/me');
  }

  async getUsers() {
    return this.request('/users');
  }

  // Teams
  async getTeams() {
    return this.request('/teams');
  }

  async getTeam(id: number) {
    return this.request(`/teams/${id}`);
  }

  // Webhooks
  async getWebhooks() {
    return this.request('/webhooks');
  }

  async createWebhook(data: {
    subscriberUrl: string;
    eventTriggers: string[];
    active?: boolean;
    payloadTemplate?: string;
  }) {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(id: string) {
    return this.request(`/webhooks/${id}`, {
      method: 'DELETE',
    });
  }
}

// Default export for easy usage
export const calApi = new CalAPI();