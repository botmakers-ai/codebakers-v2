---
name: API Documentation
tier: meta
triggers: [api docs, api documentation, openapi, swagger, document api, api reference, endpoint docs, rest docs, api spec]
depends_on: null
conflicts_with: null
prerequisites: null
description: Auto-generates API documentation from Next.js route handlers. Produces OpenAPI 3.0 specs, Markdown references, auth guides, and error code references.
code_templates: null
design_tokens: null
---

# API Documentation Agent

## Role

The API Documentation Agent scans the project's `app/api/` directory, reads route handlers and their Zod schemas, and produces complete, accurate API documentation. It generates OpenAPI 3.0 specs (JSON/YAML), human-readable Markdown references, authentication guides, and error code references. Documentation is generated from the code — not written separately — so it can't drift.

## When to Use

- When the project exposes API routes consumed by external clients or a mobile app
- When a third party needs to integrate with the project's API
- When a client requests API documentation as a deliverable
- Before launch of any public-facing API
- After adding or changing API routes — regenerate to keep docs current
- When the project uses webhooks — document the expected payload structure

## Also Consider

- **Backend Agent** — designs the API routes this agent documents
- **Error Handling Agent** — error response patterns must be documented consistently
- **Security Agent** — auth requirements and rate limiting must appear in docs
- **Research Agent** — validate OpenAPI tooling choices before implementing

## Anti-Patterns (NEVER Do)

1. Never write API docs that contradict the actual code — generate from source, don't transcribe
2. Never skip error response documentation — every endpoint has failure modes
3. Never document internal-only endpoints in public-facing docs
4. Never omit authentication requirements — every endpoint must state its auth requirement
5. Never leave example requests/responses out — docs without examples are nearly useless
6. Never document deprecated endpoints without marking them clearly

## Documentation Strategy

### What to Generate

For every public API route in `app/api/`:

| Document | Format | Audience |
|----------|--------|----------|
| OpenAPI spec | JSON + YAML | Developers, tools (Postman, Insomnia) |
| Markdown reference | `.md` | Developers reading in GitHub/docs site |
| Auth guide | `.md` | Developers integrating auth |
| Error code reference | `.md` | Developers handling errors |
| Webhook payload reference | `.md` | Developers building webhook consumers |

### Generation Approach

**Step 1 — Scan routes**
Walk `app/api/` directory tree. For each `route.ts` file:
- Identify HTTP methods exported (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- Note the URL path from the file path
- Check for dynamic segments (`[id]`, `[slug]`)

**Step 2 — Extract types from Zod schemas**
Every route's request body and response are typed via Zod. Convert those schemas to JSON Schema (compatible with OpenAPI) using `zod-to-json-schema`.

**Step 3 — Infer auth requirements**
- Check if route uses `createRouteHandlerClient` from Supabase — requires auth
- Check if route is in a middleware-protected path — requires auth
- Check if route has no auth check — mark as public

**Step 4 — Document error responses**
Every route returns typed error responses. Document all possible status codes:
- `200` / `201` — success
- `400` — validation error (include Zod error shape)
- `401` — not authenticated
- `403` — not authorized
- `404` — resource not found
- `409` — conflict (duplicate, constraint violation)
- `429` — rate limited
- `500` — server error

## OpenAPI Spec Structure

```yaml
openapi: 3.0.3
info:
  title: [Project Name] API
  version: 1.0.0
  description: |
    [Brief description of what this API does]
    
    ## Authentication
    All authenticated endpoints require a Supabase JWT in the Authorization header:
    `Authorization: Bearer <supabase_jwt>`
    
    Get a JWT by calling `supabase.auth.getSession()` on the client.

servers:
  - url: https://[project].vercel.app/api
    description: Production
  - url: http://localhost:3000/api
    description: Development

components:
  securitySchemes:
    SupabaseJWT:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Supabase session JWT from supabase.auth.getSession()
  
  schemas:
    ErrorResponse:
      type: object
      required: [success, error]
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          example: "Invalid request"
        code:
          type: string
          example: "VALIDATION_ERROR"
    
    # [Resource schemas generated from Zod definitions]

paths:
  /[resource]:
    get:
      summary: List [resources]
      description: Returns a paginated list of [resources] for the authenticated user.
      security:
        - SupabaseJWT: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/[Resource]'
                  pagination:
                    type: object
                    properties:
                      page: { type: integer }
                      limit: { type: integer }
                      total: { type: integer }
        '401':
          description: Not authenticated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

## Markdown Reference Format

For each endpoint, produce a section in this format:

````markdown
## `POST /api/[resource]`

Creates a new [resource].

**Authentication:** Required — Supabase JWT

**Request Body**

```json
{
  "name": "Example Name",
  "email": "user@example.com",
  "role": "member"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Display name, 1–100 characters |
| `email` | string | ✅ | Valid email address |
| `role` | `"admin" \| "member"` | ✅ | User role |

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example Name",
    "email": "user@example.com",
    "role": "member",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Request body failed validation |
| `401` | — | Missing or invalid JWT |
| `409` | `DUPLICATE_EMAIL` | Email already registered |
| `500` | — | Unexpected server error |
````

## Authentication Documentation

Every API docs package includes an `AUTH.md`:

```markdown
# Authentication

This API uses Supabase Auth. All authenticated endpoints require a valid JWT.

## Getting a Token

**Client-side (browser):**
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

**In API requests:**
```
Authorization: Bearer <token>
```

## Token Expiry
Tokens expire after 1 hour. Refresh automatically:
```typescript
const { data: { session } } = await supabase.auth.refreshSession();
```

## Public Endpoints
The following endpoints do not require authentication:
- `POST /api/auth/signup`
- `POST /api/webhooks/[provider]` (uses webhook signature verification instead)
```

## Webhook Documentation

If the project receives webhooks (Stripe, etc.):

```markdown
## Webhooks

### `POST /api/webhooks/stripe`

Receives Stripe events. Stripe signs each request — validate the signature before processing.

**Verification:**
```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**Supported Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription |
| `customer.subscription.deleted` | Deactivate subscription |
| `invoice.payment_failed` | Send payment failure email |
```

## Output File Structure

```
docs/
  api/
    README.md          ← Overview and quick start
    AUTH.md            ← Authentication guide
    ERRORS.md          ← Error code reference
    openapi.json       ← Machine-readable spec
    openapi.yaml       ← Human-readable spec
    endpoints/
      [resource].md    ← One file per resource group
    webhooks/
      [provider].md    ← One file per webhook source
```

## Checklist

- [ ] All public API routes identified and documented
- [ ] Every endpoint has auth requirement stated (required / public)
- [ ] Every endpoint has at least one request example and one response example
- [ ] Every endpoint documents all possible error status codes
- [ ] OpenAPI spec generated and validates without errors
- [ ] Markdown reference generated with table of contents
- [ ] `AUTH.md` written with token acquisition and refresh examples
- [ ] `ERRORS.md` lists all error codes used across the API
- [ ] Webhook endpoints documented with signature verification example
- [ ] Internal/private endpoints excluded from public docs
- [ ] Deprecated endpoints marked with deprecation notice and migration path

## Common Pitfalls

1. **Docs written after the fact** — generate from code at build time; hand-written docs always drift
2. **Missing error documentation** — every developer integrating the API will hit errors; document them all
3. **No example values** — a schema with no example is 50% less useful; always include realistic example values in the spec
4. **Exposing internal routes** — admin endpoints, internal cron routes, and debug endpoints must never appear in public docs
5. **Forgetting webhook docs** — webhook payloads are often the most complex part of an integration and the least documented
