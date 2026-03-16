# 💎 Beils Dashboard - Project Context & Guidelines

This file serves as the primary instructional context for Gemini CLI when working on the Beils Dashboard project. It synthesizes the project's architecture, technology stack, development standards, and operational procedures.

## 🚀 Project Overview

Beils Dashboard (Belleza Honesta) is a comprehensive Full-Stack administration panel designed to manage a beauty salon's operations, including sales, bookings, users, and billing with Veri*Factu integration.

- **Frontend:** Nuxt 4 (Vue 3, Composition API), Pinia (Global State), TanStack Vue Query (Server State).
- **Backend:** Nuxt Server Engine (H3), Prisma ORM.
- **Database:** MariaDB / MySQL.
- **Styling:** TailwindCSS 4 + DaisyUI (Trend UI 2026 aesthetics with Glassmorphism).
- **Core Features:** CRM, Catalog Management, Services & Packs, Marketing (Coupons, Bonuses), Point of Sale (TPV) with Veri*Factu, and a centralized Agenda.

## 🏛️ Architecture & Principles

The project follows **Clean Architecture** principles to ensure business logic remains independent of the UI:

1.  **Domain:** Interfaces and Zod schemas in `types/` or `schemas/`.
2.  **Application:** Global state and logic in **Pinia Stores** and **Composables**.
3.  **Infrastructure:** Data repositories, Prisma configuration, and API services.
4.  **Presentation:** Vue components, Pages, and Layouts.

### Core Principles
- **SOLID:** Adhere to Single Responsibility; split complex components.
- **KISS:** Prioritize simplicity.
- **DRY:** Abstract repetitive logic into Composables or Utilities.
- **Repository Pattern:** Used for API interactions.

## 🛠️ Building & Running

### Key Commands
- `pnpm install`: Install dependencies.
- `pnpm dev`: Start the local development server at `http://localhost:3000`.
- `pnpm build`: Compile the project for production.
- `pnpm preview`: Locally preview the production build.
- `pnpm seed`: Populate the database with initial test data.

### Database Management (Prisma)
- `pnpm prisma:generate`: Generate the Prisma Client (mandatory after schema changes).
- `pnpm prisma:pull`: Extract structure from an existing database.
- `pnpm prisma:migrate`: Apply database migrations.

## 🎨 Development Conventions

### State & Data Fetching
- **TanStack Vue Query:** Mandatory for all asynchronous data fetching. Use `useMutation` for POST/PUT/DELETE actions and invalidate related queries upon success.
- **Pinia:** Reserved for truly global state (Auth, Theme, Persistent Notifications). Use **Composition API syntax**.
- **Validation:** Every user input **must** be validated with **Zod** before server submission.

### UI & Styling
- **Vercel Style Guidelines:** Follow the specific palette and typography (Roboto/Roboto Condensed) defined in the project.
- **DaisyUI:** Use DaisyUI components + TailwindCSS utility classes.
- **Accessibility (A11y):**
    - Prioritize semantic HTML (`<button>`, `<a>`, `<table>`).
    - Icon-only buttons must have `aria-label`.
    - Never use `outline-none` without a clear `focus-visible` replacement.
    - Use `aria-live="polite"` for asynchronous updates (toasts).
- **Performance:** Use `tabular-nums` for prices/dates and implement virtualization for lists >50 items.

### Component Structure
Vue files should be declarative and follow this order:
```vue
<script setup lang="ts">
// Imports, Props, Emits, Logic (Composables/Stores)
</script>

<template>
  <!-- Declarative HTML -->
</template>

<style scoped>
/* Specific scoped styles if necessary (Prefer Tailwind) */
</style>
```

## 🧪 Testing Strategy
- **Vitest:** Primary testing framework.
- **Unit Tests:** For utilities and pure logic in `utils/`.
- **Composable/Store Tests:** Verify business logic in Pinia and custom composables.
- **Component Tests:** Verify UI reactivity to state changes.

## 🚫 Anti-patterns & Critical Rules
- **SSR ECharts Crash:** **PROHIBITED** to use `echarts` without ensuring `['echarts', 'vue-echarts', 'zrender']` are in `build.transpile` in `nuxt.config.ts`.
- **Transitions:** Avoid `transition: all`. Explicitly list properties (e.g., `transition-opacity`).
- **Navigation:** Use `NuxtLink` or `button`, never `div @click` for navigation.
- **Hardcoding:** Never hardcode dates or currencies; use `Intl.*` formatters.
- **Imports:** Do not manually import Vue/Nuxt core functions (e.g., `ref`, `computed`) as they are auto-imported.
- **Be Careful:** Element is missing end tag
- **Seed Update Requirement:** Before finishing any assigned task(s), the `seeds/seed-db.ts` file **must** be updated to reflect any new data structures or to include relevant test data for the implemented features.


## Documentation
- Update the documentation when you make changes to the project + README.md.
- **Project Documentation:** [Beils Dashboard Documentation](https://roberthernandezarenas-beils-belleza-honesta-dashboard.mintlify.app/)

"Clean code is the first step toward honest service." 🌿
