export type Kind = "IN" | "OUT" | "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR";
export type Bit = 0 | 1;

export type Comp = { id: string; kind: Kind; x: number; y: number; val?: Bit; label?: string };
export type Wire = { id: string; from: string; to: string; toPort: number };

export const GATES: Kind[] = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];

export function numInputs(kind: Kind): number {
  if (kind === "IN") return 0;
  if (kind === "OUT" || kind === "NOT") return 1;
  return 2;
}
export function hasOutput(kind: Kind): boolean {
  return kind !== "OUT";
}

export function dims(kind: Kind): { w: number; h: number } {
  if (kind === "IN" || kind === "OUT") return { w: 58, h: 40 };
  return { w: 80, h: 54 };
}

export function outPort(c: Comp) {
  const { w, h } = dims(c.kind);
  return { x: c.x + w, y: c.y + h / 2 };
}
export function inPort(c: Comp, i: number) {
  const { h } = dims(c.kind);
  const n = numInputs(c.kind);
  return { x: c.x, y: c.y + ((i + 1) * h) / (n + 1) };
}

function gate(kind: Kind, a: Bit, b: Bit): Bit {
  switch (kind) {
    case "AND": return (a && b) ? 1 : 0;
    case "OR": return (a || b) ? 1 : 0;
    case "NOT": return a ? 0 : 1;
    case "NAND": return (a && b) ? 0 : 1;
    case "NOR": return (a || b) ? 0 : 1;
    case "XOR": return (a ^ b) as Bit;
    case "XNOR": return (a ^ b) ? 0 : 1;
    default: return 0;
  }
}

// Iterative relaxation: settles combinational logic instantly and lets
// feedback loops (latches, flip-flops) converge to a stable state.
export function evaluate(comps: Comp[], wires: Wire[]): Record<string, Bit> {
  const val: Record<string, Bit> = {};
  for (const c of comps) val[c.id] = c.kind === "IN" ? (c.val ?? 0) : 0;

  const inputsOf = (compId: string, port: number): Bit => {
    const w = wires.find((w) => w.to === compId && w.toPort === port);
    return w ? (val[w.from] ?? 0) : 0;
  };

  for (let iter = 0; iter < 40; iter++) {
    const next: Record<string, Bit> = { ...val };
    for (const c of comps) {
      if (c.kind === "IN") { next[c.id] = c.val ?? 0; continue; }
      if (c.kind === "OUT") { next[c.id] = inputsOf(c.id, 0); continue; }
      const a = inputsOf(c.id, 0);
      const b = numInputs(c.kind) > 1 ? inputsOf(c.id, 1) : 0;
      next[c.id] = gate(c.kind, a, b);
    }
    let changed = false;
    for (const c of comps) if (next[c.id] !== val[c.id]) changed = true;
    Object.assign(val, next);
    if (!changed) break;
  }
  return val;
}

// ---- example circuits -----------------------------------------------------
let idc = 0;
const uid = (p: string) => `${p}${idc++}`;

type Circuit = { comps: Comp[]; wires: Wire[]; note: string };

export function preset(name: string): Circuit {
  idc = Date.now() % 100000;
  const W = (from: string, to: string, toPort: number): Wire => ({ id: uid("w"), from, to, toPort });

  if (name === "Half Adder") {
    const a = { id: uid("in"), kind: "IN" as Kind, x: 60, y: 70, val: 0 as Bit, label: "A" };
    const b = { id: uid("in"), kind: "IN" as Kind, x: 60, y: 190, val: 0 as Bit, label: "B" };
    const xor = { id: uid("g"), kind: "XOR" as Kind, x: 250, y: 80 };
    const and = { id: uid("g"), kind: "AND" as Kind, x: 250, y: 200 };
    const sum = { id: uid("out"), kind: "OUT" as Kind, x: 470, y: 90, label: "Sum" };
    const carry = { id: uid("out"), kind: "OUT" as Kind, x: 470, y: 210, label: "Carry" };
    return {
      note: "Sum = A⊕B, Carry = A·B",
      comps: [a, b, xor, and, sum, carry],
      wires: [W(a.id, xor.id, 0), W(b.id, xor.id, 1), W(a.id, and.id, 0), W(b.id, and.id, 1), W(xor.id, sum.id, 0), W(and.id, carry.id, 0)],
    };
  }

  if (name === "Full Adder") {
    const a = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 40, val: 0 as Bit, label: "A" };
    const b = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 130, val: 0 as Bit, label: "B" };
    const cin = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 240, val: 0 as Bit, label: "Cin" };
    const x1 = { id: uid("g"), kind: "XOR" as Kind, x: 200, y: 60 };
    const x2 = { id: uid("g"), kind: "XOR" as Kind, x: 380, y: 120 };
    const a1 = { id: uid("g"), kind: "AND" as Kind, x: 200, y: 200 };
    const a2 = { id: uid("g"), kind: "AND" as Kind, x: 380, y: 260 };
    const or = { id: uid("g"), kind: "OR" as Kind, x: 560, y: 230 };
    const sum = { id: uid("out"), kind: "OUT" as Kind, x: 560, y: 130, label: "Sum" };
    const cout = { id: uid("out"), kind: "OUT" as Kind, x: 720, y: 240, label: "Cout" };
    return {
      note: "Sum = A⊕B⊕Cin, Cout = A·B + Cin·(A⊕B)",
      comps: [a, b, cin, x1, x2, a1, a2, or, sum, cout],
      wires: [
        W(a.id, x1.id, 0), W(b.id, x1.id, 1), W(x1.id, x2.id, 0), W(cin.id, x2.id, 1), W(x2.id, sum.id, 0),
        W(a.id, a1.id, 0), W(b.id, a1.id, 1), W(x1.id, a2.id, 0), W(cin.id, a2.id, 1),
        W(a1.id, or.id, 0), W(a2.id, or.id, 1), W(or.id, cout.id, 0),
      ],
    };
  }

  if (name === "SR Latch") {
    const r = { id: uid("in"), kind: "IN" as Kind, x: 60, y: 60, val: 0 as Bit, label: "R" };
    const s = { id: uid("in"), kind: "IN" as Kind, x: 60, y: 240, val: 0 as Bit, label: "S" };
    const n1 = { id: uid("g"), kind: "NOR" as Kind, x: 280, y: 80 };
    const n2 = { id: uid("g"), kind: "NOR" as Kind, x: 280, y: 210 };
    const q = { id: uid("out"), kind: "OUT" as Kind, x: 500, y: 90, label: "Q" };
    const qb = { id: uid("out"), kind: "OUT" as Kind, x: 500, y: 220, label: "Q'" };
    return {
      note: "Cross-coupled NOR gates — feedback holds state (S/R = Set/Reset)",
      comps: [r, s, n1, n2, q, qb],
      wires: [W(r.id, n1.id, 0), W(n2.id, n1.id, 1), W(s.id, n2.id, 1), W(n1.id, n2.id, 0), W(n1.id, q.id, 0), W(n2.id, qb.id, 0)],
    };
  }

  if (name === "2:1 MUX") {
    const a = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 50, val: 0 as Bit, label: "A" };
    const b = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 150, val: 0 as Bit, label: "B" };
    const sel = { id: uid("in"), kind: "IN" as Kind, x: 40, y: 260, val: 0 as Bit, label: "Sel" };
    const not = { id: uid("g"), kind: "NOT" as Kind, x: 200, y: 265 };
    const a1 = { id: uid("g"), kind: "AND" as Kind, x: 360, y: 60 };
    const a2 = { id: uid("g"), kind: "AND" as Kind, x: 360, y: 180 };
    const or = { id: uid("g"), kind: "OR" as Kind, x: 540, y: 120 };
    const y = { id: uid("out"), kind: "OUT" as Kind, x: 720, y: 130, label: "Y" };
    return {
      note: "Y = A·Sel' + B·Sel  (Sel picks A when 0, B when 1)",
      comps: [a, b, sel, not, a1, a2, or, y],
      wires: [
        W(sel.id, not.id, 0), W(a.id, a1.id, 0), W(not.id, a1.id, 1),
        W(b.id, a2.id, 0), W(sel.id, a2.id, 1), W(a1.id, or.id, 0), W(a2.id, or.id, 1), W(or.id, y.id, 0),
      ],
    };
  }

  return { comps: [], wires: [], note: "" };
}

// Truth table over all IN components (combinational settle from reset each row).
export function truthTable(comps: Comp[], wires: Wire[]) {
  const ins = comps.filter((c) => c.kind === "IN");
  const outs = comps.filter((c) => c.kind === "OUT");
  if (ins.length === 0 || outs.length === 0 || ins.length > 5) return null;
  const rows: { in: Bit[]; out: Bit[] }[] = [];
  for (let m = 0; m < (1 << ins.length); m++) {
    const trial = comps.map((c) => {
      if (c.kind !== "IN") return c;
      const bit = ((m >> ins.indexOf(c)) & 1) as Bit;
      return { ...c, val: bit };
    });
    const v = evaluate(trial, wires);
    rows.push({
      in: ins.map((c) => ((m >> ins.indexOf(c)) & 1) as Bit),
      out: outs.map((c) => v[c.id] ?? 0),
    });
  }
  return { inLabels: ins.map((c, i) => c.label || `I${i}`), outLabels: outs.map((c, i) => c.label || `O${i}`), rows };
}
