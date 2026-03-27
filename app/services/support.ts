import { ensureAppSession } from "../utils/appSession";
import { pushInboxNotification } from "../utils/notificationInbox";
import { getBackendBaseUrl } from "./openFinanceApi";

export type SupportTicketCategory =
  | "app"
  | "billing"
  | "bank"
  | "account"
  | "bug"
  | "suggestion";

export type SupportTicketStatus = "open" | "answered" | "closed" | string;

export type SupportTicket = {
  publicId: string;
  userId: string;
  contactEmail: string | null;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
};

type SupportApiResponse<T> = {
  ok: true;
  ticket?: T;
  tickets?: T[];
};

async function supportRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  }
): Promise<T> {
  const session = await ensureAppSession();

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": session.userId,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const rawText = await response.text();
  let data: any = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("O backend respondeu algo inválido ao suporte.");
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível falar com o suporte agora.");
  }

  return data as T;
}

export async function listSupportTickets(limit = 12) {
  const data = await supportRequest<SupportApiResponse<SupportTicket>>(
    `/api/support/tickets?limit=${encodeURIComponent(String(limit))}`
  );

  return data.tickets || [];
}

export async function createSupportTicket(input: {
  contactEmail?: string | null;
  category: SupportTicketCategory;
  subject: string;
  message: string;
}) {
  const data = await supportRequest<SupportApiResponse<SupportTicket>>(
    "/api/support/tickets",
    {
      method: "POST",
      body: input,
    }
  );

  if (data.ticket) {
    await pushInboxNotification({
      kind: "app",
      title: "Chamado recebido",
      message: `Seu pedido de ajuda ${data.ticket.publicId} foi registrado no app.`,
      actionRoute: "/ajuda-suporte",
      source: "support",
      sourceId: data.ticket.publicId,
    });
  }

  return data.ticket;
}
