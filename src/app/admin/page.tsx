import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, FilePen, FileText, Images, Plus, Upload, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminBlogCounts, adminListBlogs, formatDate } from "@/lib/blogs";
import { listUsers } from "@/lib/users";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClass, cardClass, cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
	const me = await requireAdmin();

	const [blogStats, recent, users] = await Promise.allSettled([adminBlogCounts(), adminListBlogs({ perPage: 5 }), listUsers()]);
	const counts = blogStats.status === "fulfilled" ? blogStats.value : null;
	const recentBlogs = recent.status === "fulfilled" ? recent.value.blogs : [];
	const userCount = users.status === "fulfilled" ? users.value.filter((u) => u.hasAccess).length : 0;

	const stats = [
		{ label: "Total posts", value: counts?.total ?? "—", icon: FileText, tone: "bg-slate-100 text-slate-600" },
		{ label: "Published", value: counts?.published ?? "—", icon: FileCheck2, tone: "bg-teal-50 text-teal-600" },
		{ label: "Drafts", value: counts?.drafts ?? "—", icon: FilePen, tone: "bg-amber-50 text-amber-600" },
		{ label: "Admin users", value: userCount, icon: Users, tone: "bg-orange-50 text-orange-600" },
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

			{blogStats.status === "rejected" && (
				<div className="mb-6">
					<Alert tone="error">
						The blogs table isn&apos;t reachable yet. Run <code className="rounded bg-red-100 px-1">supabase/migrations/20261003000000_create_blogs.sql</code> in the Supabase SQL
						editor, then refresh.
					</Alert>
				</div>
			)}

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{stats.map(({ label, value, icon: Icon, tone }) => (
					<div key={label} className={`${cardClass} p-5`}>
						<div className="flex items-center justify-between">
							<p className="text-sm text-slate-500">{label}</p>
							<span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tone)}>
								<Icon className="h-5 w-5" aria-hidden />
							</span>
						</div>
						<p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
					</div>
				))}
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-3">
				<section className={`${cardClass} lg:col-span-2`}>
					<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
						<h2 className="font-semibold text-slate-900">Recent posts</h2>
						<Link href="/admin/blogs" className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
							View all <ArrowRight className="h-4 w-4" aria-hidden />
						</Link>
					</div>
					{recentBlogs.length === 0 ? (
						<p className="px-5 py-10 text-center text-sm text-slate-500">No posts yet.</p>
					) : (
						<ul className="divide-y divide-slate-100">
							{recentBlogs.map((blog) => (
								<li key={blog.id}>
									<Link href={`/admin/blogs/${blog.id}/edit`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-slate-900">{blog.title}</p>
											<p className="text-xs text-slate-500">Updated {formatDate(blog.updated_at)}</p>
										</div>
										<span
											className={cn(
												"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
												blog.status === "published" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600",
											)}
										>
											{blog.status === "published" ? "Published" : "Draft"}
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>

				<section className={cardClass}>
					<h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Quick actions</h2>
					<div className="space-y-2 p-3">
						{[
							{ href: "/admin/blogs/new", label: "Write a new post", hint: "Draft or publish a story", icon: FilePen },
							{ href: "/admin/media", label: "Upload media", hint: "Add images to the library", icon: Upload },
							{ href: "/admin/media", label: "Browse media", hint: "Copy URLs, tidy folders", icon: Images },
							{ href: "/admin/users/new", label: "Invite a teammate", hint: "Create an admin account", icon: Users },
						].map(({ href, label, hint, icon: Icon }) => (
							<Link key={label} href={href} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50">
								<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
									<Icon className="h-4 w-4" aria-hidden />
								</span>
								<span>
									<span className="block text-sm font-medium text-slate-900">{label}</span>
									<span className="block text-xs text-slate-500">{hint}</span>
								</span>
							</Link>
						))}
					</div>
				</section>
			</div>
		</>
	);
}
