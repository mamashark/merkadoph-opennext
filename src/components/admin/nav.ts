import { BriefcaseBusiness, CalendarDays, FileText, Images, LayoutDashboard, TicketPercent, Users, type LucideIcon } from "lucide-react";

export type NavLeaf = { label: string; href: string };
export type NavItem = { label: string; icon: LucideIcon; href?: string; children?: NavLeaf[] };
export type NavSection = { title: string; items: NavItem[] };

export const adminNav: NavSection[] = [
	{
		title: "Overview",
		items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/admin" }],
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
