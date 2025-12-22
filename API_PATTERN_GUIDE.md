# API Pattern Guide

This project follows a consistent pattern similar for handling API routes with proper separation of concerns.

## Architecture Pattern

```
Request Flow:
Route → Auth Middleware → Validation Middleware → Controller → Service → Model → Database
         ↓
    Error Handler
```

## File Structure

Each API module should follow this structure:

```
api/
├── module-name/
│   ├── route.ts                    # HTTP route definitions (GET, POST, etc.)
│   ├── [slug]/
│   │   └── route.ts                # Dynamic route handlers
│   ├── module-name.controller.ts   # Request handlers
│   ├── module-name.service.ts      # Business logic
│   └── module-name.validation.ts   # Zod validation schemas
```

## Middleware Pattern

### 1. Auth Middleware (Role-based)

```typescript
import { auth } from '@/middleware/auth.middleware';
import { TRole } from '@/types/jsonwebtoken.type';

// In route.ts
export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      ControllerFunction,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
```

**Available roles:** `'super-admin' | 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber' | 'user' | 'guest'`

### 2. Validation Middleware

```typescript
import { validation } from '@/middleware/validation.middleware';
import * as ValidationSchemas from './module.validation';

export async function POST(req: NextRequest) {
  try {
    return await auth('admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ValidationSchemas.createSchema)(
          authedReq,
          ControllerFunction,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
```

### 3. File Upload Middleware

```typescript
import { file } from '@/middleware/file.middleware';

export async function POST(req: NextRequest) {
  try {
    return await auth('admin' as TRole)(
      req,
      async (authedReq) => {
        return await file(
          { name: 'thumbnail', folder: 'articles', allowedTypes: ['image/jpeg', 'image/png'], size: 5_000_000 },
          { name: 'images', folder: 'articles', maxCount: 5, allowedTypes: ['image/jpeg', 'image/png'] },
        )(
          authedReq,
          ControllerFunction,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
```

## Controller Pattern

```typescript
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as ModuleService from './module.service';

export const getItems = catchAsync(async (req: AuthRequest) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ModuleService.getItems(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Items retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});
```

## Service Pattern

```typescript
import connectDB from '@/lib/db';
import Model from '@/models/model.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';

export const getItems = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<ModelType>(
    Model.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'slug'])           // Searchable fields
    .filter(['status', 'category'])     // Filterable fields
    .sort(['created_at', 'name'])       // Sortable fields
    .paginate()                         // Pagination
    .fields()                           // Field selection
    .execute();

  return result;
};
```

## Validation Pattern

```typescript
import { z } from 'zod';

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    slug: z.string().min(1).max(50),
    status: z.enum(['active', 'inactive']).default('active'),
  }),
});

export const updateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: z.string().min(1).max(50).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});
```

## Error Handling

All errors are automatically caught and formatted by the `errorHandler` utility:

```typescript
import { errorHandler } from '@/utils/errorHandler';

export async function GET(req: NextRequest) {
  try {
    // ... route logic
  } catch (error) {
    return errorHandler(error, req);
  }
}
```

## Response Format

All responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Items retrieved successfully",
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "status": 400,
  "message": "Validation Error",
  "sources": [
    {
      "path": "name",
      "message": "Name is required"
    }
  ]
}
```

## Naming Conventions

- **All API fields use snake_case** (not camelCase)
- Database fields: `created_at`, `updated_at`, `is_deleted`
- Query params: `page`, `limit`, `sort`, `search`, `is_count_only`
- Response fields: All in snake_case

## Example: Complete Route Implementation

See `src/app/api/admin/article-categories/` for a complete example following this pattern.

