import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonClass, dangerIconClass } from "@/lib/ui";

type Props = {
	label: string;
	editHref: string;
	viewHref?: string | null;
	deleteAction: (formData: FormData) => Promise<void>;
	id: string;
};

export function RowActions({ label, editHref, viewHref, deleteAction, id }: Props) {
	return (
		<div className="flex shrink-0 items-center justify-end gap-1.5">
			{viewHref && (
				<a href={viewHref} target="_blank" rel="noreferrer" className={buttonClass("secondary", "icon")} aria-label={`View ${label} on the site`} title="View live">
					<ExternalLink className="h-4 w-4" aria-hidden />
				</a>
			)}
			<Link href={editHref} className={buttonClass("secondary", "icon")} aria-label={`Edit ${label}`} title="Edit">
				<Pencil className="h-4 w-4" aria-hidden />
			</Link>
			<form action={deleteAction}>
				<input type="hidden" name="id" value={id} />
				<ConfirmButton message={`Delete “${label}”? This cannot be undone.`} label={`Delete ${label}`} variant="secondary" size="icon" className={dangerIconClass}>
					<Trash2 className="h-4 w-4" aria-hidden />
				</ConfirmButton>
			</form>
		</div>
	);
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center px-6 py-16 text-center">
			<span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
				<Icon className="h-6 w-6" aria-hidden />
			</span>
			<p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
			<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

/** Small cover thumbnail for list rows. */
export function Thumb({ src, icon: Icon }: { src: string | null; icon: React.ElementType }) {
	return (
		<div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 sm:block">
			{src ? (
				// eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail of an arbitrary storage URL
				<img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
			) : (
				<div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-600">
					<Icon className="h-5 w-5" aria-hidden />
				</div>
			)}
		</div>
	);
}
