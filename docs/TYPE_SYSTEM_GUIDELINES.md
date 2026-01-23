# Type System Guidelines

**Purpose:** Prevent duplicate type definitions and naming inconsistencies across the codebase.

**Last Updated:** January 23, 2026 - Type consolidation complete (0 TypeScript errors)

---

## The Single Source of Truth Principle

**ALL domain types MUST be defined in `libs/shared/src/lib/types.ts`**

This includes:
- User/Profile types
- Workout/Exercise types
- Nutrition types
- CRM/Lead types
- Email/Marketing types
- Any type that crosses service boundaries

---

## Before Creating ANY New Type

### ✅ REQUIRED Checklist:

1. **Search `libs/shared/src/lib/types.ts`** - Does this type already exist?
2. **Search existing services** - Is there a local duplicate you should remove?
3. **Check the database schema** - Match column names exactly
4. **Check naming conventions below** - Follow established patterns

### ❌ NEVER Do This:

```typescript
// ❌ WRONG - Duplicate type in service
export interface EmailTemplate {
  body: string;
  times_used: number;
}

// ❌ WRONG - Different name for same concept
interface UserProfile { ... }  // When Profile already exists

// ❌ WRONG - Arbitrary property names
interface Lead {
  contactPreference: string;  // DB has preferred_contact_method
}
```

### ✅ ALWAYS Do This:

```typescript
// ✅ CORRECT - Import from shared
import type { EmailTemplate, Lead, Profile } from '@fitos/shared';

// ✅ CORRECT - Match database column names
interface Lead {
  preferred_contact_method: ContactMethod;  // Matches DB exactly
}

// ✅ CORRECT - Add to shared if missing
// 1. First add to libs/shared/src/lib/types.ts
// 2. Then import in your service
```

---

## Naming Conventions

### Property Naming Rules:

1. **Match Database Columns Exactly**
   ```typescript
   // Database column: body_html
   body_html: string;  // ✅ Correct
   body: string;       // ❌ Wrong

   // Database column: usage_count
   usage_count: number;  // ✅ Correct
   times_used: number;   // ❌ Wrong
   ```

2. **Use Snake_Case for Database Fields**
   ```typescript
   // ✅ Correct - matches Supabase/PostgreSQL convention
   first_name: string;
   last_contacted_at?: string;
   email_template_id: string;

   // ❌ Wrong - camelCase doesn't match DB
   firstName: string;
   lastContactedAt?: string;
   emailTemplateId: string;
   ```

3. **Suffix Patterns**
   - Counts: `*_count` (e.g., `usage_count`, `open_count`)
   - Foreign Keys: `*_id` (e.g., `trainer_id`, `email_template_id`)
   - Timestamps: `*_at` (e.g., `created_at`, `sent_at`)
   - Booleans: `is_*` or `has_*` (e.g., `is_active`, `has_completed`)

### Method Naming (Services):

**Computed Signals (Getters):**
```typescript
// ✅ Correct - noun, returns computed value
readonly user = computed(() => ...);
readonly profile = computed(() => ...);
readonly isAuthenticated = computed(() => ...);

// ❌ Wrong - don't use "get" prefix for signals
readonly currentUser = computed(() => ...);
readonly getProfile = computed(() => ...);
```

**Async Methods:**
```typescript
// ✅ Correct - verb, clearly async
async getTemplates(): Promise<EmailTemplate[]>
async createLead(input: CreateLeadInput): Promise<Lead>
async updateProfile(id: string, data: UpdateProfileInput): Promise<Profile>

// ❌ Wrong - ambiguous or inconsistent
async fetchTemplates()  // Use "get" not "fetch"
async newLead()         // Use "create" not "new"
async saveProfile()     // Use "update" not "save"
```

### Type Naming:

```typescript
// ✅ Correct patterns
export interface Lead { ... }              // Entity
export interface CreateLeadInput { ... }   // Creation DTO
export interface UpdateLeadInput { ... }   // Update DTO
export type LeadStatus = 'new' | 'contacted' | ...;  // Enum/Union
export interface LeadWithExtras extends Lead { ... }  // Computed variant

// ❌ Wrong patterns
export interface LeadData { ... }          // Don't add "Data" suffix
export interface LeadDTO { ... }           // Don't use "DTO"
export interface LeadModel { ... }         // Don't use "Model"
```

---

## Type Organization Hierarchy

### Layer 1: Shared Types (`@fitos/shared`)
**Who uses it:** All services, all components
**What goes here:** Domain entities, DTOs, enums

```typescript
// libs/shared/src/lib/types.ts
export interface Lead {
  id: string;
  first_name: string;
  email: string;
  // ... matches database exactly
}

export interface CreateLeadInput {
  first_name: string;
  email: string;
  // ... only required fields for creation
}
```

### Layer 2: Service Layer (`apps/mobile/src/app/core/services/`)
**Who uses it:** Services (internal use only)
**What goes here:** ONLY service-specific helpers

```typescript
// lead.service.ts
import type { Lead, CreateLeadInput } from '@fitos/shared';  // ✅ Import domain types

// ✅ OK - Service-specific helper (not exported, internal use only)
interface LeadQueryBuilder {
  filters: Record<string, any>;
  sort: string;
}

// ❌ WRONG - This belongs in @fitos/shared
interface Lead {
  id: string;
  // ...
}
```

### Layer 3: Components
**Who uses it:** Component templates and logic
**What goes here:** NOTHING - only import from layers 1 & 2

```typescript
// ✅ Correct - Import from shared
import type { Lead, CreateLeadInput } from '@fitos/shared';
import { LeadService } from '@app/core/services/lead.service';

// ❌ WRONG - Never define types in components
interface Lead {
  // ...
}
```

---

## Service Property Access Patterns

### Check the Service First!

Before accessing a service property, **always check the service definition**.

**Example: AuthService**
```typescript
// 1. FIRST: Check auth.service.ts to see what's available
export class AuthService {
  readonly user = computed(() => this._state().user);
  readonly profile = computed(() => this._state().profile);
  readonly isAuthenticated = computed(() => !!this._state().user);
}

// 2. THEN: Use the correct property names in your component
const user = this.authService.user();        // ✅ Correct
const profile = this.authService.profile();  // ✅ Correct

// ❌ WRONG - Making up property names
const user = this.authService.currentUser();   // Doesn't exist!
const profile = await this.authService.getProfile(id);  // Doesn't exist!
```

### Required Pattern for New Components:

```typescript
/**
 * STEP 1: Check service definition
 * Open the service file and see what's exported
 */

/**
 * STEP 2: Import types from @fitos/shared
 */
import type { Lead } from '@fitos/shared';

/**
 * STEP 3: Inject service
 */
private leadService = inject(LeadService);

/**
 * STEP 4: Use service properties AS DEFINED
 * Don't rename, don't create aliases
 */
const leads = this.leadService.leads();  // Use exact property name
```

---

## Common Violations and Fixes

### Violation 1: Duplicate Type Definitions

**Problem:**
```typescript
// email-template.service.ts
export interface EmailTemplate {  // ❌ Local duplicate
  body: string;
}

// Component tries to use
import { EmailTemplate } from '@fitos/shared';  // ❌ Conflict!
```

**Fix:**
```typescript
// email-template.service.ts
import type { EmailTemplate } from '@fitos/shared';  // ✅ Use shared

// No local interface definition needed
```

### Violation 2: Property Name Mismatch

**Problem:**
```typescript
// Component expects:
this.authService.currentUser()  // ❌ Doesn't exist

// Service actually has:
readonly user = computed(() => ...);
```

**Fix:**
```typescript
// 1. Check service definition FIRST
// 2. Use exact property name
this.authService.user()  // ✅ Correct
```

### Violation 3: Database Field Name Mismatch

**Problem:**
```typescript
// Database column: preferred_contact_method
interface Lead {
  contactPreference: string;  // ❌ Wrong name
}
```

**Fix:**
```typescript
// Match database exactly
interface Lead {
  preferred_contact_method: ContactMethod;  // ✅ Correct
}
```

### Violation 4: Creating Types in Components

**Problem:**
```typescript
// some.component.ts
interface UserProfile {  // ❌ Wrong location
  name: string;
}
```

**Fix:**
```typescript
// 1. Add to libs/shared/src/lib/types.ts
export interface Profile {
  fullName: string;
}

// 2. Import in component
import type { Profile } from '@fitos/shared';
```

---

## Type Addition Workflow

When you need a new type:

### Step 1: Check if it exists
```bash
# Search shared types
grep -r "interface EmailTemplate" libs/shared/

# Search all services
grep -r "interface EmailTemplate" apps/mobile/src/app/core/services/
```

### Step 2: If it doesn't exist, add to shared
```typescript
// libs/shared/src/lib/types.ts

// Add to appropriate section with comment
// ============================================================================
// Email Marketing Types
// ============================================================================

export interface EmailTemplate {
  id: string;
  trainer_id: string;
  body_html: string;  // Match DB column name
  usage_count?: number;  // Match DB column name
  // ...
}
```

### Step 3: Import in service
```typescript
// apps/mobile/src/app/core/services/email-template.service.ts
import type { EmailTemplate } from '@fitos/shared';

// No local interface needed
```

### Step 4: Import in components
```typescript
// component.ts
import type { EmailTemplate } from '@fitos/shared';
```

---

## Refactoring Existing Code

If you find duplicate types:

### Step 1: Identify the source of truth
1. Check database schema (migrations)
2. Check `@fitos/shared`
3. Check service definitions

### Step 2: Consolidate to shared
```typescript
// If shared type is missing properties, add them
// libs/shared/src/lib/types.ts
export interface EmailTemplate {
  // Add any missing properties from service layer
  usage_count?: number;
  category?: string;
}
```

### Step 3: Remove duplicates
```typescript
// email-template.service.ts
// ❌ Delete this:
// export interface EmailTemplate { ... }

// ✅ Add this:
import type { EmailTemplate } from '@fitos/shared';
```

### Step 4: Update all imports
```typescript
// Find all files importing the old type
// Replace with shared import
import type { EmailTemplate } from '@fitos/shared';
```

---

## Enforcement

### Code Review Checklist:

- [ ] No duplicate type definitions across files
- [ ] All domain types imported from `@fitos/shared`
- [ ] Property names match database column names
- [ ] Service properties accessed by their actual names
- [ ] No types defined in components
- [ ] Followed naming conventions (snake_case, suffixes)

### Before Committing:

```bash
# Check for duplicate type definitions
grep -r "export interface EmailTemplate" apps/ libs/

# If you see the same interface name in multiple files, that's a violation!
```

---

## Examples

### ✅ Good Example: Lead Management

```typescript
// libs/shared/src/lib/types.ts
export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_contact_method: ContactMethod;
  created_at: string;
}

export interface CreateLeadInput {
  first_name: string;
  last_name: string;
  email: string;
  preferred_contact_method?: ContactMethod;
}

// apps/mobile/src/app/core/services/lead.service.ts
import type { Lead, CreateLeadInput } from '@fitos/shared';

export class LeadService {
  readonly leads = signal<Lead[]>([]);

  async createLead(input: CreateLeadInput): Promise<Lead> {
    // ...
  }
}

// component.ts
import type { Lead, CreateLeadInput } from '@fitos/shared';
import { LeadService } from '@app/core/services/lead.service';

export class LeadComponent {
  private leadService = inject(LeadService);

  leads = this.leadService.leads();  // Use exact service property
}
```

### ❌ Bad Example: What Not to Do

```typescript
// ❌ WRONG - Duplicate in service
// lead.service.ts
export interface Lead {  // Duplicate!
  firstName: string;  // Wrong - DB has first_name
  contactPref: string;  // Wrong - DB has preferred_contact_method
}

// ❌ WRONG - Made up property name
// component.ts
const leads = this.leadService.getLeads();  // Doesn't exist!
// Should be: this.leadService.leads()

// ❌ WRONG - Type defined in component
// component.ts
interface LeadData {  // Wrong location!
  // ...
}
```

---

## Summary

**The Golden Rules:**

1. **One type, one place** - `@fitos/shared` is the source of truth
2. **Check before create** - Search before defining new types
3. **Match the database** - Property names = column names
4. **Check the service** - Use properties as defined, don't invent names
5. **No component types** - Components only import, never define

Following these rules prevents:
- Type conflicts and build errors
- Confusing naming inconsistencies
- Runtime errors from undefined properties
- Maintenance burden from duplicate definitions
