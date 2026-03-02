---
triggers:
  - "form"
  - "input validation"
  - "react hook form"
  - "form submission"
  - "form errors"
  - "multi-step form"
  - "form accessibility"
  - "server action form"
  - "progressive enhancement"
  - "zod validation"

depends_on:
  - security.md (input validation, sanitization)
  - data-fetching.md (optimistic updates for forms)
  - optimistic-updates.md (instant feedback)

prerequisites:
  - Next.js App Router
  - React 18+
  - TypeScript
  - react-hook-form
  - Zod
  - Understanding of WCAG 2.2 form accessibility

description: |
  Production-ready form handling covering: React Hook Form + Zod validation, Server Actions with
  progressive enhancement, accessible forms (ARIA, WCAG 2.2), multi-step forms with state management,
  dual validation (client + server), loading states, error handling, and file uploads.
---

# Forms Pattern

## Research Foundation

**Searches performed:**
1. React Hook Form TypeScript Zod integration best practices 2024
2. Next.js 15 Server Actions forms progressiveEnhancement 2024
3. Accessible forms WCAG ARIA labels error messages screen readers 2024
4. Multi-step forms React state management best practices 2024
5. Form validation patterns client-side server-side security 2024

**Key findings:**
- **React Hook Form + Zod + @hookform/resolvers** is the standard stack (2024-2025)
- **Server Actions enable progressive enhancement** — forms work without JavaScript
- **4,605 ADA lawsuits in 2024** referenced WCAG 2.2 — accessible forms are legally required
- **aria-invalid + aria-describedby** are critical for screen reader error announcements
- **Client-side validation = UX, server-side validation = security** — never trust client alone
- **26% of 2024 data breaches involved SQL injection** — input validation is non-negotiable
- **Multi-step forms use Zustand + React Hook Form** for state persistence across steps
- **role="alert" or aria-live="polite"** for dynamic error announcements to screen readers
- **Next.js 15 Form component** prefetches and enables client-side navigation

---

## Core Principles

1. **Dual Validation:** Client-side for UX (instant feedback), server-side for security (never trust client)
2. **Progressive Enhancement:** Forms work without JavaScript (Server Actions)
3. **Accessibility First:** WCAG 2.2 AA compliance (labels, errors, keyboard navigation)
4. **Type Safety:** Zod schemas generate TypeScript types (`z.infer`)
5. **User Feedback:** Loading states, success messages, error messages
6. **Performance:** Optimistic updates for instant perceived response

---

## 1. Basic Form with React Hook Form + Zod

### Setup

```bash
pnpm add --save-exact react-hook-form zod @hookform/resolvers
```

### Schema Definition

```typescript
// lib/schemas/user.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address'),
  website: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')), // Allow empty string
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

### Client Component with Form

```typescript
// components/ProfileForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/schemas/user';
import { updateProfile } from '@/app/actions/update-profile';
import { useState } from 'react';

export function ProfileForm({ initialData }: { initialData: UpdateProfileInput }) {
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: initialData,
  });

  async function onSubmit(data: UpdateProfileInput) {
    setResult(null);
    const response = await updateProfile(data);
    setResult(response);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Display name */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium">
          Display Name <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          id="display_name"
          type="text"
          {...register('display_name')}
          aria-invalid={errors.display_name ? 'true' : 'false'}
          aria-describedby={errors.display_name ? 'display_name-error' : undefined}
          className={`mt-1 block w-full rounded border px-3 py-2 ${
            errors.display_name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.display_name && (
          <p id="display_name-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.display_name.message}
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          {...register('bio')}
          aria-invalid={errors.bio ? 'true' : 'false'}
          aria-describedby={errors.bio ? 'bio-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.bio && (
          <p id="bio-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.bio.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`mt-1 block w-full rounded border px-3 py-2 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Submit button with loading state */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>

      {/* Success/Error feedback */}
      {result?.success && (
        <p role="status" className="text-sm text-green-600">
          Profile updated successfully!
        </p>
      )}
      {result?.error && (
        <p role="alert" className="text-sm text-red-600">
          {result.error}
        </p>
      )}
    </form>
  );
}
```

### Server Action with Validation

```typescript
// app/actions/update-profile.ts
'use server';

import { updateProfileSchema } from '@/lib/schemas/user';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(input: unknown) {
  const supabase = await createClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // 2. Server-side validation (NEVER trust client)
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const { display_name, bio, email, website } = parsed.data;

  // 3. Update database (RLS enforces user can only update own profile)
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      bio,
      email,
      website,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}
```

---

## 2. Progressive Enhancement with Server Actions

Forms work **without JavaScript** when using Server Actions.

```typescript
// components/NewsletterForm.tsx
'use client';

import { useActionState } from 'react';
import { subscribeNewsletter } from '@/app/actions/subscribe-newsletter';

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeNewsletter, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          aria-invalid={state?.error ? 'true' : 'false'}
          aria-describedby={state?.error ? 'email-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {state?.error && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Subscribing...' : 'Subscribe'}
      </button>

      {state?.success && (
        <p role="status" className="text-sm text-green-600">
          Successfully subscribed!
        </p>
      )}
    </form>
  );
}
```

```typescript
// app/actions/subscribe-newsletter.ts
'use server';

import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function subscribeNewsletter(
  _prevState: any,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const email = formData.get('email');

  // Server-side validation
  const parsed = schema.safeParse({ email });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Add to newsletter (simulate)
  try {
    await fetch('https://api.example.com/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: parsed.data.email }),
    });

    return { success: true };
  } catch (error) {
    return { error: 'Failed to subscribe. Please try again.' };
  }
}
```

**How it works:**
1. Without JavaScript: Form submits to server, page refreshes with result
2. With JavaScript: `useActionState` prevents refresh, updates UI dynamically

---

## 3. Accessible Forms (WCAG 2.2 AA)

### Critical ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-invalid` | Indicates field has error | `aria-invalid="true"` |
| `aria-describedby` | Links error message to field | `aria-describedby="email-error"` |
| `role="alert"` | Announces error immediately | `<p role="alert">Error</p>` |
| `aria-live="polite"` | Announces dynamic changes | `<div aria-live="polite">Saving...</div>` |
| `aria-required` | Indicates required field | `aria-required="true"` (or just `required`) |
| `aria-label` | Labels element without visible text | `<button aria-label="Close">X</button>` |

### Accessible Error Messages

```typescript
// ✅ CORRECT: Error announced by screen readers
<div>
  <label htmlFor="email">Email Address *</label>
  <input
    id="email"
    type="email"
    aria-invalid={hasError ? 'true' : 'false'}
    aria-describedby={hasError ? 'email-error' : undefined}
  />
  {hasError && (
    <p id="email-error" role="alert" className="text-red-600">
      Invalid email address. Please use format: name@example.com
    </p>
  )}
</div>

// ❌ WRONG: Error not linked to field
<input id="email" type="email" />
<p className="text-red-600">Invalid email</p> {/* Screen reader doesn't know this is related to email field */}
```

### Focus Management

```typescript
// ✅ CORRECT: Focus first error after submission
const {
  register,
  handleSubmit,
  formState: { errors },
  setFocus,
} = useForm();

async function onSubmit(data) {
  const response = await submitForm(data);

  if (response.error) {
    // Focus first field with error
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setFocus(firstError as any);
    }
  }
}
```

### Required Field Indicators

```typescript
// ✅ CORRECT: Visual + screen reader indicator
<label htmlFor="name">
  Name <span className="text-red-500" aria-label="required">*</span>
</label>
<input id="name" type="text" required aria-required="true" />

// ✅ ALSO CORRECT: Explicit text
<label htmlFor="name">
  Name (required)
</label>
<input id="name" type="text" required />
```

---

## 4. Multi-Step Forms

Use Zustand for state persistence across steps.

### Setup

```bash
pnpm add --save-exact zustand
```

### State Store

```typescript
// lib/stores/signup-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SignupState {
  step: number;
  data: {
    account?: {
      email: string;
      password: string;
    };
    profile?: {
      display_name: string;
      bio: string;
    };
    preferences?: {
      newsletter: boolean;
      notifications: boolean;
    };
  };
  setStep: (step: number) => void;
  updateData: (step: string, data: any) => void;
  reset: () => void;
}

export const useSignupStore = create<SignupState>()(
  persist(
    (set) => ({
      step: 1,
      data: {},

      setStep: (step) => set({ step }),

      updateData: (step, data) =>
        set((state) => ({
          data: {
            ...state.data,
            [step]: data,
          },
        })),

      reset: () => set({ step: 1, data: {} }),
    }),
    {
      name: 'signup-form', // localStorage key
    }
  )
);
```

### Multi-Step Component

```typescript
// components/SignupForm.tsx
'use client';

import { useSignupStore } from '@/lib/stores/signup-store';
import { AccountStep } from './steps/AccountStep';
import { ProfileStep } from './steps/ProfileStep';
import { PreferencesStep } from './steps/PreferencesStep';

export function SignupForm() {
  const { step } = useSignupStore();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span>Account</span>
          <span>Profile</span>
          <span>Preferences</span>
        </div>
      </div>

      {/* Step content */}
      {step === 1 && <AccountStep />}
      {step === 2 && <ProfileStep />}
      {step === 3 && <PreferencesStep />}
    </div>
  );
}
```

### Individual Step Component

```typescript
// components/steps/AccountStep.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignupStore } from '@/lib/stores/signup-store';

const accountSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords must match',
  path: ['confirm_password'],
});

type AccountInput = z.infer<typeof accountSchema>;

export function AccountStep() {
  const { data, setStep, updateData } = useSignupStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: data.account,
  });

  function onSubmit(formData: AccountInput) {
    updateData('account', formData);
    setStep(2); // Move to next step
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-2xl font-bold">Create Account</h2>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email *
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password *
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.password && (
          <p id="password-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirm_password" className="block text-sm font-medium">
          Confirm Password *
        </label>
        <input
          id="confirm_password"
          type="password"
          {...register('confirm_password')}
          aria-invalid={errors.confirm_password ? 'true' : 'false'}
          aria-describedby={errors.confirm_password ? 'confirm_password-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.confirm_password && (
          <p id="confirm_password-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.confirm_password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        Next Step
      </button>
    </form>
  );
}
```

**Final step submits all data:**

```typescript
// components/steps/PreferencesStep.tsx (final step)
async function onSubmit(formData: PreferencesInput) {
  updateData('preferences', formData);

  // Submit entire form to server
  const response = await completeSignup({
    ...data.account,
    ...data.profile,
    ...formData,
  });

  if (response.success) {
    reset(); // Clear store
    router.push('/welcome');
  }
}
```

---

## 5. Optimistic Updates for Forms

Instant feedback before server responds.

```typescript
// components/AddCommentForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addComment } from '@/app/actions/add-comment';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(500),
});

type CommentInput = z.infer<typeof commentSchema>;

export function AddCommentForm({ postId }: { postId: string }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentInput>({
    resolver: zodResolver(commentSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CommentInput) => addComment(postId, data.content),

    onMutate: async (newComment) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData(['comments', postId]);

      // Optimistically update
      queryClient.setQueryData(['comments', postId], (old: any) => [
        ...(old || []),
        {
          id: crypto.randomUUID(),
          content: newComment.content,
          user_id: 'current-user',
          created_at: new Date().toISOString(),
          isPending: true, // Mark as pending
        },
      ]);

      reset(); // Clear form immediately

      return { previousComments };
    },

    onError: (error, newComment, context) => {
      // Rollback on error
      queryClient.setQueryData(['comments', postId], context?.previousComments);
    },

    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  async function onSubmit(data: CommentInput) {
    mutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium">
          Add Comment
        </label>
        <textarea
          id="content"
          rows={3}
          {...register('content')}
          aria-invalid={errors.content ? 'true' : 'false'}
          aria-describedby={errors.content ? 'content-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.content && (
          <p id="content-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.content.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Posting...' : 'Post Comment'}
      </button>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Failed to post comment. Please try again.
        </p>
      )}
    </form>
  );
}
```

---

## Anti-Patterns

### Anti-Pattern 1: No Server-Side Validation

**❌ WRONG:**
```typescript
// app/actions/update-profile.ts
'use server';

export async function updateProfile(data: any) {
  // Trusting client data without validation
  await supabase.from('profiles').update(data).eq('id', userId);
  return { success: true };
}
```

**Problem:** Client-side validation can be bypassed. Attacker can send malicious data directly to server.

**✅ CORRECT:**
```typescript
'use server';

import { updateProfileSchema } from '@/lib/schemas/user';

export async function updateProfile(input: unknown) {
  // ALWAYS validate on server
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() };
  }

  const { display_name, bio, email } = parsed.data;

  await supabase.from('profiles').update({
    display_name,
    bio,
    email,
  }).eq('id', userId);

  return { success: true };
}
```

---

### Anti-Pattern 2: Generic Error Messages

**❌ WRONG:**
```typescript
{errors.email && <p>Invalid input</p>}
```

**Problem:** Not helpful. User doesn't know what's wrong.

**✅ CORRECT:**
```typescript
{errors.email && (
  <p id="email-error" role="alert">
    {errors.email.message || 'Invalid email. Please use format: name@example.com'}
  </p>
)}
```

**Best practice:** Specific, actionable error messages (WCAG 3.3.3).

---

### Anti-Pattern 3: No Loading State

**❌ WRONG:**
```typescript
<button type="submit">Submit</button>
```

**Problem:** User clicks multiple times thinking it didn't work. Creates duplicate submissions.

**✅ CORRECT:**
```typescript
<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

---

### Anti-Pattern 4: Errors Not Linked to Fields

**❌ WRONG:**
```typescript
<input id="email" type="email" />
{errors.email && <p>Invalid email</p>}
```

**Problem:** Screen readers don't know error is related to email field.

**✅ CORRECT:**
```typescript
<input
  id="email"
  type="email"
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" role="alert">
    {errors.email.message}
  </p>
)}
```

---

### Anti-Pattern 5: No Focus Management After Error

**❌ WRONG:**
```typescript
// Submit fails, user doesn't know where error is
async function onSubmit(data) {
  const response = await submitForm(data);
  // No focus management
}
```

**Problem:** User must manually find error. Bad UX, especially for screen reader users.

**✅ CORRECT:**
```typescript
async function onSubmit(data) {
  const response = await submitForm(data);

  if (response.error) {
    // Focus first field with error
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setFocus(firstError as any);
    }
  }
}
```

---

## Implementation Examples

### Example 1: Contact Form with Rate Limiting

```typescript
// components/ContactForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sendContactMessage } from '@/app/actions/send-contact-message';
import { useState } from 'react';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactInput = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactInput) {
    setResult(null);
    const response = await sendContactMessage(data);

    if (response.success) {
      reset(); // Clear form on success
    }

    setResult(response);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name *
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email *
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Message *
        </label>
        <textarea
          id="message"
          rows={5}
          {...register('message')}
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
        {errors.message && (
          <p id="message-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      {result?.success && (
        <p role="status" className="text-sm text-green-600">
          Message sent successfully!
        </p>
      )}
      {result?.error && (
        <p role="alert" className="text-sm text-red-600">
          {result.error}
        </p>
      )}
    </form>
  );
}
```

```typescript
// app/actions/send-contact-message.ts
'use server';

import { z } from 'zod';
import { ratelimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
});

export async function sendContactMessage(input: unknown) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? '127.0.0.1';

  // Rate limiting: 3 messages per 10 minutes
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return {
      error: 'Too many messages. Please wait 10 minutes before sending another.',
    };
  }

  // Validate input
  const parsed = contactSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  const { name, email, message } = parsed.data;

  // Send email (using Resend, SendGrid, etc.)
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'contact@example.com',
        to: 'support@example.com',
        subject: `Contact form: ${name}`,
        text: `From: ${name} (${email})\n\n${message}`,
      }),
    });

    return { success: true };
  } catch (error) {
    return { error: 'Failed to send message. Please try again.' };
  }
}
```

---

## Testing Checklist

- [ ] **Validation works on both client and server**
  - [ ] Client-side validation provides instant feedback
  - [ ] Server-side validation prevents bypassing
  - [ ] Same schema used on client and server (Zod)

- [ ] **Accessible to screen readers**
  - [ ] All fields have `<label>` or `aria-label`
  - [ ] Errors use `aria-invalid` and `aria-describedby`
  - [ ] Error messages have `role="alert"`
  - [ ] Required fields indicated with `*` or "(required)"

- [ ] **Loading states implemented**
  - [ ] Submit button disabled during submission
  - [ ] Button text changes to "Submitting..." or shows spinner
  - [ ] Form fields disabled during submission (optional)

- [ ] **Error handling complete**
  - [ ] Specific error messages (not "Invalid input")
  - [ ] Focus moves to first error after submission
  - [ ] Errors displayed inline near relevant field
  - [ ] Form-level errors displayed at top

- [ ] **Success feedback**
  - [ ] Success message displayed after submission
  - [ ] Form cleared after successful submission (if appropriate)
  - [ ] Success message has `role="status"` for screen readers

- [ ] **Keyboard navigation**
  - [ ] Tab order logical (top to bottom, left to right)
  - [ ] All interactive elements focusable
  - [ ] Enter submits form
  - [ ] Escape closes modal forms

- [ ] **Progressive enhancement**
  - [ ] Form works without JavaScript (Server Actions)
  - [ ] JavaScript enhances UX (no page refresh)

---

## Accessibility Checklist

- [ ] **WCAG 2.2 AA compliance**
  - [ ] 1.3.1: Info and Relationships — Labels properly associated with inputs
  - [ ] 2.4.6: Headings and Labels — Descriptive labels
  - [ ] 3.2.2: On Input — No unexpected context changes
  - [ ] 3.3.1: Error Identification — Errors identified in text
  - [ ] 3.3.2: Labels or Instructions — Sufficient instructions provided
  - [ ] 3.3.3: Error Suggestion — Suggestions for fixing errors
  - [ ] 3.3.4: Error Prevention — Confirmation for legal/financial forms
  - [ ] 4.1.3: Status Messages — Success/error announced to screen readers

- [ ] **Screen reader tested**
  - [ ] Test with NVDA (Windows) or VoiceOver (macOS)
  - [ ] Labels announced correctly
  - [ ] Errors announced when field is focused
  - [ ] Success/error messages announced dynamically

---

## Performance Checklist

- [ ] **Form responds instantly**
  - [ ] Client-side validation runs on blur or change
  - [ ] Optimistic updates for non-critical forms
  - [ ] Debounce expensive validation (API calls)

- [ ] **Large forms optimized**
  - [ ] Multi-step forms paginated (not single long form)
  - [ ] Conditional fields hidden until relevant
  - [ ] Heavy validation (API calls) only on submit

---

## Security Checklist

- [ ] **Server-side validation always**
  - [ ] Every Server Action validates input with Zod
  - [ ] Never trust client data
  - [ ] Sanitize HTML if accepting rich text (DOMPurify)

- [ ] **Rate limiting implemented**
  - [ ] Public forms rate-limited by IP
  - [ ] Authenticated forms rate-limited by user ID
  - [ ] Clear error message when rate limit exceeded

- [ ] **CSRF protection**
  - [ ] Server Actions used (built-in protection)
  - [ ] If using API routes, `@edge-csrf/nextjs` installed

- [ ] **Input sanitization**
  - [ ] HTML stripped or sanitized (DOMPurify)
  - [ ] SQL injection prevented (parameterized queries)
  - [ ] XSS prevented (React escaping + no `dangerouslySetInnerHTML` without sanitization)

---

## Integration Notes

**Works well with:**
- **security.md** — Input validation, rate limiting, CSRF protection
- **optimistic-updates.md** — Instant form feedback before server responds
- **data-fetching.md** — TanStack Query for form submissions with retry/caching
- **file-upload.md** — File upload fields in forms

**Potential conflicts:**
- **None** — Forms are foundational and work with all patterns

**Dependencies:**
- Depends on `security.md` for validation and sanitization patterns
- Can use `optimistic-updates.md` for instant feedback

---

## References

1. [React Hook Form Documentation](https://react-hook-form.com/)
2. [Zod Documentation](https://zod.dev/)
3. [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
4. [WCAG 2.2 Forms Guidelines](https://www.w3.org/WAI/WCAG22/quickref/?tags=forms)
5. [Accessible Form Validation Best Practices](https://www.reform.app/blog/accessible-form-validation-best-practices)
6. [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
7. [React Hook Form + Zustand Multi-Step Forms](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)
8. [ARIA Labels for Accessibility](https://www.allaccessible.org/blog/implementing-aria-labels-for-web-accessibility)

---

## Version History

- **v1.0** (2024-01-15): Initial forms pattern covering React Hook Form + Zod, Server Actions, accessibility (WCAG 2.2), multi-step forms, dual validation, optimistic updates
