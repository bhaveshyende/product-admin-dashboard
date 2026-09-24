# Meridian · Product Admin Dashboard

A polished, responsive product administration frontend built for the Frontend Assignment brief. The project uses React, TypeScript, Tailwind CSS, Wouter, Lucide icons, and Axios against the free [DummyJSON API](https://dummyjson.com).

> **Runtime note:** The available WebDev frontend scaffold in this environment is Vite-based. The UI is built as a client-side React app with a clean component/page structure that can be moved into a Next.js App Router project without changing the API or feature architecture.

## Demo access

- **Username:** `emilys`
- **Password:** `emilyspass`

## Run locally

```bash
pnpm install
pnpm dev
```

Then open the local Vite URL. Production validation:

```bash
pnpm check
pnpm build
```

## Completed

- Protected login using `POST /auth/login`, with friendly invalid-credential errors and logout.
- Shared Axios instance with a request interceptor for the access token and a centralized response error handler.
- Responsive product list: desktop table and mobile cards with image, title, category, price, rating, and stock.
- URL-synced pagination, page size (`10`, `20`, `50`), search, category filter, and sort controls.
- Debounced search that waits for typing to settle; AbortController plus request IDs prevent stale search responses from replacing newer results.
- Category loading from `/products/category-list` and sorting by title, price, or rating.
- Product detail route with image gallery, description, pricing, stock, metadata, and reviews.
- Wrong IDs render a friendly not-found state; API failures render a retry state; empty searches render a clear empty state.
- Add and edit forms with required-field validation and guarded submit buttons to avoid duplicate requests.
- Delete confirmation before the API request and a friendly success/error toast afterward.
- Responsive sidebar navigation, mobile navigation drawer, account area, overview cards, catalog health panel, and category mix visualization.

## Decisions and tradeoffs

### Search and category together

DummyJSON cannot search and category-filter in the same API request. The interface keeps both values in the URL so a shared link remains understandable, but search takes priority while both are present. A small inline explanation appears above the results with a one-click action to clear the category filter.

### Mutations are not persistent in DummyJSON

DummyJSON returns successful add, update, and delete responses without persisting them for future requests. After a successful mutation, the app mirrors the change in a small `localStorage` overlay. The catalog therefore feels consistent during the current browser session while the page explicitly explains that the API itself is not a real persistence layer.

### Invalid URL values

Pagination values are parsed defensively. Non-numeric pages fall back to page 1, unsupported page sizes fall back to 10, and pages beyond the available range are redirected to the final valid page after the response resolves.

## One problem and how it was fixed

The biggest API-specific problem was stale search data: a slow request could resolve after a newer query and overwrite the latest results. The product list uses a debounced query, an AbortController per request, and a monotonically increasing request ID. Only the latest request is allowed to commit state.

## Where AI helped

AI was used to accelerate scaffolding, visual design exploration, component drafting, and review of edge cases from the assignment brief. The implementation was then validated manually in the browser and with `pnpm check` plus a production build. Key behavior—login, protected routing, URL-synced catalog controls, product detail rendering, and responsive table/card behavior—was checked against the running preview.
