import { MoyasarProvider, TapProvider } from "./providers";
import type { PaymentProvider, PaymentProviderName } from "./types";

const providers: Record<PaymentProviderName, PaymentProvider> = {
  moyasar: new MoyasarProvider(),
  tap: new TapProvider()
};

export function getProvider(name: string): PaymentProvider {
  const provider = providers[name as PaymentProviderName];
  if (!provider) {
    throw new Error("UNSUPPORTED_PROVIDER");
  }
  return provider;
}
