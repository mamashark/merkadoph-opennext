import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { saveLegalPage } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { getLegalPages, LEGAL_PAGE_IDS, LEGAL_PAGES, type LegalPageId } from "@/lib/site-settings";
import { legalTemplate } from "@/lib/legal-defaults";
import { param } from "@/lib/content";
import { formatDate } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/page-header";
import { MarkdownEditor } from "@/components/blog/markdown-editor";
import { Alert, FlashMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, hintClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Legal pages" };

export default async function LegalPagesAdmin({ searchParams }: PageProps<"/admin/seo/legal">) {
	await requireAdmin();
	const params = await searchParams;
	const requested = param(params, "page") as LegalPageId;
	const id: LegalPageId = LEGAL_PAGE_IDS.includes(requested) ? requested : "privacy";
	const pages = await getLegalPages();
	const page = pages[id];
	const usingTemplate = !page.body.trim();

	return (
		<>
			<PageHeader
				title="Legal pages"
				description="Privacy policy, terms and cookie policy, linked from the footer of every page."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "SEO", href: "/admin/seo" }, { label: "Legal pages" }]}
			/>
			<div className="max-w-4xl space-y-4">
				<FlashMessage notice={param(params, "notice")} error={param(params, "error")} />

				<nav aria-label="Legal pages" className="flex flex-wrap gap-2">
					{LEGAL_PAGE_IDS.map((p) => (
						<Link key={p} href={`/admin/seo/legal?page=${p}`} aria-current={p === id ? "page" : undefined} className={buttonClass(p === id ? "primary" : "secondary", "sm")}>
							{LEGAL_PAGES[p].title}
						</Link>
					))}
				</nav>

				{usingTemplate && (
					<Alert tone="warning">
						This page is showing the starter template. It describes how this site works, but it isn&apos;t legal advice: review it (ideally with an advisor), adjust it, then save.
						Placeholders like <code>{"{{email}}"}</code> are filled in from SEO → Business information.
					</Alert>
				)}

				<form action={saveLegalPage} className={cn(cardClass, "space-y-4 p-5")}>
					<input type="hidden" name="page" value={id} />
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="font-semibold text-slate-900 dark:text-white">{LEGAL_PAGES[id].title}</h2>
						<a href={LEGAL_PAGES[id].path} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")}>
							View page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
						</a>
					</div>
					{/* key resets the editor when switching pages */}
					<MarkdownEditor key={id} name="body" defaultValue={page.body || legalTemplate(id)} required />
					<p className={hintClass}>
						Placeholders: <code>{"{{business}}"}</code>, <code>{"{{legal_name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{phone}}"}</code>, <code>{"{{address}}"}</code>.
						{page.updated_at ? ` Last saved ${formatDate(page.updated_at, { dateStyle: "medium", timeStyle: "short" })}.` : ""}
					</p>
					<div className="flex justify-end">
						<SubmitButton pendingLabel="Saving…">Save {LEGAL_PAGES[id].title.toLowerCase()}</SubmitButton>
					</div>
				</form>
			</div>
		</>
	);
}
