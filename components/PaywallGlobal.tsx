"use client";

import { useEffect, useState } from "react";
import Paywall from "./Paywall";
import { suscribirsePaywall } from "../lib/paywall-bus";
import type { PayloadPaywall } from "../lib/paywall-bus";

/**
 * Monta un Paywall global que escucha el event bus (lib/paywall-bus.ts)
 * para abrirse. Colocar una sola instancia en el layout evita tener que
 * pasar props por toda la app.
 */
export default function PaywallGlobal() {
  const [abierto, setAbierto] = useState(false);
  const [payload, setPayload] = useState<PayloadPaywall | undefined>(undefined);

  useEffect(() => {
    const unsub = suscribirsePaywall(p => {
      setPayload(p);
      setAbierto(true);
    });
    return unsub;
  }, []);

  return <Paywall abierto={abierto} onCerrar={() => setAbierto(false)} payload={payload} />;
}
