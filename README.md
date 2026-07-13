# Logic Circuit Simulator

A drag-and-wire **digital logic sandbox**. Place gates, wire them together, toggle inputs, and watch signals
propagate live — with an auto-generated **truth table**. Handles both combinational and sequential circuits.

**Live demo:** _add your Vercel URL here_

## Features
- Drag-and-drop gates: AND / OR / NOT / NAND / NOR / XOR / XNOR + Inputs / Outputs
- Wire port-to-port, toggle inputs, live signal colouring (cyan = logic 1)
- **Iterative relaxation solver** (40 passes) — evaluates combinational logic instantly *and converges
  feedback loops*, so latches and flip-flops actually work
- Auto-generated truth table over all inputs
- One-click examples: Half Adder, Full Adder, SR Latch, 2:1 MUX

## Tech
React + TypeScript + Vite. SVG editor and logic engine written from scratch — no libraries.

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — ECE portfolio._
