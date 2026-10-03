import { Globe, Save, Send, Trash2, Undo2 } from "lucide-react";
import { contentState, type ContentStatus } from "@/lib/content";
import { formatDate, toDateTimeInput } from "@/lib/datetime";
import { MarkdownEditor } from "@/components/blog/markdown-editor";
import { MediaField } from "@/components/media/media-field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "./status-badge";
import { cardClass, cn, hintClass, inputClass, labelClass } from "@/lib/ui";

/* Server-rendered building blocks shared by every content form (blogs, events, promotions, services).
   Only the editor, media field and submit buttons hydrate. */

type Base = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	cover_image_url: string | null;
	cover_image_alt: string | null;
	tags: string[];
	meta_title: string | null;
	meta_description: string | null;
	status: ContentStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export function FormCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn(cardClass, className)}>
			<h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">{title}</h2>
			<div className="space-y-4 p-5">{children}</div>
		</section>
	);
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div>
			<label htmlFor={id} className={labelClass}>
				{label}
			</label>
			{children}
			{hint && <p className={hintClass}>{hint}</p>}
		</div>
	);
}

/** Two-column form shell: main fields left, publishing sidebar right. */
export function ContentForm({ action, id, main, aside }: { action: (fd: FormData) => Promise<void>; id?: string; main: React.ReactNode; aside: React.ReactNode }) {
	return (
		<form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			{id && <input type="hidden" name="id" value={id} />}
			<div className="min-w-0 space-y-6">{main}</div>
			<aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">{aside}</aside>
		</form>
	);
}

export function BasicsSection({ row, publicPath, titlePlaceholder, children }: { row?: Base; publicPath: string; titlePlaceholder: string; children?: React.ReactNode }) {
	return (
		<section className={`${cardClass} space-y-5 p-5`}>
			<Field id="title" label="Title">
				<input id="title" name="title" required maxLength={200} defaultValue={row?.title} placeholder={titlePlaceholder} className={`${inputClass} text-base font-medium`} />
			</Field>
			<Field id="slug" label="URL slug" hint="Leave blank to generate it from the title. Changing it on a live page breaks existing links.">
				<div className="flex rounded-lg shadow-sm">
					<span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
						{publicPath}/
					</span>
					<input
						id="slug"
						name="slug"
						maxLength={80}
						pattern="[a-zA-Z0-9\- ]*"
						defaultValue={row?.slug}
						placeholder="generated-from-title"
						className={`${inputClass} rounded-l-none shadow-none`}
					/>
				</div>
			</Field>
			<Field id="excerpt" label="Summary" hint="One or two sentences shown on listing cards.">
				<textarea id="excerpt" name="excerpt" rows={3} maxLength={500} defaultValue={row?.excerpt ?? ""} className={inputClass} />
			</Field>
			{children}
		</section>
	);
}

export function ContentSection({ defaultValue, label = "Content" }: { defaultValue?: string; label?: string }) {
	return (
		<div>
			<label htmlFor="content" className={labelClass}>
				{label}
			</label>
			<MarkdownEditor name="content" defaultValue={defaultValue ?? ""} />
		</div>
	);
}

export function PublishCard({ row, noun }: { row?: Base; noun: string }) {
	const state = row ? contentState(row) : "draft";
	const live = row?.status === "published";

	return (
		<FormCard title="Publish">
			<dl className="space-y-2 text-sm">
				<div className="flex items-center justify-between">
					<dt className="text-slate-600 dark:text-slate-400">Status</dt>
					<dd>{row ? <StatusBadge row={row} /> : <StatusBadge row={{ status: "draft", published_at: null }} />}</dd>
				</div>
				{row && (
					<>
						<div className="flex justify-between gap-3">
							<dt className="text-slate-600 dark:text-slate-400">Created</dt>
							<dd className="text-right text-slate-800 dark:text-slate-200">{formatDate(row.created_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
						</div>
						<div className="flex justify-between gap-3">
							<dt className="text-slate-600 dark:text-slate-400">Updated</dt>
							<dd className="text-right text-slate-800 dark:text-slate-200">{formatDate(row.updated_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
						</div>
					</>
				)}
			</dl>

			<Field
				id="published_at"
				label="Publish date"
				hint={
					state === "scheduled"
						? "Scheduled — it goes live automatically at this time (PH time)."
						: "PH time. Leave blank to use the moment you publish. A future date schedules it."
				}
			>
				<input id="published_at" name="published_at" type="datetime-local" defaultValue={toDateTimeInput(row?.published_at)} className={inputClass} />
			</Field>

			<div className="flex flex-col gap-2 pt-1">
				{live ? (
					<>
						<SubmitButton name="intent" value="save" pendingLabel="Updating…" variant="accent">
							<Globe className="h-4 w-4" aria-hidden /> Update {noun}
						</SubmitButton>
						<SubmitButton name="intent" value="unpublish" pendingLabel="Unpublishing…" variant="secondary">
							<Undo2 className="h-4 w-4" aria-hidden /> Revert to draft
						</SubmitButton>
					</>
				) : (
					<>
						<SubmitButton name="intent" value="draft" pendingLabel="Saving…" variant="secondary">
							<Save className="h-4 w-4" aria-hidden /> Save draft
						</SubmitButton>
						<SubmitButton name="intent" value="publish" pendingLabel="Publishing…" variant="accent">
							<Send className="h-4 w-4" aria-hidden /> Publish
						</SubmitButton>
					</>
				)}
			</div>
		</FormCard>
	);
}

export function CoverCard({ row, title = "Cover image" }: { row?: Base; title?: string }) {
	return (
		<FormCard title={title}>
			<MediaField name="cover_image_url" defaultValue={row?.cover_image_url} label={title} />
			<Field id="cover_image_alt" label="Alt text" hint="Describe the image. Also used for social sharing previews.">
				<input id="cover_image_alt" name="cover_image_alt" maxLength={200} defaultValue={row?.cover_image_alt ?? ""} className={inputClass} />
			</Field>
		</FormCard>
	);
}

export function TagsCard({ row, placeholder }: { row?: Base; placeholder: string }) {
	return (
		<FormCard title="Tags">
			<Field id="tags" label="Tags" hint="Comma separated, up to 10.">
				<input id="tags" name="tags" defaultValue={row?.tags.join(", ")} placeholder={placeholder} className={inputClass} />
			</Field>
		</FormCard>
	);
}

export function SeoCard({ row }: { row?: Base }) {
	return (
		<FormCard title="Search engine (SEO)">
			<Field id="meta_title" label="Meta title" hint="Up to 70 characters. Defaults to the title.">
				<input id="meta_title" name="meta_title" maxLength={70} defaultValue={row?.meta_title ?? ""} className={inputClass} />
			</Field>
			<Field id="meta_description" label="Meta description" hint="Up to 170 characters. Defaults to the summary. Shown in Google results.">
				<textarea id="meta_description" name="meta_description" rows={3} maxLength={170} defaultValue={row?.meta_description ?? ""} className={inputClass} />
			</Field>
		</FormCard>
	);
}

export function DangerZone({ title, description, confirm, action, id }: { title: string; description: string; confirm: string; action: (fd: FormData) => Promise<void>; id: string }) {
	return (
		<section className={`${cardClass} mt-8 flex flex-col gap-4 border-red-200 p-5 dark:border-red-900/60 sm:flex-row sm:items-center sm:justify-between`}>
			<div>
				<h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
				<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
			</div>
			<form action={action}>
				<input type="hidden" name="id" value={id} />
				<ConfirmButton message={confirm}>
					<Trash2 className="h-4 w-4" aria-hidden /> Delete
				</ConfirmButton>
			</form>
		</section>
	);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Flash messages after saving any content type. */
export const saveNotices: Record<string, string> = {
	created: "Draft created.",
	saved: "Changes saved.",
	published: "Published — it's now live (or scheduled, if the publish date is in the future).",
	unpublished: "Reverted to draft and hidden from the site.",
};
