import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AppService } from "./app.service";
import { Conversation, Message, Report } from "./models";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit {
  conversations: Conversation[] = [];
  reports: Report[] = [];
  messages: Message[] = [];
  restaurants: string[] = [];
  selectedConversation: Conversation | null = null;
  newConversationTitle = "";
  newMessage = "";
  reportTitle = "";
  reportContent = "";
  isSending = false;

  constructor(private readonly appService: AppService) {}

  ngOnInit(): void {
    this.refreshConversations();
    this.refreshReports();
    this.appService.getRestaurants().subscribe((restaurants) => {
      this.restaurants = restaurants;
    });
  }

  refreshConversations(): void {
    this.appService.getConversations().subscribe((conversations) => {
      this.conversations = conversations;
      if (this.selectedConversation) {
        const match = conversations.find(
          (conversation) => conversation.id === this.selectedConversation?.id
        );
        if (!match) {
          this.selectedConversation = null;
          this.messages = [];
        }
      }
    });
  }

  refreshReports(): void {
    this.appService.getReports().subscribe((reports) => {
      this.reports = reports;
    });
  }

  createConversation(): void {
    if (!this.newConversationTitle.trim()) {
      return;
    }

    this.appService.createConversation(this.newConversationTitle.trim()).subscribe((conversation) => {
      this.newConversationTitle = "";
      this.refreshConversations();
      this.selectConversation(conversation);
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.reportTitle = conversation.title;
    this.reportContent = "";
    this.appService.getMessages(conversation.id).subscribe((messages) => {
      this.messages = messages;
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) {
      return;
    }

    const message = this.newMessage.trim();
    this.newMessage = "";
    this.isSending = true;

    this.appService.sendChat(this.selectedConversation?.id ?? null, message).subscribe({
      next: (response) => {
        if (!this.selectedConversation) {
          this.appService
            .getConversations()
            .subscribe((conversations) => {
              const found = conversations.find((conversation) => conversation.id === response.conversationId);
              if (found) {
                this.selectConversation(found);
              }
              this.refreshConversations();
            });
        } else {
          this.appService.getMessages(this.selectedConversation.id).subscribe((messages) => {
            this.messages = messages;
          });
        }
      },
      error: () => {
        this.isSending = false;
      },
      complete: () => {
        this.isSending = false;
      }
    });
  }

  saveReport(): void {
    if (!this.selectedConversation) {
      return;
    }

    const title = this.reportTitle.trim();
    const content = this.reportContent.trim();
    if (!title || !content) {
      return;
    }

    this.appService.saveReport(this.selectedConversation.id, title, content).subscribe(() => {
      this.reportTitle = this.selectedConversation?.title ?? "";
      this.reportContent = "";
      this.refreshReports();
    });
  }

  trackById(_: number, item: Conversation | Message | Report): number {
    return item.id;
  }
}
