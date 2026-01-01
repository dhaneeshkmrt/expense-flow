# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpenseFlow is a Next.js 15 expense tracking application with a virtual banking system built on Firebase. The app uses a multi-tenant architecture where each tenant (household/organization) can track expenses across categories with budgeting, month-end processing, and virtual account management.

## Development Commands

```bash
# Development server (runs on port 9002 with Turbopack)
npm run dev

# AI/Genkit development server
npm run genkit:dev

# AI/Genkit with file watching
npm run genkit:watch

# Type checking
npm run typecheck

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Architecture Overview

### Core Application Flow

The application uses a centralized state management pattern via React Context (`AppProvider` in `src/lib/provider.tsx`). All major operations flow through this provider, which orchestrates multiple custom hooks:

- **useAuth** - Firebase authentication with Google Sign-In and email/token auth
- **useTenants** - Multi-tenant management (users can belong to multiple households)
- **useCategories** - Category, subcategory, and microcategory management with monthly budgets
- **useTransactions** - Transaction CRUD with automatic overspend detection
- **useSettings** - User preferences (currency, locale, date input style)
- **useAccounts** - Virtual banking system with month-end processing

### Multi-Tenant Architecture

The app implements tenant isolation at the Firestore level:
- Each document is scoped by `tenantId`
- Users can switch between tenants via `selectedTenantId`
- Root users (admin) have access to all tenants
- Regular users only see their assigned tenant's data

### Virtual Banking System

A sophisticated feature that automatically manages budget surpluses and overspending:

1. **Month-End Processing**: When a month is processed, budget surpluses (Budget - Spent) are automatically transferred to virtual accounts for each category
2. **Overspend Detection**: When a transaction causes a category to exceed its budget, the system automatically withdraws from that category's virtual account
3. **Month Locking**: Processed months are locked to prevent retroactive changes
4. **Transaction Logging**: All virtual account activity is logged in `accountTransactions` collection

Key Functions:
- `processMonthEnd()` - Calculates surpluses, creates virtual accounts, locks month
- `handleOverspendWithdrawal()` - Auto-withdraws from virtual accounts when overspending
- `isMonthLocked()` - Checks if a month is locked before transaction operations

### Data Model

**Collections in Firestore:**
- `categories` - Category hierarchy (category → subcategory → microcategory) with monthly budgets
- `transactions` - Expense transactions with category mapping
- `settings` - Per-tenant settings (currency, locale)
- `tenants` - Tenant/household information with members
- `virtualAccounts` - Virtual bank accounts per category
- `accountTransactions` - Transaction history for virtual accounts
- `monthLocks` - Locked months to prevent modification
- `balanceSheets` - Monthly balance sheet snapshots

**Important Type Definitions** (see `src/lib/types.ts`):
- Categories have a hierarchical structure with budgets stored per month
- Transactions reference categories by name (not ID) for historical stability
- Virtual accounts track `currentBalance` and are linked to categories
- Month locks use format: `{tenantId}_{year}-{month}`

### Month/Year Selection Pattern

The app uses a global month/year selector that filters data across all views:
- State managed in `AppProvider`: `selectedYear`, `selectedMonth`
- Transactions are filtered by `filteredTransactions` computed value
- Category budgets are loaded dynamically based on selected month
- Balance sheets are keyed by month/year for snapshots

### Category Budget System

Budgets are stored per month in a nested structure:
```typescript
{
  budgets: {
    "2024-12": {
      "categoryId1": 1000,
      "categoryId2": 500
    }
  }
}
```

The `Category` type has a `budget` property that represents the budget for the currently selected month, populated dynamically by `useCategories`.

### Transaction Lock Enforcement

All transaction operations (add, edit, delete) are wrapped with lock checking:
- `addTransactionWithLockCheck()` - Prevents adding to locked months
- `editTransactionWithLockCheck()` - Prevents editing in locked months
- `deleteTransactionWithLockCheck()` - Prevents deletion from locked months

These wrappers also trigger automatic overspend detection/withdrawal.

### AI Integration

The app uses Google's Genkit AI framework:
- Configuration: `src/ai/genkit.ts` uses `gemini-2.0-flash` model
- Flows: `src/ai/flows/` contains AI-powered features
  - `categorize-transaction.ts` - Auto-categorize transactions
  - `generate-image-flow.ts` - AI image generation studio

To develop AI features:
```bash
npm run genkit:watch  # Starts Genkit dev UI with hot reload
```

## Key Implementation Patterns

### Adding a New Page

1. Create route under `src/app/(app)/your-route/page.tsx`
2. The `(app)` group layout handles authentication automatically
3. Use `useApp()` hook to access all application state
4. Add navigation link in `src/components/app-shell-nav.tsx`

### Working with Transactions

Always use the context methods, not the hook directly:
```typescript
const { addTransaction, editTransaction, deleteTransaction } = useApp();
```
These are wrapped with month-lock checking and overspend detection.

### Category Transfer Pattern

For transferring budget between categories, use:
```typescript
const { handleCategoryTransfer } = useApp();
await handleCategoryTransfer({
  sourceCategoryId,
  destinationCategoryId,
  amount,
  notes
});
```
This creates two transactions: a debit from source and credit to destination.

### Date Handling

- Use `date-fns` for all date operations
- Dates are stored as ISO strings (`yyyy-MM-dd`)
- Month indexing is 0-based (January = 0)
- Always use `parseISO()` when working with stored dates

### Firestore Patterns

- Real-time listeners are set up in custom hooks
- Use `onSnapshot()` for live updates
- Document IDs often use composite keys: `{tenantId}_{identifier}`
- Always scope queries by `tenantId`

## UI Components

Built with shadcn/ui and Radix UI:
- Components in `src/components/ui/` are auto-generated from shadcn
- Custom components organized by feature in `src/components/`
- Uses Tailwind CSS with custom theme configuration
- Charts use Recharts library

## Environment Setup

Required environment variables (in `.env`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_GENAI_API_KEY=  # For AI features
```

## PWA Support

The app is configured as a Progressive Web App using `@ducanh2912/next-pwa`:
- Manifest at `public/manifest.json`
- Service worker auto-generated during build
- Works offline with cached data

## Important Notes

- **Category Transfer Subcategory**: The system requires an "Emergency" category and uses "Category Transfer" as a subcategory for inter-category transfers
- **Transaction Amount Sign**: Positive amounts are expenses, negative amounts are credits/income
- **Month Lock Workflow**: Once a month is processed, it cannot be modified without unlocking (admin operation)
- **Overspend Behavior**: The system attempts automatic withdrawal but won't fail the transaction if insufficient virtual account balance exists
