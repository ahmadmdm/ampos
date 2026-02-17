import type { EventEnvelope } from "@pos1/types";

export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
}

export class PosApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  getMenu(branchId: string, tableId: string, token: string) {
    return this.request(`/api/customer/menu?branchId=${branchId}&tableId=${tableId}&token=${token}`);
  }

  createWaiterCall(input: Record<string, unknown>) {
    return this.request(`/api/customer/waiter-calls`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  syncEvents(input: Record<string, unknown>) {
    return this.request(`/api/pos/sync/events`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
}

export type RealtimeEvent<T> = EventEnvelope<T>;
