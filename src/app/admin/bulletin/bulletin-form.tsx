import { Archive, ArchiveRestore, Eye, Globe, Save, Send, Undo2 } from "lucide-react";
import { saveBulletinItem } from "./actions";
import { ForTypes, TypeScope } from "./type-switch";
import type { BulletinCategory, BulletinItem, BulletinPublisher } from "@/lib/bulletin";
import {
	BULLETIN_TYPES,
	DEFAULT_CATEGORY,
	LANGUAGES,
	MEDIA_CONTACT_DOMAIN,
	MEDIA_TYPES,
	MEDIA_TYPE_LABEL,
	PRESS_PUBLISHING_OPEN,
	PRESS_TYPES,
	STATE_LABEL,
	TYPE_LABEL,
	bulletinState,
	type BulletinType,
} from "@/lib/bulletin-shared";
import { formatDate, toDateTimeInput } from "@/lib/datetime";
import { BasicsSection, ContentSection, CoverCard, Field, FormCard, SeoCard, TagsCard } from "@/components/admin/form-parts";
import { Badge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { hintClass, inputClass } from "@/lib/ui";

type Choices = {
	categories: BulletinCategory[];
	publishers: BulletinPublisher[];
	events: { id: string; title: string }[];
	projects: { id: string; title: string }[];
};

const NON_PRESS = BULLETIN_TYPES.filter((t) => !PRESS_TYPES.includes(t));
const stateTone = { draft: "draft", in_review: "warning", scheduled: "scheduled", published: "published", expired: "neutral", archived: "neutral" } as const;

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
	return (
		<label className="flex items-start gap-3">
			<input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700" />
			<span>
				<span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
				{hint && <span className="block text-xs text-slate-600 dark:text-slate-400">{hint}</span>}
			</span>
		</label>
	);
}

export function BulletinForm({ item, choices, initialType = "community_notice" }: { item?: BulletinItem; choices: Choices; initialType?: BulletinType }) {
	const i = item;
	const type = i?.content_type ?? initialType;
	const state = i ? bulletinState(i) : "draft";
	const live = i?.status === "published";
	const defaultCategory = i?.category_id ?? choices.categories.find((c) => c.slug === DEFAULT_CATEGORY[type])?.id ?? choices.categories[0]?.id;

	return (
		<TypeScope initial={type}>
			<form action={saveBulletinItem} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				{i && <input type="hidden" name="id" value={i.id} />}
				<div className="min-w-0 space-y-6">
					<FormCard title="Type">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="content_type" label="What is it?" hint="The fields below change with the type.">
								<select id="content_type" name="content_type" defaultValue={type} className={inputClass}>
									{BULLETIN_TYPES.map((t) => (
										<option key={t} value={t}>
											{TYPE_LABEL[t]}
										</option>
									))}
								</select>
							</Field>
							<Field id="category_id" label="Category" hint="The filter it appears under on /bulletin. Manage categories under Bulletin → Categories.">
								<select id="category_id" name="category_id" required defaultValue={defaultCategory} className={inputClass}>
									{choices.categories.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
											{c.is_active ? "" : " (hidden)"}
										</option>
									))}
								</select>
							</Field>
						</div>
						<ForTypes types={["embassy_update"]}>
							<p className={hintClass}>
								Official information: keep the wording factual (no playful tone), and link to the Embassy&rsquo;s own page (dfa.gov.ph or facebook.com/PHLinSE). It
								can&rsquo;t be published without that link.
							</p>
						</ForTypes>
						<ForTypes types={PRESS_TYPES}>
							<p className={hintClass}>
								Press items belong on the Press &amp; Media page.
								{!PRESS_PUBLISHING_OPEN && " That page arrives in Phase 2: until then you can save and review press items, but not publish them."}
							</p>
						</ForTypes>
					</FormCard>

					<BasicsSection row={i} publicPath="/bulletin" titlePlaceholder="e.g. Consular outreach in Gothenburg">
						<ForTypes types={["media_coverage"]}>
							<p className={hintClass}>For media coverage, the summary is your own short introduction to the feature. Never copy the article&rsquo;s text.</p>
						</ForTypes>
					</BasicsSection>

					<ForTypes types={["media_coverage", "embassy_update", "press_release", "community_notice", "opportunity"]}>
						<FormCard title="Source">
							<ForTypes types={["media_coverage"]}>
								<div className="grid gap-4 sm:grid-cols-2">
									<Field id="publisher_id" label="Publisher" hint="Required to publish. Add new ones under Bulletin → Publishers.">
										<select id="publisher_id" name="publisher_id" defaultValue={i?.publisher_id ?? ""} className={inputClass}>
											<option value="">— Choose —</option>
											{choices.publishers.map((p) => (
												<option key={p.id} value={p.id}>
													{p.name}
												</option>
											))}
										</select>
									</Field>
									<Field id="media_type" label="Media type" hint="Required to publish.">
										<select id="media_type" name="media_type" defaultValue={i?.media_type ?? ""} className={inputClass}>
											<option value="">— Choose —</option>
											{MEDIA_TYPES.map((m) => (
												<option key={m} value={m}>
													{MEDIA_TYPE_LABEL[m]}
												</option>
											))}
										</select>
									</Field>
								</div>
								<Field id="original_title" label="Original headline" hint="Exactly as the publisher wrote it.">
									<input id="original_title" name="original_title" maxLength={300} defaultValue={i?.original_title ?? ""} className={inputClass} />
								</Field>
							</ForTypes>
							<Field
								id="source_url"
								label="Original source link"
								hint="Media coverage: the original article (required). Embassy updates: a dfa.gov.ph page or a post on facebook.com/PHLinSE (required). Others: optional."
							>
								<input id="source_url" name="source_url" inputMode="url" maxLength={1000} defaultValue={i?.source_url ?? ""} placeholder="https://…" className={inputClass} />
							</Field>
							<ForTypes types={PRESS_TYPES}>
								<div className="grid gap-4 sm:grid-cols-3">
									<Field id="original_published_on" label="Original date" hint="Publication or release date. Required to publish.">
										<input id="original_published_on" name="original_published_on" type="date" defaultValue={i?.original_published_on ?? ""} className={inputClass} />
									</Field>
									<Field id="source_language" label="Source language">
										<select id="source_language" name="source_language" defaultValue={i?.source_language ?? ""} className={inputClass}>
											<option value="">—</option>
											{LANGUAGES.map((l) => (
												<option key={l.value} value={l.value}>
													{l.label}
												</option>
											))}
										</select>
									</Field>
									<Field id="source_verified_on" label="Link last checked" hint="Internal; not shown.">
										<input id="source_verified_on" name="source_verified_on" type="date" defaultValue={i?.source_verified_on ?? ""} className={inputClass} />
									</Field>
								</div>
							</ForTypes>
						</FormCard>
					</ForTypes>

					<ContentSection defaultValue={i?.content} label="Full text (optional for media coverage)" />

					<ForTypes types={["press_release"]}>
						<FormCard title="Press release">
							<Field id="media_contact" label="Media contact" hint={`A role address @${MEDIA_CONTACT_DOMAIN} only, e.g. hello@${MEDIA_CONTACT_DOMAIN}. No personal names or numbers.`}>
								<input id="media_contact" name="media_contact" type="email" maxLength={254} defaultValue={i?.media_contact ?? ""} placeholder={`hello@${MEDIA_CONTACT_DOMAIN}`} className={inputClass} />
							</Field>
							<Field id="attachments" label="Downloads" hint="One per line: Label | link to a file in the media library. Up to 10.">
								<textarea
									id="attachments"
									name="attachments"
									rows={3}
									defaultValue={(i?.attachments ?? []).map((a) => `${a.label} | ${a.url}`).join("\n")}
									placeholder="Press kit (PDF) | https://media.merkadoph.se/blogs/…"
									className={`${inputClass} font-mono text-xs`}
								/>
							</Field>
						</FormCard>
					</ForTypes>

					<ForTypes types={["opportunity", "community_notice", "embassy_update"]}>
						<FormCard title="Call to action">
							<div className="grid gap-4 sm:grid-cols-[200px_1fr]">
								<Field id="cta_label" label="Button label">
									<input id="cta_label" name="cta_label" maxLength={40} defaultValue={i?.cta_label ?? ""} placeholder="Apply now" className={inputClass} />
								</Field>
								<Field id="cta_url" label="Button link">
									<input id="cta_url" name="cta_url" inputMode="url" maxLength={1000} defaultValue={i?.cta_url ?? ""} placeholder="/#contact or https://…" className={inputClass} />
								</Field>
							</div>
						</FormCard>
					</ForTypes>

					<FormCard title="Related content">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="event_id" label="Event">
								<select id="event_id" name="event_id" defaultValue={i?.event_id ?? ""} className={inputClass}>
									<option value="">— None —</option>
									{choices.events.map((e) => (
										<option key={e.id} value={e.id}>
											{e.title}
										</option>
									))}
								</select>
							</Field>
							<Field id="portfolio_id" label="Community Impact project">
								<select id="portfolio_id" name="portfolio_id" defaultValue={i?.portfolio_id ?? ""} className={inputClass}>
									<option value="">— None —</option>
									{choices.projects.map((p) => (
										<option key={p.id} value={p.id}>
											{p.title}
										</option>
									))}
								</select>
							</Field>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id="language" label="Language">
								<select id="language" name="language" defaultValue={i?.language ?? "en"} className={inputClass}>
									{LANGUAGES.map((l) => (
										<option key={l.value} value={l.value}>
											{l.label}
										</option>
									))}
								</select>
							</Field>
							<Field id="author_name" label="Issued by / author" hint="Shown on the page, e.g. Merkado PH or the organisation.">
								<input id="author_name" name="author_name" maxLength={120} defaultValue={i?.author_name ?? ""} className={inputClass} />
							</Field>
						</div>
					</FormCard>
				</div>

				<aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
					<FormCard title="Publish">
						<div className="flex items-center justify-between text-sm">
							<span className="text-slate-600 dark:text-slate-400">Status</span>
							<Badge tone={stateTone[state]}>{STATE_LABEL[state]}</Badge>
						</div>
						{i && (
							<p className="text-xs text-slate-600 dark:text-slate-400">
								Updated {formatDate(i.updated_at, { dateStyle: "medium", timeStyle: "short" })}
							</p>
						)}
						<Field id="published_at" label="Publish date" hint="Swedish time. Blank = when you publish. A future date schedules it.">
							<input id="published_at" name="published_at" type="datetime-local" defaultValue={toDateTimeInput(i?.published_at)} className={inputClass} />
						</Field>
						<ForTypes types={NON_PRESS}>
							<Field id="expires_at" label="Expires" hint="Optional. From this time it's hidden everywhere, including its own page.">
								<input id="expires_at" name="expires_at" type="datetime-local" defaultValue={toDateTimeInput(i?.expires_at)} className={inputClass} />
							</Field>
						</ForTypes>
						<ForTypes types={PRESS_TYPES}>
							<p className={hintClass}>Press items never expire: they stay in the archive.</p>
						</ForTypes>
						<ForTypes types={["embassy_update"]}>
							<p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
								Before publishing: check every date and time against the Embassy&rsquo;s original post. Never add a date the Embassy hasn&rsquo;t published.
							</p>
						</ForTypes>
						<div className="flex flex-col gap-2 pt-1">
							{state === "archived" ? (
								<SubmitButton name="intent" value="restore" pendingLabel="Restoring…" variant="secondary">
									<ArchiveRestore className="h-4 w-4" aria-hidden /> Restore to draft
								</SubmitButton>
							) : live ? (
								<>
									<SubmitButton name="intent" value="save" pendingLabel="Updating…" variant="accent">
										<Globe className="h-4 w-4" aria-hidden /> Update
									</SubmitButton>
									<SubmitButton name="intent" value="unpublish" pendingLabel="Unpublishing…" variant="secondary">
										<Undo2 className="h-4 w-4" aria-hidden /> Revert to draft
									</SubmitButton>
									<SubmitButton name="intent" value="archive" pendingLabel="Archiving…" variant="secondary">
										<Archive className="h-4 w-4" aria-hidden /> Archive
									</SubmitButton>
								</>
							) : (
								<>
									<SubmitButton name="intent" value="draft" pendingLabel="Saving…" variant="secondary">
										<Save className="h-4 w-4" aria-hidden /> {i?.status === "in_review" ? "Save" : "Save draft"}
									</SubmitButton>
									{i?.status !== "in_review" && (
										<SubmitButton name="intent" value="review" pendingLabel="Sending…" variant="secondary">
											<Eye className="h-4 w-4" aria-hidden /> Send for review
										</SubmitButton>
									)}
									<SubmitButton name="intent" value="publish" pendingLabel="Publishing…" variant="accent">
										<Send className="h-4 w-4" aria-hidden /> Publish
									</SubmitButton>
									{i && (
										<SubmitButton name="intent" value="archive" pendingLabel="Archiving…" variant="secondary">
											<Archive className="h-4 w-4" aria-hidden /> Archive
										</SubmitButton>
									)}
								</>
							)}
						</div>
					</FormCard>

					<FormCard title="Where it shows">
						<Check name="show_in_bulletin" label="On the Bulletin Board" hint="Unticked: not listed, but its page still works by direct link." defaultChecked={i ? i.show_in_bulletin : true} />
						<Check name="is_pinned" label="Pinned" hint="Stays at the top of the list." defaultChecked={!!i?.is_pinned} />
						<Check name="is_featured" label="Featured" hint="A large card at the top of /bulletin." defaultChecked={!!i?.is_featured} />
						<Check name="show_on_homepage" label="On the homepage" hint="Shown first in the homepage preview; the newest items fill any free places." defaultChecked={!!i?.show_on_homepage} />
						<Field id="display_priority" label="Priority" hint="Higher shows first (−100 to 100). Default 0.">
							<input id="display_priority" name="display_priority" type="number" min={-100} max={100} step={1} defaultValue={i?.display_priority ?? 0} className={inputClass} />
						</Field>
					</FormCard>

					<CoverCard row={i} title="Image">
						<Field id="image_caption" label="Caption">
							<input id="image_caption" name="image_caption" maxLength={300} defaultValue={i?.image_caption ?? ""} className={inputClass} />
						</Field>
						<Field id="image_credit" label="Credit" hint="Photographer or source, shown with the image.">
							<input id="image_credit" name="image_credit" maxLength={200} defaultValue={i?.image_credit ?? ""} className={inputClass} />
						</Field>
						<Field id="usage_rights" label="Usage rights" hint="Internal: who allowed us to use it, and how. Only use images we have permission for.">
							<input id="usage_rights" name="usage_rights" maxLength={300} defaultValue={i?.usage_rights ?? ""} className={inputClass} />
						</Field>
					</CoverCard>
					<TagsCard row={i} placeholder="embassy, consular, gothenburg" />
					<SeoCard row={i} pathPrefix="/bulletin/" />
				</aside>
			</form>
		</TypeScope>
	);
}
