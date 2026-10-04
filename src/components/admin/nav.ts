import { BriefcaseBusiness, CalendarDays, Database, FileText, Images, Inbox, LayoutDashboard, ShoppingBag, TicketPercent, Users, Zap, type LucideIcon } from "lucide-react";

export type NavLeaf = { label: string; href: string };
export type NavItem = { label: string; icon: LucideIcon; href?: string; children?: NavLeaf[] };
export type NavSection = { title: string; items: NavItem[] };

export const adminNav: NavSection[] = [
	{
		title: "Overview",
		items: [
			{ label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
			{ label: "Inbox", icon: Inbox, href: "/admin/inbox" },
		],
	},
	{
		title: "Content",
		items: [
			{
				label: "Blogs",
				icon: FileText,
				children: [
					{ label: "All posts", href: "/admin/blogs" },
					{ label: "New post", href: "/admin/blogs/new" },
				],
			},
			{
				label: "Events",
				icon: CalendarDays,
				children: [
					{ label: "All events", href: "/admin/events" },
					{ label: "New event", href: "/admin/events/new" },
				],
			},
			{
				label: "Promotions",
				icon: TicketPercent,
				children: [
					{ label: "All promotions", href: "/admin/promotions" },
					{ label: "New promotion", href: "/admin/promotions/new" },
				],
			},
			{
				label: "Services",
				icon: BriefcaseBusiness,
				children: [
					{ label: "All services", href: "/admin/services" },
					{ label: "New service", href: "/admin/services/new" },
				],
			},
			{ label: "Media", icon: Images, href: "/admin/media" },
		],
	},
	{
		title: "Shop",
		items: [
			{
				label: "Shop",
				icon: ShoppingBag,
				children: [
					{ label: "Overview & settings", href: "/admin/shop" },
					{ label: "Products", href: "/admin/shop/products" },
					{ label: "Add product", href: "/admin/shop/products/new" },
					{ label: "Categories", href: "/admin/shop/categories" },
					{ label: "Tags", href: "/admin/shop/tags" },
					{ label: "Orders", href: "/admin/shop/orders" },
					{ label: "Payments", href: "/admin/shop/payments" },
				],
			},
		],
	},
	{
		title: "Settings",
		items: [
			{
				label: "Users",
				icon: Users,
				children: [
					{ label: "All users", href: "/admin/users" },
					{ label: "Add user", href: "/admin/users/new" },
				],
			},
			{ label: "Supabase", icon: Database, href: "/admin/supabase" },
			{ label: "Cache", icon: Zap, href: "/admin/cache" },
		],
	},
];

/** Every link in the nav, used to pick the single most specific match for the current path. */
const allHrefs = adminNav.flatMap((s) => s.items.flatMap((i) => (i.children ? i.children.map((c) => c.href) : i.href ? [i.href] : [])));

export function activeHref(pathname: string): string | undefined {
	return allHrefs
		.filter((href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/")))
		.sort((a, b) => b.length - a.length)[0];
}
