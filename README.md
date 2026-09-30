# Trajectory

> Objective Deep-Work Telemetry & Protocol Discipline Engine  
> Next.js 15 PWA • Supabase PostgreSQL • Asymmetric Envelope Cryptography

Trajectory is a single-user, mobile-first Progressive Web Application (PWA) built to log deep-work flow states, digital rabbit holes, and protocol discipline using an objective telemetry engine.

---

## 1. Operational Directives & Innocence Framing

All schema definitions, application labels, and export formats strictly employ neutral productivity and software engineering terminology. An external reviewer or repository visitor perceives the tool solely as a digital distraction and screen-time hygiene tracker.

- **Implicit Baseline Logging**: Days with zero logged events implicitly default to **Level 0 (Pure Focus)**. Uninterrupted focus requires zero manual logging.
- **Dual-Password Isolation Model**:
  - **Password 1 (App Access)**: Sets an HTTP-only, 30-day authenticated session cookie. Grants frictionless dashboard access and opens the rapid intake modal.
  - **Password 2 (Vault Password)**: Derives an AES-GCM master key in ephemeral memory via PBKDF2 (100k iterations SHA-256) to unwrap the RSA private key when performing coaching exports. Never stored on disk or server.
- **Zero-Friction Asymmetric Intake**: Incidents are encrypted client-side using an RSA-OAEP public key. Logging is instantaneous—Password 2 is never requested during incident intake.
- **Absolute Dashboard Privacy**: Narrative reflections (`pathway`, `context`, `impact`) are write-only. They are never rendered on the dashboard or day-inspection sheets and can only be accessed via the Password 2 export workflow.

---

## 2. Telemetry, Scoring & Reset Engine

| Tier Badge | Operational State | System Definition | Base Pts | Trickle Reset Impact |
| :--- | :--- | :--- | :--- | :--- |
| **⬜ L0** | **Pure Focus** | Baseline deep work; uninterrupted workflow, zero unapproved drift. | 0 pts | None (Implicit daily baseline) |
| **🟨 L1** | **Peripheral Drift** | Passive browsing, feed checks, brief video previews, curiosity clicks. | 1 pt | Resets L1 |
| **🟧 L2** | **Soft Divergence** | Secondary entertainment media, long-form reading, extended loops. | 3 pts | Resets L2 & L1 |
| **🟥 L3** | **Direct Compromise** | High-friction distraction sites, unapproved apps, workflow break. | 10 pts | Resets L3, L2, & L1 |
| **🟪 L4** | **Deep Pipeline Drift** | Compulsive loops, non-standard browsing, total task abandonment. | 50 pts | Resets L4, L3, L2, & L1 |
| **⬛ L5** | **System Reset** | Catastrophic protocol breakdown; multi-hour executive burnout. | 1000 pts | Resets all tier streaks to 0 |

### Scoring & Modifiers
- **Surge Status**: `surge_occurred = !defense_occurred`. Surges carry no point weight. If no defense occurred, an impulsive surge is recorded by default.
- **Defense Deductions**: Binary (max 1 defense per incident):
  - **Level 1**: Reduces points by 1 pt (Net: **0 pts**).
  - **Levels 2–5**: Reduces points by 2 pts (e.g. L2 Net: **1 pt**, L3 Net: **8 pts**).
- **Full-History Streaks**: Tracks continuous days since the most recent incident with `tier_level >= TargetTier`.

---

## 3. Temporal Architecture: Awake-Cycle Attribution

To support late-night schedules without polluting the new calendar day, PulseFlow decouples astronomical timestamps from biological waking cycles:

- **Late-Night Window (12:00 AM – 5:59:59 AM)**: Automatically pre-selects **Yesterday** as the `logical_date`.
- **UI Quick-Select**: Single tap for `[ Today ]`, `[ Yesterday ]`, or custom date picker.
- **Field Segregation**:
  - `logical_date` (`DATE`): Governs streak calculations, weekly rollups, and the 52-week heatmap grid.
  - `start_time` & `end_time` (`TIMESTAMPTZ`): Preserves exact UTC timestamps for diurnal vulnerability plots and duration analysis.
  - `created_at` (`TIMESTAMPTZ`): Chronological sequencing in the telemetry ledger.

---

## 4. Cryptographic Pipeline (Asymmetric Envelope)

```
INTAKE FLOW (Zero-Password Friction):
1. User logs incident while authenticated via Password 1.
2. Web Crypto generates an ephemeral 256-bit AES-GCM Data Encryption Key (DEK).
3. DEK encrypts narrative fields: { pathway, context, impact } -> ciphertext.
4. Client fetches cached RSA-OAEP Public Key from vault_config.
5. Public Key wraps (encrypts) the ephemeral DEK.
6. Stored in Supabase: base64(wrapped_dek) + ":" + base64(iv) + ":" + base64(ciphertext).
* The browser immediately drops the DEK from memory. Data is write-only.

EXPORT FLOW (Requires Password 2):
1. User enters Password 2 in the Coaching Export Modal.
2. Web Crypto derives an AES key via PBKDF2 (100,000 iterations SHA-256 + salt).
3. AES key unwraps the encrypted RSA Private Key stored in vault_config.
4. Incidents within target timeframe are fetched; private key unwraps each record's DEK.
5. DEKs decrypt narrative JSON payloads directly in RAM.
6. Narrative JSON is encoded into Base64 (human-obfuscated) and formatted into the coaching payload.
```

---

## 5. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- Supabase Project with `incidents` and `vault_config` tables

### Environment Variables (`.env.local`)
```env
# Supabase 2026 API Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Password 1 Authentication & 30-Day Cookie
APP_ACCESS_PASSWORD_HASH=c45fc9f28c8b58f1f996c9c972aa551a78152ab34a293a2feb18821e9e57b3b8
SESSION_SECRET=your_32_byte_hex_string
```

### Installation & Run
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to authenticate and log telemetry.
