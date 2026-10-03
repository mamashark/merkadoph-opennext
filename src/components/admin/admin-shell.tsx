"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, X } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { activeHref, adminNav, type NavItem } from "./nav";
import { useViewport } from "./use-viewport";
import { cn } from "@/lib/ui";

export const SIDEBAR_COOKIE = "admin-sidebar-collapsed";

type ShellUser = { id: string; name: string; email: string; role: string };

export function AdminShell({ user, defaultCollapsed, children }: { user: ShellUser; defaultCollapsed: boolean; children: React.ReactNode }) {
	const pathname = usePathname();
	const viewport = useViewport();
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	// `open` = drawer on mobile, expanded overlay on tablet / collapsed desktop.
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);

	const current = activeHref(pathname);
	const parentOf = (path?: string) => adminNav.flatMap((s) => s.items).find((i) => i.children?.some((c) => c.href === path))?.label;
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set([parentOf(current)].filter(Boolean) as string[]));

	// Close the drawer and reveal the active section whenever the route changes.
	const [lastPath, setLastPath] = useState(pathname);
	if (lastPath !== pathname) {
		setLastPath(pathname);
		setOpen(false);
		setQuery("");
		const parent = parentOf(current);
		if (parent && !expanded.has(parent)) setExpanded(new Set(expanded).add(parent));
	}

	const mini = viewport === "tablet" ? !open : viewport === "desktop" ? collapsed && !open : false;
	const overlay = open && (viewport !== "desktop" || collapsed);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				if (mini || viewport === "mobile") setOpen(true);
				requestAnimationFrame(() => searchRef.current?.focus());
			}
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [mini, viewport]);

	const toggleCollapsed = () => {
		if (viewport !== "desktop") return setOpen((v) => !v);
		const next = !collapsed;
		setCollapsed(next);
		setOpen(false);
		document.cookie = `${SIDEBAR_COOKIE}=${next ? 1 : 0}; path=/admin; max-age=31536000; samesite=lax`;
	};

	const sections = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return adminNav;
		return adminNav
			.map((s) => ({
				...s,
				items: s.items
					.map((i) => (i.label.toLowerCase().includes(q) ? i : { ...i, children: i.children?.filter((c) => c.label.toLowerCase().includes(q)) }))
					.filter((i) => i.label.toLowerCase().includes(q) || (i.children?.length ?? 0) > 0),
			}))
			.filter((s) => s.items.length > 0);
	}, [query]);

	const toggleGroup = (label: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(label)) next.delete(label);
			else next.add(label);
			return next;
		});

	const initials = user.name
		.split(/\s+/)
		.map((p) => p[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		<div className="min-h-dvh bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			{/* Backdrop for drawer / overlay modes */}
			<div
				aria-hidden
				onClick={() => setOpen(false)}
				className={cn("fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] transition-opacity", overlay ? "opacity-100" : "pointer-events-none opacity-0")}
			/>

			<aside
				aria-label="Admin navigation"
				className={cn(
					"fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0F172A] text-slate-300 shadow-xl transition-[width,transform] duration-200 ease-out",
					mini ? "w-[72px]" : "w-[260px]",
					viewport === "mobile" && !open && "-translate-x-full",
				)}
			>
				{/* Brand + collapse toggle */}
				<div className={cn("flex h-16 shrink-0 items-center border-b border-white/5", mini ? "justify-center px-2" : "justify-between px-4")}>
					<Link href="/admin" className="flex min-w-0 items-center gap-3" title="Merkado PH admin">
						<Image src="/apple-touch-icon.png" alt="" width={36} height={36} loading="eager" className="h-9 w-9 shrink-0 rounded-lg bg-white" />
						{!mini && (
							<span className="min-w-0 leading-tight">
								<span className="block truncate font-semibold tracking-wide text-white">MERKADO PH</span>
								<span className="block text-xs text-slate-400">Admin console</span>
							</span>
						)}
					</Link>
					{viewport === "mobile" ? (
						<button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close menu">
							<X className="h-5 w-5" />
						</button>
					) : (
						!mini && (
							<button
								type="button"
								onClick={toggleCollapsed}
								className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
								aria-label="Collapse sidebar"
								title="Collapse sidebar"
							>
								<PanelLeftClose className="h-5 w-5" />
							</button>
						)
					)}
				</div>

				{/* Quick filter */}
				<div className={cn("shrink-0 pt-4", mini ? "px-3" : "px-4")}>
					{mini ? (
						<button
							type="button"
							onClick={() => {
								setOpen(true);
								requestAnimationFrame(() => searchRef.current?.focus());
							}}
							className="group relative flex h-10 w-full items-center justify-center rounded-lg bg-[#1E293B] text-slate-400 hover:text-white"
							aria-label="Search menu (Ctrl+K)"
						>
							<Search className="h-4 w-4" />
							<Tooltip>Search · Ctrl K</Tooltip>
						</button>
					) : (
						<label className="flex h-10 items-center gap-2 rounded-lg bg-[#1E293B] px-3 text-sm ring-teal-500/40 focus-within:ring-2">
							<Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
							<input
								ref={searchRef}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search menu"
								aria-label="Search menu"
								className="w-full min-w-0 bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-none"
							/>
							<kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 text-[10px] font-medium text-slate-400 sm:inline">Ctrl K</kbd>
						</label>
					)}
				</div>

				{/* Navigation */}
				<nav className={cn("flex-1 py-4", mini ? "overflow-visible px-3" : "overflow-y-auto px-3")}>
					{sections.length === 0 && <p className="px-3 text-sm text-slate-400">No matches for “{query}”.</p>}
					{sections.map((section) => (
						<div key={section.title} className="mb-5 last:mb-0">
							{mini ? (
								<div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden />
							) : (
								<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>
							)}
							<ul className="space-y-1">
								{section.items.map((item) => (
									<NavEntry
										key={item.label}
										item={item}
										mini={mini}
										current={current}
										expanded={!!query || expanded.has(item.label)}
										onToggle={() => toggleGroup(item.label)}
									/>
								))}
							</ul>
						</div>
					))}
				</nav>

				{/* Profile + quick actions */}
				<div className={cn("shrink-0 border-t border-white/5 p-3", mini && "flex flex-col items-center gap-2")}>
					{mini ? (
						<>
							<Link href={`/admin/users/${user.id}`} className="group relative" aria-label="Account settings">
								<Avatar initials={initials} />
								<Tooltip>{user.name}</Tooltip>
							</Link>
							<button
								type="button"
								onClick={toggleCollapsed}
								className="group relative rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
								aria-label="Expand sidebar"
							>
								<PanelLeftOpen className="h-5 w-5" />
								<Tooltip>Expand</Tooltip>
							</button>
						</>
					) : (
						<div className="flex items-center gap-3 rounded-lg bg-[#1E293B] p-2.5">
							<Avatar initials={initials} />
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<p className="truncate text-sm font-medium text-white">{user.name}</p>
									<span className="rounded-full bg-teal-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-teal-300">
										{user.role}
									</span>
								</div>
								<p className="truncate text-xs text-slate-400">{user.email}</p>
							</div>
							<Link
								href={`/admin/users/${user.id}`}
								className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
								aria-label="Account settings"
								title="Account settings"
							>
								<Settings className="h-4 w-4" />
							</Link>
							<form action={signOut}>
								<button type="submit" className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300" aria-label="Sign out" title="Sign out">
									<LogOut className="h-4 w-4" />
								</button>
							</form>
						</div>
					)}
				</div>
			</aside>

			<div
				className={cn(
					"flex min-h-dvh flex-col transition-[padding] duration-200",
					viewport === "tablet" && "pl-[72px]",
					viewport === "desktop" && (collapsed ? "pl-[72px]" : "pl-[260px]"),
				)}
			>
				<header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 dark:border-slate-800 dark:bg-slate-950/85 px-4 backdrop-blur sm:px-6">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
						aria-label="Open menu"
					>
						<Menu className="h-5 w-5" />
					</button>
					<HeaderTitle current={current} />
					<div className="ml-auto flex items-center gap-1">
						<Link href="/admin/blogs/new" className="hidden items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:inline-flex">
							<Plus className="h-4 w-4" /> New post
						</Link>
						<a
							href="/blogs"
							target="_blank"
							rel="noreferrer"
							className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							aria-label="View public blog"
							title="View public blog"
						>
							<ExternalLink className="h-5 w-5" />
						</a>
						<form action={signOut} className="md:hidden">
							<button type="submit" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Sign out">
								<LogOut className="h-5 w-5" />
							</button>
						</form>
					</div>
				</header>

				<main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
					<div className="mx-auto w-full max-w-6xl">{children}</div>
				</main>

				<footer className="border-t border-slate-200 px-4 py-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:px-6 lg:px-8">
					<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
						<p>© {new Date().getFullYear()} Merkado PH. All rights reserved.</p>
						<div className="flex gap-4">
							<a href="/blogs" className="hover:text-slate-900 dark:hover:text-white">
								Public blog
							</a>
							<Link href="/" className="hover:text-slate-900 dark:hover:text-white">
								Home
							</Link>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}

function NavEntry({ item, mini, current, expanded, onToggle }: { item: NavItem; mini: boolean; current?: string; expanded: boolean; onToggle: () => void }) {
	const Icon = item.icon;
	const childActive = item.children?.some((c) => c.href === current) ?? false;
	const active = item.href === current || childActive;

	const base = "group relative flex h-10 w-full items-center rounded-lg text-sm font-medium transition-colors";
	const tone = active ? "bg-teal-500/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white";
	const indicator = active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-teal-400" aria-hidden />;

	if (mini) {
		return (
			<li>
				<Link href={item.href ?? item.children![0].href} className={cn(base, tone, "justify-center")} aria-label={item.label}>
					{indicator}
					<Icon className="h-5 w-5" aria-hidden />
					<Tooltip>{item.label}</Tooltip>
				</Link>
			</li>
		);
	}

	if (!item.children) {
		return (
			<li>
				<Link href={item.href!} className={cn(base, tone, "gap-3 px-3")} aria-current={active ? "page" : undefined}>
					{indicator}
					<Icon className="h-5 w-5 shrink-0" aria-hidden />
					{item.label}
				</Link>
			</li>
		);
	}

	return (
		<li>
			<button type="button" onClick={onToggle} className={cn(base, tone, "gap-3 px-3")} aria-expanded={expanded}>
				{indicator}
				<Icon className="h-5 w-5 shrink-0" aria-hidden />
				<span className="flex-1 text-left">{item.label}</span>
				<ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
			</button>
			<div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
				<ul className="overflow-hidden">
					{item.children.map((child) => {
						const isCurrent = child.href === current;
						return (
							<li key={child.href}>
								<Link
									href={child.href}
									tabIndex={expanded ? undefined : -1}
									aria-current={isCurrent ? "page" : undefined}
									className={cn(
										"ml-[22px] flex h-9 items-center border-l pl-[22px] text-sm transition-colors",
										isCurrent ? "border-teal-400 font-medium text-teal-300" : "border-white/10 text-slate-400 hover:border-slate-400 hover:text-white",
									)}
								>
									{child.label}
								</Link>
							</li>
						);
					})}
				</ul>
			</div>
		</li>
	);
}

function Tooltip({ children }: { children: React.ReactNode }) {
	return (
		<span
			role="tooltip"
			className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
		>
			{children}
		</span>
	);
}

function Avatar({ initials }: { initials: string }) {
	return (
		<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-orange-400 text-xs font-bold text-slate-950">
			{initials}
		</span>
	);
}

function HeaderTitle({ current }: { current?: string }) {
	const pathname = usePathname();
	const leaf = adminNav.flatMap((s) => s.items).flatMap((i) => (i.children ? i.children.map((c) => ({ ...c, parent: i.label })) : [{ label: i.label, href: i.href!, parent: "" }]));
	const match = leaf.find((l) => l.href === current);
	const parent = match?.parent || match?.label || "Admin";
	const isEdit = /\/(edit|[0-9a-f-]{36})$/.test(pathname);

	return (
		<div className="min-w-0 text-sm">
			<span className="text-slate-600 dark:text-slate-400">{parent}</span>
			{match?.parent && (
				<>
					<span className="mx-1.5 text-slate-400 dark:text-slate-600">/</span>
					<span className="font-medium text-slate-900 dark:text-white">{isEdit ? "Edit" : match.label}</span>
				</>
			)}
		</div>
	);
}
