import { useEffect, useMemo, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { Button } from "./components/ui";
import { ProductDetailPage, ProductFormPage, ProductListPage } from "./pages/Products";
import { LoginPage } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import type { Product } from "./lib/api";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Products", href: "/products", icon: Boxes },
  { label: "Categories", href: "/products?view=categories", icon: Tags },
];

function isLoggedIn() {
  return Boolean(window.localStorage.getItem("pa_access_token"));
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isProductArea = location.startsWith("/products");

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const logout = () => {
    window.localStorage.removeItem("pa_access_token");
    window.localStorage.removeItem("pa_user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-white/90 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${collapsed ? "w-[88px]" : "w-[252px]"}`}
      >
        <SidebarContent collapsed={collapsed} onLogout={logout} />
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-ink-muted shadow-sm transition hover:text-plum"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/25 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[275px] flex-col border-r border-line bg-white shadow-2xl">
            <button className="absolute right-4 top-5 text-ink-muted" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            <SidebarContent onLogout={logout} />
          </aside>
        </div>
      ) : null}

      <div className={`min-h-screen transition-[padding] duration-300 ${collapsed ? "lg:pl-[88px]" : "lg:pl-[252px]"}`}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="rounded-xl p-2 text-ink-muted hover:bg-lilac lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <div className="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
              <span className="font-medium">Workspace</span><span className="text-ink-faint">/</span><span className="font-semibold text-ink">{isProductArea ? "Products" : "Overview"}</span>
            </div>
            <div className="sm:hidden font-display text-lg font-bold text-ink">Meridian <span className="text-plum">/</span> {isProductArea ? "Products" : "Overview"}</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" className="relative rounded-xl p-2.5 text-ink-muted transition hover:bg-lilac hover:text-plum" aria-label="Notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-plum ring-2 ring-canvas" /></button>
            <div className="hidden h-6 w-px bg-line sm:block" />
            <button type="button" className="flex items-center gap-2 rounded-xl py-1.5 pl-1 transition hover:bg-lilac/60">
              <img src="https://dummyjson.com/icon/emilys/48" alt="Emily Johnson" className="h-8 w-8 rounded-xl bg-lilac object-cover" />
              <span className="hidden text-left sm:block"><span className="block text-xs font-bold text-ink">Emily Johnson</span><span className="block text-[11px] text-ink-muted">Admin account</span></span>
              <ChevronDown className="mr-1 hidden h-4 w-4 text-ink-faint sm:block" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ collapsed = false, onLogout }: { collapsed?: boolean; onLogout: () => void }) {
  const [location] = useLocation();
  const user = useMemo(() => {
    try { return JSON.parse(window.localStorage.getItem("pa_user") || "{}"); } catch { return {}; }
  }, []);

  return (
    <>
      <div className={`flex h-[76px] items-center border-b border-line ${collapsed ? "justify-center px-4" : "px-6"}`}>
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-white shadow-[0_7px_18px_rgba(31,29,47,0.2)] transition group-hover:rotate-[-5deg]"><Sparkles className="h-4 w-4" /></span>
          {!collapsed ? <span className="font-display text-[19px] font-bold tracking-[-0.04em] text-ink">meridian<span className="text-plum">.</span></span> : null}
        </Link>
      </div>
      <div className={`flex flex-1 flex-col ${collapsed ? "px-3" : "px-4"}`}>
        {!collapsed ? <p className="mb-3 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">Workspace</p> : <div className="h-8" />}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = item.href === "/" ? location === "/" : location.startsWith(item.href.split("?")[0]);
            const Icon = item.icon;
            return <Link key={item.label} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-lilac text-plum" : "text-ink-muted hover:bg-lilac/60 hover:text-ink"}`} title={collapsed ? item.label : undefined}><Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-plum" : "text-ink-faint group-hover:text-plum"}`} />{!collapsed ? <span>{item.label}</span> : null}{!collapsed && item.label === "Products" ? <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[10px] text-ink-faint">194</span> : null}</Link>;
          })}
        </nav>
        {!collapsed ? <p className="mb-3 mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">Manage</p> : <div className="mt-8 h-px bg-line" />}
        <nav className="space-y-1.5">
          {[
            ["Analytics", BarChart3],
            ["Settings", Settings],
            ["Help center", CircleHelp],
          ].map(([label, Icon]) => <button key={String(label)} type="button" onClick={() => window.alert(`${String(label)} is coming soon.`)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink-muted transition hover:bg-lilac/60 hover:text-ink" title={collapsed ? String(label) : undefined}><Icon className="h-[18px] w-[18px] shrink-0 text-ink-faint group-hover:text-plum" />{!collapsed ? <span>{String(label)}</span> : null}</button>)}
        </nav>
        <div className="mt-auto pb-5 pt-8">
          {!collapsed ? <div className="mb-4 rounded-2xl bg-ink p-4 text-white"><div className="mb-3 flex items-center justify-between"><ShieldCheck className="h-4 w-4 text-peach" /><span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white/60">Pro</span></div><p className="text-xs font-bold">Your workspace is healthy</p><p className="mt-1 text-[11px] leading-5 text-white/55">Catalog sync is active and ready for your next launch.</p></div> : null}
          <button type="button" onClick={onLogout} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink-muted transition hover:bg-rose-pale hover:text-rose-dark ${collapsed ? "justify-center" : ""}`} title={collapsed ? "Sign out" : undefined}><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed ? <span>Sign out</span> : null}</button>
          {!collapsed ? <div className="mt-4 flex items-center gap-2 border-t border-line pt-4"><img src={`https://dummyjson.com/icon/${user.username || "emilys"}/40`} alt="" className="h-8 w-8 rounded-lg bg-lilac" /><div className="min-w-0"><p className="truncate text-xs font-bold text-ink">{user.firstName || "Emily"} {user.lastName || "Johnson"}</p><p className="text-[11px] text-ink-muted">Owner</p></div></div> : null}
        </div>
      </div>
    </>
  );
}

function OverviewPage() {
  const [, navigate] = useLocation();
  return <div className="animate-enter"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-plum"><span className="h-1.5 w-1.5 rounded-full bg-plum" /> Tuesday, September 23, 2026</p><h1 className="font-display text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">Good morning, Emily<span className="text-plum">.</span></h1><p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">Here’s a clear view of your catalog. Keep your best products moving and your shelves intentional.</p></div><Button onClick={() => navigate("/products/new")}><Plus className="h-4 w-4" /> Add product</Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total products","194","+12.4%","from-plum to-[#9b87cf]",Boxes],["In stock","181","+8.2%","from-[#3c9882] to-[#7bb9a4]",PackageSearch],["Low stock","13","-2.1%","from-[#d49b55] to-[#e6bd7f]",Bell],["Catalog value","$48,290","+18.7%","from-[#cc7781] to-[#e5a4a8]",BarChart3]].map(([label,value,change,gradient,Icon]) => <div key={String(label)} className="group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-[0_14px_40px_rgba(46,40,66,0.05)]"><div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br ${String(gradient)} opacity-15 blur-2xl transition group-hover:scale-125`} /><div className="relative flex items-start justify-between"><div><p className="text-xs font-semibold text-ink-muted">{String(label)}</p><p className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-ink">{String(value)}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-lilac text-plum"><Icon className="h-4 w-4" /></span></div><p className={`relative mt-4 text-[11px] font-bold ${String(change).startsWith("-") ? "text-rose-dark" : "text-mint-dark"}`}>{String(change)} <span className="font-medium text-ink-faint">vs last month</span></p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]"><div className="rounded-2xl bg-ink p-6 text-white shadow-[0_18px_40px_rgba(31,29,47,0.13)] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-peach">Catalog pulse</p><h2 className="mt-3 max-w-md font-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl">A healthy catalog is a quiet superpower.</h2><p className="mt-3 max-w-md text-sm leading-6 text-white/55">Your team has added 12 products this month. You’re 6 products away from hitting your quarterly goal.</p></div><span className="hidden h-12 w-12 place-items-center rounded-2xl bg-white/10 sm:grid"><Sparkles className="h-5 w-5 text-peach" /></span></div><div className="mt-8"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-white/70">Quarterly goal</span><span className="font-bold text-peach">78%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-peach" /></div></div><button type="button" onClick={() => navigate("/products")} className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-peach transition hover:gap-3">Review catalog <span>→</span></button></div><div className="rounded-2xl border border-line bg-white p-6 shadow-[0_14px_40px_rgba(46,40,66,0.05)]"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-ink-muted">Category mix</p><h2 className="mt-1 font-display text-xl font-bold tracking-[-0.03em] text-ink">What’s selling</h2></div><button type="button" className="rounded-lg p-2 text-ink-faint hover:bg-lilac hover:text-plum" onClick={() => navigate("/products?view=categories")}><ChevronDown className="h-4 w-4 rotate-[-90deg]" /></button></div><div className="mt-5 space-y-4">{[["Beauty", "32%", "bg-plum"],["Furniture", "24%", "bg-mint"],["Groceries", "18%", "bg-peach"],["Technology", "15%", "bg-rose"],["Other", "11%", "bg-ink-faint"]].map(([label,percent,color]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-ink-soft">{String(label)}</span><span className="font-bold text-ink-muted">{String(percent)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-lilac"><div className={`h-full rounded-full ${String(color)}`} style={{ width: String(percent) }} /></div></div>)}</div></div></div></div>;
}

function ProtectedApp() {
  return <AppShell><Switch><Route path="/" component={OverviewPage} /><Route path="/products/new" component={ProductFormPage} /><Route path="/products/:id/edit" component={ProductFormPage} /><Route path="/products/:id" component={ProductDetailPage} /><Route path="/products" component={ProductListPage} /><Route component={NotFound} /></Switch></AppShell>;
}

export default function App() {
  const [location] = useLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  if (location === "/login") return <LoginPage />;
  if (!isLoggedIn()) return <LoginPage />;
  return <ProtectedApp />;
}

export type { Product };
