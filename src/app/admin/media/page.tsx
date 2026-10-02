import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Folder, FolderPlus, HardDrive, ImageOff, Trash2, Upload } from "lucide-react";
import { createFolderAction, deleteMediaAction, uploadMediaAction } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { cleanFolder, formatBytes, listBuckets, listFolder, type MediaListing } from "@/lib/media";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, inputClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Media" };

function href(bucket: string, path = "") {
	const params = new URLSearchParams({ bucket, ...(path ? { path } : {}) });
	return `/admin/media?${params}`;
}

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
	await requireAdmin();
	const params = await searchParams;
	const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

	const buckets = await listBuckets();
	const bucket = buckets.includes(str("bucket")) ? str("bucket") : buckets[0];

	let listing: MediaListing | null = null;
	let loadError = "";
	if (bucket) {
		try {
			listing = await listFolder(bucket, cleanFolder(str("path")));
		} catch (err) {
			loadError = err instanceof Error ? err.message : "Failed to load media.";
		}
	}

	const path = listing?.path ?? "";
	const segments = path ? path.split("/") : [];

	return (
		<>
			<PageHeader
				title="Media library"
				description="Upload and manage images stored in Supabase Storage."
				breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Media" }]}
			/>

			<div className="space-y-4">
				<FlashMessage notice={str("notice")} error={str("error") || loadError} />

				{!bucket ? (
					<div className={`${cardClass} p-10 text-center text-sm text-slate-500`}>No public storage buckets found. Create one in Supabase Storage first.</div>
				) : (
					<div className={cardClass}>
						{/* Bucket tabs */}
						<div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-3">
							{buckets.map((b) => (
								<Link
									key={b}
									href={href(b)}
									className={cn(
										"flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap",
										b === bucket ? "border-teal-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900",
									)}
								>
									<HardDrive className="h-4 w-4" aria-hidden />
									{b}
								</Link>
							))}
						</div>

						{/* Path + actions */}
						<div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
							<nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
								<Link href={href(bucket)} className="font-medium text-slate-600 hover:text-slate-900">
									{bucket}
								</Link>
								{segments.map((seg, i) => (
									<span key={i} className="flex items-center gap-1">
										<ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
										<Link href={href(bucket, segments.slice(0, i + 1).join("/"))} className="text-slate-600 hover:text-slate-900">
											{seg}
										</Link>
									</span>
								))}
							</nav>

							<div className="flex flex-col gap-2 sm:flex-row">
								<form action={createFolderAction} className="flex gap-2">
									<input type="hidden" name="bucket" value={bucket} />
									<input type="hidden" name="path" value={path} />
									<input name="name" required maxLength={60} placeholder="New folder" aria-label="New folder name" className={`${inputClass} h-10 sm:w-40`} />
									<SubmitButton variant="secondary" pendingLabel="Creating…">
										<FolderPlus className="h-4 w-4" aria-hidden /> Create
									</SubmitButton>
								</form>
								<form action={uploadMediaAction} className="flex gap-2">
									<input type="hidden" name="bucket" value={bucket} />
									<input type="hidden" name="path" value={path} />
									<input
										type="file"
										name="files"
										multiple
										required
										accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
										aria-label="Images to upload"
										className="block w-full min-w-0 text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 sm:w-56"
									/>
									<SubmitButton variant="accent" pendingLabel="Uploading…">
										<Upload className="h-4 w-4" aria-hidden /> Upload
									</SubmitButton>
								</form>
							</div>
						</div>

						{listing && (
							<div className="p-4">
								{listing.folders.length === 0 && listing.files.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-16 text-center">
										<ImageOff className="h-10 w-10 text-slate-300" aria-hidden />
										<p className="mt-3 text-sm font-medium text-slate-700">This folder is empty</p>
										<p className="mt-1 text-sm text-slate-500">Upload images or create a folder to get started.</p>
									</div>
								) : (
									<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
										{listing.folders.map((folder) => (
											<li key={folder}>
												<Link
													href={href(bucket, path ? `${path}/${folder}` : folder)}
													className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-slate-900"
												>
													<Folder className="h-10 w-10 fill-amber-100 text-amber-500" aria-hidden />
													<span className="max-w-full truncate px-3 text-sm font-medium">{folder}</span>
												</Link>
											</li>
										))}
										{listing.files.map((file) => (
											<li key={file.path} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
												<a href={file.url} target="_blank" rel="noreferrer" className="block aspect-square bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
													{/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of arbitrary storage objects, incl. SVG */}
													<img src={file.url} alt={file.name} loading="lazy" className="h-full w-full object-contain" />
												</a>
												<div className="flex items-center gap-2 p-2">
													<div className="min-w-0 flex-1">
														<p className="truncate text-xs font-medium text-slate-800" title={file.name}>
															{file.name}
														</p>
														<p className="text-[11px] text-slate-500">{formatBytes(file.size)}</p>
													</div>
													<CopyButton value={file.url} />
													<form action={deleteMediaAction}>
														<input type="hidden" name="bucket" value={bucket} />
														<input type="hidden" name="path" value={path} />
														<input type="hidden" name="file" value={file.path} />
														<ConfirmButton
															message={`Delete ${file.name}? Posts that use this image will show a broken image.`}
															label="Delete image"
															variant="secondary"
															size="icon"
															className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
														>
															<Trash2 className="h-4 w-4" aria-hidden />
														</ConfirmButton>
													</form>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</div>
				)}

				<p className="text-xs text-slate-500">
					Images up to 10 MB · JPG, PNG, WebP, GIF, AVIF or SVG. Need it in a post? Use <span className="font-medium">Choose from media</span> in the blog editor —{" "}
					<Link href="/admin/blogs/new" className={buttonClass("ghost", "sm", "h-auto px-1 text-xs text-teal-700")}>
						new post
					</Link>
				</p>
			</div>
		</>
	);
}
