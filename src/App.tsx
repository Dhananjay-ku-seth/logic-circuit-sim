import { useEffect, useMemo, useRef, useState } from "react";
import {
  Kind, Comp, Wire, GATES, numInputs, hasOutput, dims, outPort, inPort,
  evaluate, preset, truthTable,
} from "./logic";
import AuthPanel from "./AuthPanel";
import SaveLoad from "./SaveLoad";

const SVW = 900, SVH = 380;
let counter = 1;
const nid = (p: string) => `${p}${counter++}_${Math.random().toString(36).slice(2, 6)}`;

export default function App() {
  const [comps, setComps] = useState<Comp[]>(() => preset("Half Adder").comps);
  const [wires, setWires] = useState<Wire[]>(() => preset("Half Adder").wires);
  const [note, setNote] = useState("Sum = A⊕B, Carry = A·B");
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const compsRef = useRef(comps); compsRef.current = comps;
  const wiresRef = useRef(wires); wiresRef.current = wires;
  const drag = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const wiring = useRef<string | null>(null);
  const hoverPort = useRef<{ id: string; port: number } | null>(null);

  const values = useMemo(() => evaluate(comps, wires), [comps, wires]);
  const table = useMemo(() => truthTable(comps, wires), [comps, wires]);

  function toSvg(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) * (SVW / r.width), y: (clientY - r.top) * (SVH / r.height) };
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      if (drag.current) {
        const d = drag.current;
        setComps((cs) => cs.map((c) => c.id === d.id ? { ...c, x: p.x - d.ox, y: p.y - d.oy } : c));
        d.moved = true;
      } else if (wiring.current) {
        setPending({ from: wiring.current, x: p.x, y: p.y });
      }
    };
    const up = () => {
      if (drag.current) {
        const d = drag.current;
        if (!d.moved) {
          const c = compsRef.current.find((c) => c.id === d.id);
          if (c?.kind === "IN") setComps((cs) => cs.map((x) => x.id === d.id ? { ...x, val: x.val ? 0 : 1 } : x));
          setSelected(d.id);
        }
        drag.current = null;
      }
      if (wiring.current) {
        const hp = hoverPort.current;
        const from = wiring.current;
        if (hp && hp.id !== from) {
          setWires((ws) => [...ws.filter((w) => !(w.to === hp.id && w.toPort === hp.port)),
            { id: nid("w"), from, to: hp.id, toPort: hp.port }]);
        }
        wiring.current = null;
        setPending(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        setComps((cs) => cs.filter((c) => c.id !== selected));
        setWires((ws) => ws.filter((w) => w.from !== selected && w.to !== selected));
        setSelected(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected]);

  function addComp(kind: Kind) {
    const c: Comp = { id: nid(kind), kind, x: 120 + (counter % 5) * 26, y: 60 + (counter % 4) * 30,
      val: kind === "IN" ? 0 : undefined, label: kind === "IN" ? "IN" : kind === "OUT" ? "OUT" : undefined };
    setComps((cs) => [...cs, c]);
  }
  function loadPreset(name: string) {
    counter += 1000;
    const p = preset(name);
    setComps(p.comps); setWires(p.wires); setNote(p.note); setSelected(null);
  }
  function clearAll() { setComps([]); setWires([]); setNote(""); setSelected(null); }

  function startWire(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    wiring.current = id;
    const p = toSvg(e.clientX, e.clientY);
    setPending({ from: id, x: p.x, y: p.y });
  }
  function startDrag(id: string, e: React.PointerEvent) {
    const c = comps.find((c) => c.id === id)!;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id, ox: p.x - c.x, oy: p.y - c.y, moved: false };
    setSelected(id);
  }

  const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="app">
      <header>
        <div className="mark">⊻</div>
        <div>
          <h1>LOGIC CIRCUIT SIMULATOR</h1>
          <p>Drag gates · click a port to wire · toggle inputs · live truth table — combinational &amp; sequential</p>
        </div>
        <div className="badges">
          <AuthPanel />
          <div className="badge-links">
            <a className="labbench-badge" href="https://labbench-hub.vercel.app/" target="_blank" rel="noopener noreferrer">⚡ LabBench</a>
            <a className="src" href="https://dhananjay-kumar-seth.vercel.app/" target="_blank" rel="noopener noreferrer">ECE Portfolio · Dhananjay Seth</a>
          </div>
        </div>
      </header>

      <div className="palette">
        <span className="p-label">ADD</span>
        <button onClick={() => addComp("IN")} className="in">Input</button>
        <button onClick={() => addComp("OUT")} className="out">Output</button>
        <span className="sep" />
        {GATES.map((g) => <button key={g} onClick={() => addComp(g)}>{g}</button>)}
        <span className="sep" />
        <span className="p-label">EXAMPLES</span>
        {["Half Adder", "Full Adder", "SR Latch", "2:1 MUX"].map((n) => (
          <button key={n} className="preset" onClick={() => loadPreset(n)}>{n}</button>
        ))}
        <button className="clear" onClick={clearAll}>Clear</button>
      </div>

      <div className="palette">
        <SaveLoad comps={comps} wires={wires} note={note} onLoad={(c, w, n) => {
          counter += 1000;
          setComps(c); setWires(w); setNote(n); setSelected(null);
        }} />
      </div>

      <div className="stage">
        <svg ref={svgRef} viewBox={`0 0 ${SVW} ${SVH}`} className="board"
          onPointerDown={() => setSelected(null)}>
          <defs>
            <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#16202b" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={SVW} height={SVH} fill="url(#grid)" />

          {/* wires */}
          {wires.map((w) => {
            const fc = comps.find((c) => c.id === w.from), tc = comps.find((c) => c.id === w.to);
            if (!fc || !tc) return null;
            const a = outPort(fc), b = inPort(tc, w.toPort);
            const on = values[w.from] === 1;
            return (
              <path key={w.id} d={wirePath(a.x, a.y, b.x, b.y)} fill="none"
                stroke={on ? "#22d3ee" : "#33465a"} strokeWidth={on ? 3.5 : 2.5}
                className="wire" onClick={(e) => { e.stopPropagation(); setWires((ws) => ws.filter((x) => x.id !== w.id)); }} />
            );
          })}

          {/* pending wire */}
          {pending && (() => {
            const fc = comps.find((c) => c.id === pending.from); if (!fc) return null;
            const a = outPort(fc);
            return <path d={wirePath(a.x, a.y, pending.x, pending.y)} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 4" />;
          })()}

          {/* components */}
          {comps.map((c) => {
            const { w, h } = dims(c.kind);
            const out = values[c.id] === 1;
            const isIn = c.kind === "IN", isOut = c.kind === "OUT";
            return (
              <g key={c.id} transform={`translate(${c.x},${c.y})`}
                className={"node" + (selected === c.id ? " sel" : "")}
                onPointerDown={(e) => { e.stopPropagation(); startDrag(c.id, e); }}>
                <rect width={w} height={h} rx={isIn || isOut ? 8 : 10}
                  className={isIn ? (c.val ? "c-in on" : "c-in") : isOut ? (out ? "c-out on" : "c-out") : "c-gate"} />
                <text x={w / 2} y={h / 2} className="glabel">
                  {isIn ? (c.label && c.label !== "IN" ? `${c.label}=${c.val}` : c.val) : isOut ? `${c.label || "OUT"}` : c.kind}
                </text>
                {isOut && <text x={w / 2} y={h / 2 + 13} className="obit">{out ? 1 : 0}</text>}

                {/* input ports */}
                {Array.from({ length: numInputs(c.kind) }).map((_, i) => {
                  const p = inPort(c, i);
                  return <circle key={i} cx={p.x - c.x} cy={p.y - c.y} r={6} className="port in-port"
                    onPointerEnter={() => (hoverPort.current = { id: c.id, port: i })}
                    onPointerLeave={() => (hoverPort.current = null)} />;
                })}
                {/* output port */}
                {hasOutput(c.kind) && (() => { const p = outPort(c);
                  return <circle cx={p.x - c.x} cy={p.y - c.y} r={6} className={"port out-port" + (out ? " hot" : "")}
                    onPointerDown={(e) => startWire(c.id, e)} />; })()}
              </g>
            );
          })}
        </svg>

        <aside className="tt">
          <div className="tt-head">TRUTH TABLE</div>
          {note && <div className="tt-note">{note}</div>}
          {table ? (
            <table>
              <thead><tr>
                {table.inLabels.map((l) => <th key={l} className="th-in">{l}</th>)}
                {table.outLabels.map((l) => <th key={l} className="th-out">{l}</th>)}
              </tr></thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.in.map((b, j) => <td key={j} className={b ? "one" : "zero"}>{b}</td>)}
                    {r.out.map((b, j) => <td key={j} className={"o " + (b ? "one" : "zero")}>{b}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="tt-empty">Add at least one Input and one Output (max 5 inputs) to generate a truth table.</p>
          )}
        </aside>
      </div>

      <p className="hint">
        <b>Click an input</b> to toggle 0/1 · <b>drag</b> a gate from an output port ● to an input port to wire ·
        <b> click a wire</b> to delete it · select a gate and press <b>Delete</b>. Load <b>SR Latch</b> to see feedback
        settle — cyan wires are logic <b>1</b>, grey are <b>0</b>.
      </p>
      <footer>Iterative relaxation solver (40 passes) — evaluates combinational logic instantly and converges feedback loops. No libraries.</footer>
    </div>
  );
}
