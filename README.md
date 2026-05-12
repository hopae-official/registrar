# EUDI Wallet Relying Party Registrar

Open-source registrar for **Wallet-Relying Parties (WRPs)** under the [EU Digital Identity Wallet](https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET) framework. Designed for Member States to deploy, customize, and integrate into their national infrastructure.

## Architecture

```
  ┌──────────────┐         ┌──────────────────────────────────────────┐           ┌───────────────┐
  │              │  verify │              WRP Registrar               │  register │               │
  │  EUDI Wallet │  certs  │                                          │  & manage │ Relying Party │
  │   Instance   ├────────►│  ┌──────────────────────────────────┐    │◄──────────┤               │
  │              │         │  │        Registrar Backend*        │    │  Portal   │               │
  │              │         │  │          (this project)          │    │           │               │
  └──────────────┘         │  │                                  │    │           │               │
         │                 │  │  • WRP Registration & Management │    │           └───────────────┘
         │  check          │  │  • WRPAC (X.509 Access Certs)    │    │
         │  intended       │  │  • WRPRC (JWT Reg. Certs)        │    │           ┌───────────────┐
         │  use            │  │  • Intermediary Management       │    │  register │               │
         └────────────────►│  │  • JWS-signed Public Responses   │    │◄──────────┤ Intermediary  │
                           │  │                                  │    │  Portal   │               │
                           │  └──────────────┬───────────────────┘    │  or API   │  (manages     │
                           │                 │                        │           │  mediated RPs)│
                           │                 ▼                        │           └───────────────┘
                           │  ┌───────────────────────────────────┐   │
                           │  │    National Trust Infrastructure  │   │
                           │  │    (CA, CRL, Database, IdP)       │   │
                           │  └───────────────────────────────────┘   │
                           │           Member State Infra             │
                           └──────────────────────────────────────────┘
```

> **Note:** The included frontend (`registrar-fe`) is a **demo portal** for testing. In production, Member States would build or integrate their own portal/admin UI.

## What This Project Does

This registrar implements the **RP registration and certificate management** requirements defined in:

- **EU ARF (Architecture and Reference Framework)** — Section 3.17, 6.6.3, 6.6.5
- **ETSI TS 119 475** — WRPAC/WRPRC profiles and policy requirements
- **CIR 2025/848** — Implementing regulation for WRP certificates

### Core Capabilities

| Capability                    | Description                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **WRP Registration**          | Relying Parties register their organization, intended use, and requested credentials                              |
| **WRPAC Issuance**            | X.509 access certificates (EC P-256, ES256) for Wallet-RP authentication                                          |
| **WRPRC Issuance**            | JWT-based registration certificates (`rc-wrp+jwt`) for transparency and user consent                              |
| **Intermediary Support**      | Full intermediary lifecycle — register intermediary, register mediated RPs, issue WRPRC with intermediary binding |
| **Public Registry**           | JWS-signed public API for Wallet instances to verify RP registrations and intermediary relationships              |
| **Intended Use Verification** | API for Wallets to check whether a specific credential request matches a registered intended use                  |

### API Categories

| #   | Tag                      | Purpose                                           |
| --- | ------------------------ | ------------------------------------------------- |
| 1   | Public Registry          | Open read-only endpoints (JWS-signed)             |
| 2   | WRP Portal               | Authenticated WRP self-management                 |
| 3   | Intermediary Portal      | Authenticated intermediary management (portal UI) |
| 4   | Intermediary Integration | Programmatic API for intermediary systems         |

## Integration Points

This project is designed to be **pluggable** into a Member State's existing infrastructure:

```
┌─────────────────────────────────────────────────────┐
│                  Integration Points                  │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  ► Database          │  Replace in-memory store     │
│    (PostgreSQL, etc) │  with national DB            │
│                      │                              │
│  ► CA Infrastructure │  Swap built-in OpenSSL CA    │
│    (HSM, eIDAS CA)   │  with national PKI           │
│                      │                              │
│  ► Identity Provider │  Replace JWT auth with       │
│    (eIDAS, OIDC)     │  national IdP (eIDAS node)   │
│                      │                              │
│  ► Federation API    │  Cross-border RP discovery   │
│    (other Registrars)│  via federated registry      │
│                      │                              │
│  ► Notification      │  Webhook/event system for    │
│    (email, webhook)  │  registration status updates │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### Designed for Replacement

| Component        | Current (Demo)     | Production Replacement           |
| ---------------- | ------------------ | -------------------------------- |
| Database         | In-memory          | PostgreSQL, Oracle, etc.         |
| CA               | Built-in OpenSSL   | National CA / HSM                |
| Auth             | Simple JWT (HS256) | eIDAS node, OIDC Provider        |
| User Management  | In-memory          | LDAP, Active Directory           |
| CRL Distribution | Local file         | National CRL/OCSP infrastructure |

## Quick Start

```bash
# Backend
cd registrar-be
pnpm install && pnpm run start:dev
# → http://localhost:18000/registrar/api (Swagger UI)

# Frontend
cd registrar-fe
pnpm install && pnpm run dev
# → http://localhost:5173
```

## Project Structure

```
registrar/
├── registrar-be/          # NestJS backend
│   └── src/
│       └── modules/
│           ├── relying_party/    # WRP CRUD, Intermediary service
│           │   └── controllers/  # 4 API category controllers
│           ├── access_cert/      # X.509 WRPAC service
│           ├── registration_cert/# JWT WRPRC service
│           ├── crypto/           # OpenSSL + JWT signing
│           └── auth/             # JWT authentication
└── registrar-fe/          # React (Vite) frontend
    └── src/
        ├── pages/               # WRP portal pages
        │   └── intermediary/    # Intermediary portal pages
        ├── api/                 # API client
        └── presets/             # Demo data
```

## Specifications

- [EU Architecture and Reference Framework (ARF)](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework)
- [ETSI TS 119 475](https://www.etsi.org/deliver/etsi_ts/119400_119499/119475/) — Relying Party Attributes
- [CIR 2025/848](https://eur-lex.europa.eu/) — Implementing Regulation for WRP Certificates

## License

Apache 2.0
