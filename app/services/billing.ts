import * as WebBrowser from "expo-web-browser";
import { ensureAppSession } from "../utils/appSession";
import { InboxActionRoute, pushInboxNotification } from "../utils/notificationInbox";
import { getBackendBaseUrl } from "./openFinanceApi";

type BillingOpenOptions = {
  inboxTitle?: string;
  inboxMessage?: string;
  actionRoute?: InboxActionRoute;
};

type BillingOpenResponse = {
  ok: true;
  url: string;
  id?: string;
};

type BillingStatusResponse = {
  ok: true;
  session?: {
    id: string;
    status: string | null;
    paymentStatus: string | null;
    customer: string | null;
    subscription: string | null;
  };
  subscription: {
    plan: "free" | "premium";
    status: string | null;
  };
  plan?: "free" | "premium";
  status?: string | null;
};

function getReadableBillingMessage(input: unknown) {
  if (typeof input === "string" && input.trim()) {
    return input;
  }

  if (input && typeof input === "object") {
    const candidate =
      (input as any).message ||
      (input as any).error ||
      (input as any).detail ||
      (input as any).codeDescription;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

async function billingRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  }
): Promise<T> {
  const session = await ensureAppSession();

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: options?.method || "POST",
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
      if (rawText.trim().startsWith("<")) {
        throw new Error(
          "O backend respondeu HTML em vez de JSON. Verifique se ele está online e acessível."
        );
      }

      throw new Error("O backend respondeu um conteúdo que não é JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error(
      getReadableBillingMessage(data?.error) ||
        getReadableBillingMessage(data) ||
        "Não foi possível comunicar com o backend."
    );
  }

  return data as T;
}

async function openBillingUrl(
  path: string,
  options?: BillingOpenOptions
) {
  const data = await billingRequest<BillingOpenResponse>(path, {
    method: "POST",
  });

  if (options?.inboxTitle && options?.inboxMessage) {
    await pushInboxNotification({
      kind: "billing",
      title: options.inboxTitle,
      message: options.inboxMessage,
      actionRoute: options.actionRoute ?? "/assinatura",
      source: "billing",
    });
  }

  return WebBrowser.openBrowserAsync(data.url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
    showTitle: true,
  });
}

export async function openPremiumCheckout(options?: BillingOpenOptions) {
  return openBillingUrl("/api/billing/checkout-session", options);
}

export async function openManagePlan(options?: BillingOpenOptions) {
  return openBillingUrl("/api/billing/portal-session", options);
}

export async function confirmCheckoutSession(sessionId: string) {
  return billingRequest<BillingStatusResponse>(
    `/api/billing/checkout-session/${encodeURIComponent(sessionId)}`,
    { method: "GET" }
  );
}

export async function getBillingStatus() {
  return billingRequest<BillingStatusResponse>("/api/billing/me", {
    method: "GET",
  });
}
