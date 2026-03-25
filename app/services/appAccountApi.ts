import { AppSessionProvider } from "../utils/appSession";
import { CurrencyPreference, RegionPreference } from "../utils/appTheme";
import { getBackendBaseUrl } from "./openFinanceApi";

export type BackendUserAccount = {
  id: string;
  provider: AppSessionProvider;
  email: string | null;
  name: string | null;
  nickname: string | null;
  photoUrl: string | null;
  locale: string | null;
  region: string | null;
  currencyCode: string | null;
  googleLinked: boolean;
  createdAt: string;
  updatedAt: string;
};

type BootstrapAccountPayload = {
  userId: string;
  provider?: AppSessionProvider;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  photoUri?: string | null;
  locale?: string | null;
  regionPreference?: RegionPreference;
  currencyPreference?: CurrencyPreference;
};

type GoogleLinkPayload = {
  userId: string;
  idToken: string;
  locale?: string | null;
  regionPreference?: RegionPreference;
  currencyPreference?: CurrencyPreference;
};

type BackendUserResponse = {
  ok: true;
  user: BackendUserAccount;
};

function mapRegionPreference(regionPreference?: RegionPreference) {
  return regionPreference && regionPreference !== "auto" ? regionPreference : null;
}

function mapCurrencyPreference(currencyPreference?: CurrencyPreference) {
  return currencyPreference && currencyPreference !== "auto"
    ? currencyPreference
    : null;
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  userId?: string
): Promise<T> {
  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let data: any = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.trim().startsWith("<")) {
        throw new Error(
          "O backend respondeu HTML em vez de JSON. Verifique se ele está online e acessível na porta 3333."
        );
      }

      throw new Error("O backend respondeu um conteúdo que não é JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível comunicar com o backend.");
  }

  return data as T;
}

export async function bootstrapAppAccount(
  payload: BootstrapAccountPayload
): Promise<BackendUserAccount> {
  const data = await postJson<BackendUserResponse>("/api/auth/bootstrap", {
    userId: payload.userId,
    provider: payload.provider || "local",
    email: payload.email || null,
    name: payload.name || null,
    nickname: payload.nickname || null,
    photoUri: payload.photoUri || null,
    locale: payload.locale || null,
    region: mapRegionPreference(payload.regionPreference),
    currencyCode: mapCurrencyPreference(payload.currencyPreference),
  });

  return data.user;
}

export async function linkGoogleAccount(
  payload: GoogleLinkPayload
): Promise<BackendUserAccount> {
  const data = await postJson<BackendUserResponse>(
    "/api/auth/google/link",
    {
      idToken: payload.idToken,
      locale: payload.locale || null,
      region: mapRegionPreference(payload.regionPreference),
      currencyCode: mapCurrencyPreference(payload.currencyPreference),
    },
    payload.userId
  );

  return data.user;
}
