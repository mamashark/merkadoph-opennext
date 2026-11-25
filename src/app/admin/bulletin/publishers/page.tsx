import type { Metadata } from "next";
import Image from "next/image";
import { deleteBulletinPublisher, saveBulletinPublisher } from "../actions";
import { BULLETIN_ERRORS } from "../notices";
import { requireAdmin } from "@/lib/auth";
import { adminBulletinPublishers } from "@/lib/bulletin";
import { param } from "@/lib/content";
import { PageHeader } from "@/components/admin/page-header";
import { FormCard, Field } from "@/components/admin/form-parts";
import { MediaField } from "@/components/media/media-field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FlashMessage } from "@/components/ui/alert";
import { cardClass, hintClass, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Publishers" };

const NOTICES: Record<string, string> = { saved: "Publisher saved.", deleted: "Publisher deleted." };

/** Media organisations for press items (Kay: one managed list, so /press can filter by publisher cleanly). */
export default async function BulletinPublishersPage({ searchParams }: PageProps<"/admin/bulletin/publishers">) {
	await requireAdmin();
	const sp = await searchParams;
	const publishers = await adminBulletinPublishers();

	return (
		<>
			<PageHeader
				title="Publishers"
				description="Newspapers, broadcasters and organisations that featured Merkado PH. Use their logo only with permission."
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Bulletin Board", href: "/admin/bulletin" },
					{ label: "Publishers" },
				]}
			/>
			<div className="max-w-3xl space-y-6">
				<FlashMessage notice={NOTICES[param(sp, "notice")]} error={BULLETIN_ERRORS[param(sp, "error")]} />

				{publishers.length > 0 && (
					<ul className="space-y-3">
						{publishers.map((p) => (
							<li key={p.id} className={`${cardClass} p-4`}>
								<details>
									<summary className="flex cursor-pointer items-center gap-3">
										{p.logo_url ? (
											<Image src={p.logo_url} alt="" width={80} height={32} className="h-8 w-20 object-contain" />
										) : (
											<span className="inline-block h-8 w-20 rounded bg-slate-100 dark:bg-slate-800" aria-hidden />
										)}
										<span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
										<span className="text-xs text-slate-600 dark:text-slate-400">
											{p.items} {p.items === 1 ? "item" : "items"}
										</span>
									</summary>
									<form action={saveBulletinPublisher} className="mt-4 space-y-3">
										<input type="hidden" name="id" value={p.id} />
										<PublisherFields name={p.name} website={p.website_url} logo={p.logo_url} idSuffix={p.id} />
										<SubmitButton pendingLabel="Saving…" variant="secondary">
											Save
										</SubmitButton>
									</form>
									{p.items === 0 && (
										<form action={deleteBulletinPublisher} className="mt-3">
											<input type="hidden" name="id" value={p.id} />
											<ConfirmButton message={`Delete the publisher “${p.name}”?`}>Delete</ConfirmButton>
										</form>
									)}
								</details>
							</li>
						))}
					</ul>
				)}

				<FormCard title="Add a publisher">
					<form action={saveBulletinPublisher} className="space-y-3">
						<PublisherFields idSuffix="new" />
						<SubmitButton pendingLabel="Adding…">Add publisher</SubmitButton>
					</form>
					<p className={hintClass}>Only add a logo you have permission to use. It&rsquo;s uploaded to your media library, so the site never loads images from other websites.</p>
				</FormCard>
			</div>
		</>
	);
}

function PublisherFields({ name, website, logo, idSuffix }: { name?: string; website?: string | null; logo?: string | null; idSuffix: string }) {
	return (
		<>
			<Field id={`pname-${idSuffix}`} label="Name">
				<input id={`pname-${idSuffix}`} name="name" required maxLength={120} defaultValue={name} placeholder="e.g. Svenska Dagbladet" className={inputClass} />
			</Field>
			<Field id={`pweb-${idSuffix}`} label="Website" hint="Optional.">
				<input id={`pweb-${idSuffix}`} name="website_url" inputMode="url" maxLength={1000} defaultValue={website ?? ""} placeholder="https://…" className={inputClass} />
			</Field>
			<MediaField name="logo_url" defaultValue={logo} label="Logo" />
		</>
	);
}
