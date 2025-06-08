# XStreet

Demo Video: https://youtu.be/38i6kI6a-jA

---

## Overview

XStreet offers a transparent, escrow-backed marketplace to help global buyers and sellers build trust and trade fairly using the XRP Ledger.

It solves key problems faced by new marketplaces:

- Pricing dishonesty — Real-time demand/supply data visible to all.
- Slow traction — Trust and transparency accelerate user growth.
- Buyer risk — Native escrows protect buyers from fraud.

---

## How It Works

XStreet leverages core XRPL features to enable:

- On-ledger demand/supply transparency for real-time, verifiable pricing.
- Cross-currency transactions using XRPL’s built-in currency transfers and DEX.
- Smart escrows using `EscrowCreate` and `EscrowFinish` to lock buyer funds until product delivery is confirmed.

---

## Tech Stack

| Layer        | Tech                            |
|--------------|----------------------------------|
| Backend      | Flask (Python)                  |
| XRPL API     | `xrpl-py`, JSON-RPC             |
| Wallets      | Testnet via `generate_faucet_wallet` |
| Payments     | `ripple_path_find`, Escrow TXs  |
| Frontend     | HTML / JS or your choice        |
| Storage (opt)| Supabase                        |
| Dev Runtime  | Bun (for JS/TS development)     |

---

## Getting Started

### Setup

```bash
bun install
bun run dev
```

For the Python backend:

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

## XRPL Features Used

- `ripple_path_find` – For optimal cross-currency routing.
- `EscrowCreate` & `EscrowFinish` – Secures buyer funds until delivery.
- Native DEX – Enables on-ledger, trustless currency swaps.
- `generate_faucet_wallet` – Testnet wallet creation.

---

## Contributing

We welcome contributors! Fork the repo, create a new branch, and open a PR.

---

## License

MIT License
