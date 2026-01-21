import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ChatResponse, Conversation, Message, Report } from "./models";

@Injectable({ providedIn: "root" })
export class AppService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "http://localhost:3001/api";

  getRestaurants() {
    return this.http.get<string[]>(`${this.baseUrl}/restaurants`);
  }

  getConversations() {
    return this.http.get<Conversation[]>(`${this.baseUrl}/conversations`);
  }

  createConversation(title: string) {
    return this.http.post<Conversation>(`${this.baseUrl}/conversations`, { title });
  }

  getMessages(conversationId: number) {
    return this.http.get<Message[]>(`${this.baseUrl}/conversations/${conversationId}/messages`);
  }

  sendChat(conversationId: number | null, message: string) {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, {
      conversationId: conversationId ?? undefined,
      message
    });
  }

  getReports() {
    return this.http.get<Report[]>(`${this.baseUrl}/reports`);
  }

  saveReport(conversationId: number, title: string, content: string) {
    return this.http.post<Report>(`${this.baseUrl}/reports`, {
      conversationId,
      title,
      content
    });
  }
}
