# Logic Circuit Simulator

A drag-and-wire **digital logic sandbox**. Place gates, wire them together, toggle inputs, and watch signals
propagate live — with an auto-generated **truth table**. Handles both combinational and sequential circuits.

Part of the [LabBench](https://labbench-hub.vercel.app/) suite of interactive engineering tools.

**Live demo:** https://logic-circuit-sim.vercel.app/

## Features
- Drag-and-drop gates: AND / OR / NOT / NAND / NOR / XOR / XNOR + Inputs / Outputs
- Wire port-to-port, toggle inputs, live signal colouring (cyan = logic 1)
- **Iterative relaxation solver** (40 passes) — evaluates combinational logic instantly *and converges
  feedback loops*, so latches and flip-flops actually work
- Auto-generated truth table over all inputs
- One-click examples: Half Adder, Full Adder, SR Latch, 2:1 MUX

## LabBench Pro
Sign in (Supabase auth) to save and reload circuits — gated behind an optional ₹29/mo subscription
(Razorpay Subscriptions). This is the tool that hosts the actual checkout for the whole LabBench suite;
the other 4 tools link back here to upgrade, since one subscription unlocks Pro features everywhere.

## Tech
React + TypeScript + Vite. SVG editor and logic engine written from scratch — no libraries.
Auth/save-load via Supabase (Postgres + RLS); payments via Razorpay Subscriptions (Vercel serverless
functions verify the webhook signature and the caller's session server-side).

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — ECE portfolio._
