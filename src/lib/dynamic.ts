// src/lib/dynamic.ts — Helper pour les imports dynamiques typés
import dynamic, { type DynamicOptions } from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Wrapper typé autour de next/dynamic pour éviter les `as any`.
 * Usage: const Page = dynamicImport(() => import("./MaPage"))
 */
export function dynamicImport<T extends ComponentType<unknown>>(
  loader: () => Promise<{ default: T } | T>,
  options?: Omit<DynamicOptions<Record<string, unknown>>, "loader">,
) {
  return dynamic(loader as () => Promise<{ default: T }>, options);
}
