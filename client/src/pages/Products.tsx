import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Edit3,
  Eye,
  Filter,
  ImageOff,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { Button, Field, SearchField, Select, Spinner, Stars, StatusMessage, Surface } from "../components/ui";
import {
  Product,
  ProductQuery,
  formatApiError,
  findLocalProduct,
  mergeLocalProducts,
  productApi,
  readLocalProductState,
  saveCreatedProduct,
  saveDeletedProduct,
  saveUpdatedProduct,
  writeLocalProductState,
} from "../lib/api";

const FALLBACK_IMAGE = "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp";
const PAGE_SIZES = [10, 20, 50];

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function parseListParams(search: string) {
  const params = new URLSearchParams(search);
  const rawPage = Number(params.get("page"));
  const rawLimit = Number(params.get("limit"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = PAGE_SIZES.includes(rawLimit) ? rawLimit : 10;
  const sort = params.get("sort") || "";
  const [sortBy = "", order = "asc"] = sort.split("-");
  return {
    page,
    limit,
    search: params.get("q") || "",
    category: params.get("category") || "",
    sortBy: ["price", "rating", "title"].includes(sortBy) ? sortBy : "",
    order: order === "desc" ? "desc" as const : "asc" as const,
  };
}

function queryString(values: { page: number; limit: number; search?: string; category?: string; sortBy?: string; order?: string }) {
  const params = new URLSearchParams();
  if (values.page > 1) params.set("page", String(values.page));
  if (values.limit !== 10) params.set("limit", String(values.limit));
  if (values.search) params.set("q", values.search);
  if (values.category) params.set("category", values.category);
  if (values.sortBy) params.set("sort", `${values.sortBy}-${values.order || "asc"}`);
  return params.toString();
}

function ProductThumb({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={`grid place-items-center rounded-xl bg-lilac text-ink-faint ${large ? "h-full min-h-56" : "h-12 w-12"}`}><ImageOff className="h-4 w-4" /></div> : <img src={product.thumbnail || product.images?.[0] || FALLBACK_IMAGE} alt="" onError={() => setFailed(true)} className={`rounded-xl bg-lilac object-cover ${large ? "h-full min-h-56 w-full" : "h-12 w-12"}`} />;
}

function ProductListPage() {
  const [location, navigate] = useLocation();
  const params = useMemo(() => parseListParams(location.split("?")[1] ? `?${location.split("?")[1]}` : ""), [location]);
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebouncedValue(searchInput, 450);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [localState, setLocalState] = useState(readLocalProductState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      navigate(`/products?${queryString({ ...params, page: 1, search: debouncedSearch })}`);
    }
  }, [debouncedSearch, params, navigate]);

  useEffect(() => {
    setSearchInput(params.search);
  }, [params.search]);

  useEffect(() => {
    const controller = new AbortController();
    productApi.categories(controller.signal).then(setCategories).catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    const query: ProductQuery = {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      category: params.search ? undefined : params.category || undefined,
      sortBy: params.sortBy || undefined,
      order: params.order,
      signal: controller.signal,
    };
    productApi.list(query).then((data) => {
      if (currentRequest !== requestId.current) return;
      setLocalState(readLocalProductState());
      setProducts(data.products);
      setTotal(data.total);
    }).catch((requestError) => {
      if (controller.signal.aborted || currentRequest !== requestId.current) return;
      setError(formatApiError(requestError));
    }).finally(() => {
      if (!controller.signal.aborted && currentRequest === requestId.current) setLoading(false);
    });
    return () => controller.abort();
  }, [params.page, params.limit, params.search, params.category, params.sortBy, params.order]);

  const visibleProducts = useMemo(() => mergeLocalProducts(products, localState, params.page === 1), [products, localState, params.page]);
  const maxPage = Math.max(1, Math.ceil((total + localState.created.length) / params.limit));
  const currentPage = Math.min(params.page, maxPage);
  const from = total === 0 && visibleProducts.length === 0 ? 0 : (currentPage - 1) * params.limit + 1;
  const to = Math.min(currentPage * params.limit, total + localState.created.length);

  useEffect(() => {
    if (!loading && params.page > maxPage && maxPage > 0) navigate(`/products?${queryString({ ...params, page: maxPage })}`);
  }, [loading, maxPage, params, navigate]);

  const updateParams = (next: Partial<typeof params>) => navigate(`/products?${queryString({ ...params, ...next })}`);
  const chooseCategory = (category: string) => {
    setCategoryMenuOpen(false);
    updateParams({ category, page: 1, search: params.search });
  };
  const chooseSort = (value: string) => {
    const [sortBy, order] = value.split("-");
    updateParams({ sortBy: sortBy || "", order: order === "desc" ? "desc" : "asc", page: 1 });
  };
  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Delete “${product.title}”? This change will be reflected in your workspace.`)) return;
    try {
      await productApi.remove(product.id);
      const next = saveDeletedProduct(product.id, localState);
      setLocalState(next);
      setProducts((items) => items.filter((item) => item.id !== product.id));
      setTotal((value) => Math.max(0, value - 1));
      setToast("Product removed from the catalog");
      window.setTimeout(() => setToast(""), 2600);
    } catch (requestError) {
      setToast(`Couldn’t delete product: ${formatApiError(requestError)}`);
      window.setTimeout(() => setToast(""), 3200);
    }
  };

  return <div className="animate-enter">
    <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-plum">Catalog / Products</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em] text-ink sm:text-4xl">Products<span className="text-plum">.</span></h1><p className="mt-2 text-sm text-ink-muted">Manage the details that make your catalog feel alive.</p></div><Button onClick={() => navigate("/products/new")}><Plus className="h-4 w-4" /> Add product</Button></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-line bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Total catalog</p><p className="mt-1 font-display text-2xl font-bold text-ink">{total + localState.created.length}</p></div><div className="rounded-2xl border border-line bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Showing now</p><p className="mt-1 font-display text-2xl font-bold text-ink">{visibleProducts.length}</p></div><div className="rounded-2xl border border-line bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">View mode</p><p className="mt-1 font-display text-2xl font-bold text-ink">{params.search ? "Search" : params.category ? "Filtered" : "All products"}</p></div></div>
    <Surface className="overflow-visible">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-2"><SearchField value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products…" /></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><Button type="button" tone={params.category ? "soft" : "outline"} size="sm" onClick={() => setCategoryMenuOpen((value) => !value)}><Filter className="h-3.5 w-3.5" /> {params.category ? params.category.replaceAll("-", " ") : "Category"}<ChevronDownSmall /></Button>{categoryMenuOpen ? <div className="absolute right-0 top-11 z-20 max-h-72 w-52 overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-xl"><button type="button" onClick={() => chooseCategory("")} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-ink-muted hover:bg-lilac">All categories {!params.category ? <Check className="h-3.5 w-3.5 text-plum" /> : null}</button>{categories.map((category) => <button type="button" key={category} onClick={() => chooseCategory(category)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold capitalize text-ink-muted hover:bg-lilac">{category.replaceAll("-", " ")} {params.category === category ? <Check className="h-3.5 w-3.5 text-plum" /> : null}</button>)}</div> : null}</div><Select aria-label="Sort products" value={params.sortBy ? `${params.sortBy}-${params.order}` : ""} onChange={(event) => chooseSort(event.target.value)} className="h-9 text-xs"><option value="">Sort by</option><option value="title-asc">Title · A–Z</option><option value="title-desc">Title · Z–A</option><option value="price-asc">Price · Low first</option><option value="price-desc">Price · High first</option><option value="rating-desc">Rating · Highest</option><option value="rating-asc">Rating · Lowest</option></Select></div></div>
      {params.search && params.category ? <div className="flex items-center gap-2 border-b border-peach/40 bg-peach-pale px-5 py-3 text-xs font-semibold text-ink-soft"><CircleAlert className="h-4 w-4 text-peach-dark" /> Search takes priority over category because DummyJSON doesn’t support both in one request.<button type="button" onClick={() => updateParams({ category: "", page: 1 })} className="ml-auto font-bold text-plum hover:underline">Clear category</button></div> : null}
      {loading ? <LoadingTable /> : error ? <StatusMessage icon={<CircleAlert className="h-5 w-5" />} title="Couldn’t load products" copy={error} action={<Button tone="outline" size="sm" onClick={() => navigate(location)}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>} /> : visibleProducts.length === 0 ? <StatusMessage icon={<SearchX className="h-5 w-5" />} title="No products found" copy={params.search ? `We couldn't find anything matching “${params.search}”. Try a broader search.` : "There are no products in this view yet."} action={params.search ? <Button tone="soft" size="sm" onClick={() => { setSearchInput(""); updateParams({ search: "", page: 1 }); }}>Clear search</Button> : undefined} /> : <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] border-collapse"><thead><tr className="border-b border-line bg-[#fcfbfd] text-left"><th className="w-[43%] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Product</th><th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Category</th><th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Price</th><th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Rating</th><th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Stock</th><th className="px-5 py-3.5" /></tr></thead><tbody>{visibleProducts.map((product) => <ProductRow key={product.id} product={product} onDelete={() => removeProduct(product)} />)}</tbody></table></div><div className="grid gap-3 p-3 md:hidden">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onDelete={() => removeProduct(product)} />)}</div><Pagination currentPage={currentPage} maxPage={maxPage} limit={params.limit} from={from} to={to} total={total + localState.created.length} onPage={(page) => updateParams({ page })} onLimit={(limit) => updateParams({ limit, page: 1 })} /></>}
    </Surface>
    {toast ? <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-bold text-white shadow-2xl"><Check className="h-4 w-4 text-peach" /> {toast}</div> : null}
  </div>;
}

function ChevronDownSmall() { return <ChevronRight className="h-3.5 w-3.5 rotate-90" />; }

function LoadingTable() { return <div className="p-4 sm:p-5"><div className="hidden space-y-3 md:block">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-4 rounded-xl px-2 py-3"><div className="skeleton h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/3 rounded" /><div className="skeleton h-2 w-1/4 rounded" /></div><div className="skeleton h-3 w-16 rounded" /><div className="skeleton h-3 w-16 rounded" /></div>)}</div><div className="space-y-3 md:hidden">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-28 rounded-2xl" />)}</div></div>; }

function ProductRow({ product, onDelete }: { product: Product; onDelete: () => void }) { return <tr className="group border-b border-line/70 transition hover:bg-[#fcfbfd]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><ProductThumb product={product} /><div className="min-w-0"><Link href={`/products/${product.id}`} className="block truncate text-sm font-bold text-ink transition hover:text-plum">{product.title}</Link><p className="mt-0.5 truncate text-[11px] text-ink-faint">SKU {product.sku || `MD-${String(product.id).padStart(4, "0")}`}</p></div></div></td><td className="px-4 py-3.5"><span className="rounded-full bg-lilac px-2.5 py-1 text-[10px] font-bold capitalize text-plum">{product.category.replaceAll("-", " ")}</span></td><td className="px-4 py-3.5 text-sm font-bold text-ink">${product.price.toFixed(2)}</td><td className="px-4 py-3.5"><Stars value={product.rating} compact /></td><td className="px-4 py-3.5"><StockBadge stock={product.stock} /></td><td className="px-5 py-3.5"><ProductActions product={product} onDelete={onDelete} /></td></tr>; }

function ProductCard({ product, onDelete }: { product: Product; onDelete: () => void }) { return <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_8px_25px_rgba(46,40,66,0.04)]"><div className="flex items-center gap-3"><ProductThumb product={product} /><div className="min-w-0 flex-1"><Link href={`/products/${product.id}`} className="block truncate text-sm font-bold text-ink">{product.title}</Link><p className="mt-0.5 text-[11px] capitalize text-ink-faint">{product.category.replaceAll("-", " ")}</p></div><ProductActions product={product} onDelete={onDelete} /></div><div className="mt-4 grid grid-cols-3 border-t border-line pt-3"><div><p className="text-[10px] text-ink-faint">Price</p><p className="mt-1 text-xs font-bold text-ink">${product.price.toFixed(2)}</p></div><div><p className="text-[10px] text-ink-faint">Rating</p><div className="mt-1"><Stars value={product.rating} compact /></div></div><div><p className="text-[10px] text-ink-faint">Stock</p><div className="mt-1"><StockBadge stock={product.stock} /></div></div></div></div>; }

function ProductActions({ product, onDelete }: { product: Product; onDelete: () => void }) { return <div className="flex items-center justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100"><Link href={`/products/${product.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint hover:bg-lilac hover:text-plum" title="View product"><Eye className="h-3.5 w-3.5" /></Link><Link href={`/products/${product.id}/edit`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint hover:bg-lilac hover:text-plum" title="Edit product"><Edit3 className="h-3.5 w-3.5" /></Link><button type="button" onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint hover:bg-rose-pale hover:text-rose-dark" title={`Delete ${product.title}`}><Trash2 className="h-3.5 w-3.5" /></button></div>; }

function StockBadge({ stock }: { stock: number }) { const low = stock < 20; return <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${low ? "text-rose-dark" : "text-mint-dark"}`}><span className={`h-1.5 w-1.5 rounded-full ${low ? "bg-rose" : "bg-mint"}`} />{stock} <span className="hidden font-medium text-ink-faint lg:inline">units</span></span>; }

function Pagination({ currentPage, maxPage, limit, from, to, total, onPage, onLimit }: { currentPage: number; maxPage: number; limit: number; from: number; to: number; total: number; onPage: (page: number) => void; onLimit: (limit: number) => void }) { const pages = Array.from({ length: Math.min(5, maxPage) }, (_, index) => { if (maxPage <= 5) return index + 1; if (currentPage <= 3) return index + 1; if (currentPage >= maxPage - 2) return maxPage - 4 + index; return currentPage - 2 + index; }); return <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs text-ink-muted">Showing <span className="font-bold text-ink">{from}–{to}</span> of <span className="font-bold text-ink">{total}</span></p><div className="flex flex-wrap items-center gap-2"><Select aria-label="Page size" value={String(limit)} onChange={(event) => onLimit(Number(event.target.value))} className="h-9 text-xs"><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option></Select><div className="flex items-center gap-1"><button type="button" disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-plum hover:text-plum disabled:opacity-35" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>{pages.map((page) => <button type="button" key={page} onClick={() => onPage(page)} className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold transition ${currentPage === page ? "bg-ink text-white" : "text-ink-muted hover:bg-lilac hover:text-plum"}`}>{page}</button>)}<button type="button" disabled={currentPage >= maxPage} onClick={() => onPage(currentPage + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-plum hover:text-plum disabled:opacity-35" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div></div>; }

export function ProductDetailPage() {
  const [, params] = useRoute("/products/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [localState, setLocalState] = useState(readLocalProductState);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) { setNotFound(true); setLoading(false); return; }
    const local = findLocalProduct(id, readLocalProductState());
    if (local) { setProduct(local); setLoading(false); return; }
    const controller = new AbortController();
    productApi.get(id, controller.signal).then(setProduct).catch((requestError) => { if (!controller.signal.aborted) { setNotFound(true); setError(formatApiError(requestError)); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <div className="animate-enter"><div className="skeleton h-6 w-24 rounded" /><div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><div className="skeleton min-h-[430px] rounded-3xl" /><div className="space-y-4"><div className="skeleton h-8 w-3/4 rounded" /><div className="skeleton h-20 w-full rounded" /><div className="skeleton h-36 w-full rounded" /></div></div></div>;
  if (notFound || !product) return <div className="animate-enter"><StatusMessage icon={<Package className="h-5 w-5" />} title="Product not found" copy={error || "This product may have been removed or the link may be incorrect."} action={<Button onClick={() => navigate("/products")} tone="soft"><ArrowLeft className="h-4 w-4" /> Back to products</Button>} /></div>;

  const images = product.images?.length ? product.images : [product.thumbnail || FALLBACK_IMAGE];
  const reviews = product.reviews?.length ? product.reviews : [{ rating: product.rating, comment: "A dependable addition to the catalog.", date: "2026-09-01", reviewerName: "Meridian team", reviewerEmail: "team@meridian.test" }];
  const deleteProduct = async () => {
    if (!window.confirm(`Delete “${product.title}”?`)) return;
    try { await productApi.remove(product.id); const next = saveDeletedProduct(product.id, localState); setLocalState(next); navigate("/products"); } catch (requestError) { setError(formatApiError(requestError)); }
  };

  return <div className="animate-enter"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => navigate("/products")} className="inline-flex items-center gap-2 text-xs font-bold text-ink-muted transition hover:text-plum"><ArrowLeft className="h-4 w-4" /> Back to products</button><div className="flex gap-2"><Button tone="outline" size="sm" onClick={() => navigate(`/products/${product.id}/edit`)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button><Button tone="danger" size="sm" onClick={deleteProduct}><Trash2 className="h-3.5 w-3.5" /> Delete</Button></div></div><div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]"><Surface className="overflow-hidden p-3 sm:p-5"><div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-lilac"><img src={images[selectedImage] || FALLBACK_IMAGE} alt={product.title} className="h-full max-h-[410px] w-full object-contain mix-blend-multiply" /></div><div className="mt-3 grid grid-cols-4 gap-2">{images.slice(0, 4).map((image, index) => <button type="button" key={image} onClick={() => setSelectedImage(index)} className={`h-16 overflow-hidden rounded-xl border-2 bg-lilac transition ${selectedImage === index ? "border-plum" : "border-transparent opacity-60 hover:opacity-100"}`}><img src={image} alt="" className="h-full w-full object-cover mix-blend-multiply" /></button>)}</div></Surface><div><div className="mb-5"><span className="rounded-full bg-lilac px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-plum">{product.category.replaceAll("-", " ")}</span><h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-[-0.055em] text-ink sm:text-5xl">{product.title}<span className="text-plum">.</span></h1><div className="mt-4 flex flex-wrap items-center gap-4"><Stars value={product.rating} /><span className="text-xs text-ink-faint">{reviews.length} customer reviews</span><StockBadge stock={product.stock} /></div></div><p className="max-w-xl text-sm leading-7 text-ink-muted">{product.description}</p><div className="mt-7 flex items-end gap-3"><p className="font-display text-4xl font-bold tracking-[-0.05em] text-ink">${product.price.toFixed(2)}</p>{product.discountPercentage ? <span className="mb-1.5 rounded-full bg-mint-pale px-2 py-1 text-xs font-bold text-mint-dark">-{product.discountPercentage.toFixed(0)}% today</span> : null}</div><div className="mt-8 grid gap-3 border-y border-line py-5 sm:grid-cols-2"><DetailStat label="Brand" value={product.brand || "Meridian select"} /><DetailStat label="SKU" value={product.sku || `MD-${String(product.id).padStart(4, "0")}`} /><DetailStat label="Shipping" value={product.shippingInformation || "Ships in 2–4 days"} /><DetailStat label="Returns" value={product.returnPolicy || "30-day returns"} /></div></div></div><div className="mt-7 grid gap-7 lg:grid-cols-[1.05fr_0.95fr]"><Surface className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-plum">Social proof</p><h2 className="mt-1 font-display text-xl font-bold tracking-[-0.03em]">Customer reviews</h2></div><Stars value={product.rating} /></div><div className="space-y-5">{reviews.slice(0, 3).map((review, index) => <div key={`${review.reviewerName}-${index}`} className="border-t border-line pt-4 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-ink">{review.reviewerName}</p><p className="mt-0.5 text-[11px] text-ink-faint">{new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div><Stars value={review.rating} compact /></div><p className="mt-2 text-sm leading-6 text-ink-muted">“{review.comment}”</p></div>)}</div></Surface><Surface className="p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-plum">Product notes</p><h2 className="mt-1 font-display text-xl font-bold tracking-[-0.03em]">Details at a glance</h2><div className="mt-5 space-y-3">{[["Availability", product.availabilityStatus || "In stock"],["Minimum order", `${product.minimumOrderQuantity || 1} unit${(product.minimumOrderQuantity || 1) > 1 ? "s" : ""}`],["Weight", product.weight ? `${product.weight} kg` : "—"],["Dimensions", product.dimensions ? `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm` : "—"]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-line py-2.5 text-sm"><span className="text-ink-muted">{String(label)}</span><span className="max-w-[55%] text-right font-semibold capitalize text-ink">{String(value)}</span></div>)}</div></Surface></div></div>;
}

function DetailStat({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-ink-faint">{label}</p><p className="mt-1 truncate text-sm font-semibold capitalize text-ink-soft">{value}</p></div>; }

export function ProductFormPage() {
  const [isEdit, routeParams] = useRoute("/products/:id/edit");
  const [, navigate] = useLocation();
  const id = Number(routeParams?.id);
  const [initial, setInitial] = useState<Product | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "beauty", price: "", stock: "", brand: "", image: FALLBACK_IMAGE });

  useEffect(() => {
    if (!isEdit) return;
    const local = findLocalProduct(id, readLocalProductState());
    if (local) { setInitial(local); setForm({ title: local.title, description: local.description, category: local.category, price: String(local.price), stock: String(local.stock), brand: local.brand || "", image: local.thumbnail || local.images?.[0] || FALLBACK_IMAGE }); setLoading(false); return; }
    const controller = new AbortController();
    productApi.get(id, controller.signal).then((product) => { setInitial(product); setForm({ title: product.title, description: product.description, category: product.category, price: String(product.price), stock: String(product.stock), brand: product.brand || "", image: product.thumbnail || product.images?.[0] || FALLBACK_IMAGE }); }).catch((requestError) => { if (!controller.signal.aborted) setError(formatApiError(requestError)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, isEdit]);

  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!form.title.trim() || form.title.trim().length < 3) { setError("Product title must be at least 3 characters"); return; }
    if (!form.description.trim()) { setError("Add a short product description"); return; }
    if (!form.price || Number(form.price) <= 0) { setError("Price must be greater than 0"); return; }
    if (form.stock === "" || Number(form.stock) < 0) { setError("Stock cannot be negative"); return; }
    setError(""); setBusy(true);
    try {
      const payload = { title: form.title.trim(), description: form.description.trim(), category: form.category, price: Number(form.price), stock: Number(form.stock), brand: form.brand.trim() || "Meridian select", thumbnail: form.image || FALLBACK_IMAGE, images: [form.image || FALLBACK_IMAGE] };
      if (isEdit && initial) {
        const response = await productApi.update(initial.id, payload);
        const updated = { ...initial, ...response, ...payload, id: initial.id, images: response.images?.length ? response.images : payload.images, thumbnail: response.thumbnail || payload.thumbnail };
        saveUpdatedProduct(updated, readLocalProductState());
        setSaved(true);
        window.setTimeout(() => navigate(`/products/${initial.id}`), 650);
      } else {
        const response = await productApi.create(payload);
        const created = { ...response, ...payload, id: response.id || 9000 + Date.now() % 1000, images: response.images?.length ? response.images : payload.images, thumbnail: response.thumbnail || payload.thumbnail };
        saveCreatedProduct(created, readLocalProductState());
        setSaved(true);
        window.setTimeout(() => navigate(`/products/${created.id}`), 650);
      }
    } catch (requestError) { setError(formatApiError(requestError)); } finally { setBusy(false); }
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-7 w-40 rounded" /><div className="skeleton h-[520px] rounded-2xl" /></div>;
  return <div className="animate-enter max-w-4xl"><button type="button" onClick={() => navigate(isEdit && initial ? `/products/${initial.id}` : "/products")} className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-ink-muted hover:text-plum"><ArrowLeft className="h-4 w-4" /> Cancel and go back</button><div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-plum">Catalog / {isEdit ? "Edit product" : "New product"}</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em] text-ink">{isEdit ? "Refine the details" : "Add a new product"}<span className="text-plum">.</span></h1><p className="mt-2 text-sm text-ink-muted">{isEdit ? "Small details compound into a better customer experience." : "Give your next catalog addition a clear, considered home."}</p></div><Surface className="p-5 sm:p-8"><form onSubmit={submit}><div className="grid gap-7 lg:grid-cols-[1fr_0.68fr]"><div className="space-y-5"><div><label className="mb-2 block text-xs font-bold text-ink-soft">Product title <span className="text-plum">*</span></label><Field value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Linen lounge chair" /></div><div><label className="mb-2 block text-xs font-bold text-ink-soft">Description <span className="text-plum">*</span></label><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe what makes this product worth choosing…" rows={6} className="w-full resize-none rounded-xl border border-line bg-white px-3 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint focus:border-plum focus:ring-4 focus:ring-plum/10" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-ink-soft">Category</label><Select value={form.category} onChange={(event) => setField("category", event.target.value)} className="w-full"><option value="beauty">Beauty</option><option value="fragrances">Fragrances</option><option value="furniture">Furniture</option><option value="groceries">Groceries</option><option value="home-decoration">Home decoration</option><option value="kitchen-accessories">Kitchen accessories</option><option value="laptops">Laptops</option><option value="mens-shirts">Men's shirts</option><option value="mens-shoes">Men's shoes</option><option value="mobile-accessories">Mobile accessories</option><option value="smartphones">Smartphones</option><option value="sunglasses">Sunglasses</option><option value="tablets">Tablets</option><option value="tops">Tops</option><option value="vehicle">Vehicle</option><option value="womens-dresses">Women's dresses</option></Select></div><div><label className="mb-2 block text-xs font-bold text-ink-soft">Brand</label><Field value={form.brand} onChange={(event) => setField("brand", event.target.value)} placeholder="e.g. Meridian Studio" /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-ink-soft">Price <span className="text-plum">*</span></label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">$</span><Field type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} className="pl-7" placeholder="0.00" /></div></div><div><label className="mb-2 block text-xs font-bold text-ink-soft">Stock units <span className="text-plum">*</span></label><Field type="number" min="0" step="1" value={form.stock} onChange={(event) => setField("stock", event.target.value)} placeholder="0" /></div></div></div><div><label className="mb-2 block text-xs font-bold text-ink-soft">Product image URL</label><div className="overflow-hidden rounded-2xl border border-line bg-lilac"><div className="flex h-52 items-center justify-center bg-lilac p-4"><img src={form.image || FALLBACK_IMAGE} alt="Preview" className="h-full w-full object-contain mix-blend-multiply" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} /></div><div className="border-t border-line bg-white p-3"><Field value={form.image} onChange={(event) => setField("image", event.target.value)} placeholder="https://…" className="h-10 text-xs" /></div></div><p className="mt-2 text-[11px] leading-5 text-ink-faint">Use a public image URL. This demo keeps the product change in your browser session.</p></div></div>{error ? <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose/25 bg-rose-pale px-3 py-3 text-xs font-semibold leading-5 text-rose-dark"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}<div className="mt-8 flex flex-col-reverse justify-end gap-3 border-t border-line pt-6 sm:flex-row"><Button type="button" tone="outline" onClick={() => navigate(isEdit && initial ? `/products/${initial.id}` : "/products")}>Cancel</Button><Button type="submit" disabled={busy || saved}>{saved ? <><Check className="h-4 w-4" /> Saved</> : busy ? <><Spinner className="h-4 w-4" /> Saving</> : <>{isEdit ? "Save changes" : "Create product"} <ArrowUpDown className="h-4 w-4 rotate-90" /></>}</Button></div></form></Surface><p className="mt-4 text-[11px] text-ink-faint">DummyJSON confirms the request but does not persist mutations. Meridian mirrors successful add/edit/delete actions in local storage so the change remains visible during this session.</p></div>;
}

export { ProductListPage };
