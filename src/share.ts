import type { Comp, Wire } from "./logic";

export type SharedCircuit = { comps: Comp[]; wires: Wire[]; note: string };

export function encodeCircuit(c: SharedCircuit): string {
  const json = JSON.stringify(c);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeCircuit(s: string): SharedCircuit | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    const obj = JSON.parse(json);
    if (obj && Array.isArray(obj.comps) && Array.isArray(obj.wires)) {
      return { comps: obj.comps, wires: obj.wires, note: obj.note ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(c: SharedCircuit): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("c", encodeCircuit(c));
  return url.toString();
}

export function readSharedFromUrl(): SharedCircuit | null {
  const params = new URLSearchParams(window.location.search);
  const c = params.get("c");
  if (!c) return null;
  return decodeCircuit(c);
}
