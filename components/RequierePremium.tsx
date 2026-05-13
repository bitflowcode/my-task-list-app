"use client";

import { ReactNode, useState } from "react";
import { useSuscripcion } from "../lib/useSuscripcion";
import Paywall from "./Paywall";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  motivo?: string;
};

/**
 * Envuelve cualquier UI que requiera plan premium. Si el usuario es free,
 * intercepta el click mostrando el paywall en lugar de ejecutar la acción.
 *
 * Uso recomendado:
 *
 *   <RequierePremium motivo="Esta función es premium">
 *     <button onClick={hacerCosaPremium}>Hacer cosa</button>
 *   </RequierePremium>
 */
export default function RequierePremium({ children, fallback, motivo }: Props) {
  const { tier, cargando } = useSuscripcion();
  const [paywallAbierto, setPaywallAbierto] = useState(false);

  if (cargando) return <>{fallback ?? children}</>;
  if (tier === "premium") return <>{children}</>;

  return (
    <>
      <div
        onClickCapture={e => {
          e.preventDefault();
          e.stopPropagation();
          setPaywallAbierto(true);
        }}
        className="relative cursor-pointer"
        role="button"
        aria-label="Requiere premium"
      >
        <div className="pointer-events-none opacity-60">{children}</div>
      </div>
      <Paywall
        abierto={paywallAbierto}
        onCerrar={() => setPaywallAbierto(false)}
        motivo={motivo}
      />
    </>
  );
}
