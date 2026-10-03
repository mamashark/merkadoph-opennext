import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, FilePen, FileText, Images, Plus, TicketPercent, Upload, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminListBlogs } from "@/lib/blogs";
import { adminCount } from "@/lib/content-server";
import { adminListEvents } from "@/lib/events";
import { formatDate } from "@/lib/datetime";
import { listUsers } from "@/lib/users";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert } from "@/components/ui/alert";
import { StagingCard } from "@/components/admin/staging-card";
import { buttonClass, cardClass, cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Dashboard" };

const settle = <T,>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v })).catch(() => ({ ok: false as const }));

export default async function DashboardPage() {
	const me = await requireAdmin();

	const [blogs, blogsLive, events, promos, services, recent, upcoming, users] = await Promise.all([
		settle(adminCount("blogs")),
		settle(adminCount("blogs", true)),
		settle(adminCount("events", true)),
		settle(adminCount("promotions", true)),
		settle(adminCount("services", true)),
		settle(adminListBlogs({ perPage: 5 })),
		settle(adminListEvents({ when: "upcoming", sort: "start", perPage: 50 })),
		settle(listUsers()),
	]);

	const missingTables = !events.ok || !promos.ok || !services.ok;
	const upcomingEvents = upcoming.ok ? [...upcoming.v.rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 4) : [];

	const stats = [
		{ label: "Blog posts", value: blogs.ok ? blogs.v : "—", hint: blogsLive.ok ? `${blogsLive.v} live` : "", icon: FileText, href: "/admin/blogs", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
		{ label: "Live events", value: events.ok ? events.v : "—", hint: "", icon: CalendarDays, href: "/admin/events", tone: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
		{ label: "Live promotions", value: promos.ok ? promos.v : "—", hint: "", icon: TicketPercent, href: "/admin/promotions", tone: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
		{ label: "Live services", value: services.ok ? services.v : "—", hint: "", icon: BriefcaseBusiness, href: "/admin/services", tone: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
	];

	return (
		<>
			<PageHeader
				title={`Welcome back, ${me.name.split(" ")[0]}`}
				description="Here's what's happening with Merkado PH."
				actions={
					<Link href="/admin/blogs/new" className={buttonClass("primary")}>
						<Plus className="h-4 w-4" aria-hidden /> New post
					</Link>
				}
			/>

			<StagingCard />

			{missingTables && (
				<div className="mb-6">
					<Alert tone="error">
						Some content tables aren&apos;t reachable yet. Run the SQL files in <code className="rounded bg-red-100 px-1 dark:bg-red-900">supabase/migrations</code> in the Supabase SQL editor,
						then refresh.
					</Alert>
				</div>
			)}

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{stats.map(({ label, value, hint, icon: Icon, href, tone }) => (
					<Link key={label} href={href} className={`${cardClass} block p-5 transition hover:border-slate-300 dark:hover:border-slate-700`}>
						<div className="flex items-center justify-between">
							<p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
							<span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tone)}>
								<Icon className="h-5 w-5" aria-hidden />
							</span>
						</div>
						<p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
						{hint && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</p>}
					</Link>
				))}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-3">
				<section className={`${cardClass} lg:col-span-2`}>
					<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
						<h2 className="font-semibold text-slate-900 dark:text-white">Recent posts</h2>
						<Link href="/admin/blogs" className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
							View all <ArrowRight className="h-4 w-4" aria-hidden />
						</Link>
					</div>
					{!recent.ok || recent.v.blogs.length === 0 ? (
						<p className="px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-400">No posts yet.</p>
					) : (
						<ul className="divide-y divide-slate-100 dark:divide-slate-800">
							{recent.v.blogs.map((blog) => (
								<li key={blog.id}>
									<Link href={`/admin/blogs/${blog.id}/edit`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-slate-900 dark:text-white">{blog.title}</p>
											<p className="text-xs text-slate-600 dark:text-slate-400">Updated {formatDate(blog.updated_at)}</p>
										</div>
										<StatusBadge row={blog} />
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>

				<div className="space-y-6">
					<section className={cardClass}>
						<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
							<h2 className="font-semibold text-slate-900 dark:text-white">Upcoming events</h2>
							<Link href="/admin/events?when=upcoming" className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
								All
							</Link>
						</div>
						{upcomingEvents.length === 0 ? (
							<p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-400">Nothing scheduled.</p>
						) : (
							<ul className="divide-y divide-slate-100 dark:divide-slate-800">
								{upcomingEvents.map((e) => (
									<li key={e.id}>
										<Link href={`/admin/events/${e.id}/edit`} className="block px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
											<p className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.title}</p>
											<p className="text-xs text-slate-600 dark:text-slate-400">{formatDate(e.starts_at, { dateStyle: "medium", timeStyle: "short" })}</p>
										</Link>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className={cardClass}>
						<h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">Quick actions</h2>
						<div className="space-y-1 p-3">
							{[
								{ href: "/admin/blogs/new", label: "Write a post", icon: FilePen },
								{ href: "/admin/events/new", label: "Create an event", icon: CalendarDays },
								{ href: "/admin/promotions/new", label: "Launch a promotion", icon: TicketPercent },
								{ href: "/admin/media", label: "Upload media", icon: Upload },
								{ href: "/admin/media", label: "Browse media", icon: Images },
								{ href: "/admin/users/new", label: `Invite a teammate${users.ok ? ` (${users.v.filter((u) => u.hasAccess).length} admins)` : ""}`, icon: Users },
							].map(({ href, label, icon: Icon }) => (
								<Link key={label} href={href} className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60">
									<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
										<Icon className="h-4 w-4" aria-hidden />
									</span>
									{label}
								</Link>
							))}
						</div>
					</section>
				</div>
			</div>
		</>
	);
}
