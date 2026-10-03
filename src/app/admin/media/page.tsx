import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Folder, FolderPlus, HardDrive, ImageOff, Search, Trash2, Upload } from "lucide-react";
import { createFolderAction, deleteMediaAction, uploadMediaAction } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { cleanFolder, formatBytes, listBuckets, listFolder, type MediaListing } from "@/lib/media";
import { PageHeader } from "@/components/admin/page-header";
import { FlashMessage } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyButton } from "@/components/ui/copy-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass, cardClass, cn, dangerIconClass, inputClass } from "@/lib/ui";
import { pageParam } from "@/lib/content";
import { Pagination } from "@/components/admin/pagination";
import { UploadRulesNote } from "@/components/media/upload-rules-note";
import { UPLOAD_ACCEPT, UPLOAD_RULES_TEXT } from "@/lib/upload-rules";

export const metadata: Metadata = { title: "Media" };

const PER_PAGE = 30;

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

	// Search, sort and paginate files in the current folder (folders always show on page 1).
	const q = str("q").trim().toLowerCase();
	const sort = str("sort");
	const page = pageParam(params);
	const files = (listing?.files ?? [])
		.filter((f) => !q || f.name.toLowerCase().includes(q))
		.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.size - a.size : (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")));
	const pagedFiles = files.slice((page - 1) * PER_PAGE, page * PER_PAGE);
	const folders = page === 1 ? (listing?.folders ?? []).filter((f) => !q || f.toLowerCase().includes(q)) : [];
	const listParams = Object.fromEntries(Object.entries({ bucket: bucket ?? "", path, q: str("q").trim(), sort }).filter(([, v]) => v));

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
					<div className={`${cardClass} p-10 text-center text-sm text-slate-500 dark:text-slate-400`}>No public storage buckets found. Create one in Supabase Storage first.</div>
				) : (
					<div className={cardClass}>
						{/* Bucket tabs */}
						<div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-3">
							{buckets.map((b) => (
								<Link
									key={b}
									href={href(b)}
									className={cn(
										"flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap",
										b === bucket ? "border-teal-600 text-slate-900 dark:text-white" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
									)}
								>
									<HardDrive className="h-4 w-4" aria-hidden />
									{b}
								</Link>
							))}
						</div>

						{/* Path + actions */}
						<div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
							<nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
								<Link href={href(bucket)} className="font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
									{bucket}
								</Link>
								{segments.map((seg, i) => (
									<span key={i} className="flex items-center gap-1">
										<ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden />
										<Link href={href(bucket, segments.slice(0, i + 1).join("/"))} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
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
								<form action={uploadMediaAction} className="flex flex-col gap-1.5">
									<div className="flex gap-2">
										<input type="hidden" name="bucket" value={bucket} />
										<input type="hidden" name="path" value={path} />
										<input
											type="file"
											name="files"
											multiple
											required
											accept={UPLOAD_ACCEPT}
											aria-label="WebP images to upload"
											aria-describedby="upload-rules"
											className="block w-full min-w-0 text-sm text-slate-600 dark:text-slate-400 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-3 file:text-sm file:font-medium file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 sm:w-56"
										/>
										<SubmitButton variant="accent" pendingLabel="Uploading…">
											<Upload className="h-4 w-4" aria-hidden /> Upload
										</SubmitButton>
									</div>
									<UploadRulesNote id="upload-rules" />
								</form>
							</div>
						</div>

						{/* Search + sort (URL-driven) */}
						<form role="search" action="/admin/media" className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row">
							<input type="hidden" name="bucket" value={bucket} />
							{path && <input type="hidden" name="path" value={path} />}
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
								<input type="search" name="q" defaultValue={str("q")} placeholder="Search file names in this folder…" aria-label="Search files" className={`${inputClass} h-10 pl-9`} />
							</div>
							<label htmlFor="media-sort" className="sr-only">
								Sort by
							</label>
							<select id="media-sort" name="sort" defaultValue={sort} className={`${inputClass} h-10 py-0 sm:w-44`}>
								<option value="">Newest first</option>
								<option value="name">Name A–Z</option>
								<option value="size">Largest first</option>
							</select>
							<button type="submit" className={buttonClass("primary")}>
								Apply
							</button>
						</form>

						{listing && (
							<div className="p-4">
								{folders.length === 0 && pagedFiles.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-16 text-center">
										<ImageOff className="h-10 w-10 text-slate-400 dark:text-slate-600" aria-hidden />
										<p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{q ? "No files match your search" : "This folder is empty"}</p>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{q ? "Try a different name." : "Upload images or create a folder to get started."}</p>
									</div>
								) : (
									<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
										{folders.map((folder) => (
											<li key={folder}>
												<Link
													href={href(bucket, path ? `${path}/${folder}` : folder)}
													className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-slate-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-white"
												>
													<Folder className="h-10 w-10 fill-amber-100 dark:fill-amber-900 text-amber-500" aria-hidden />
													<span className="max-w-full truncate px-3 text-sm font-medium">{folder}</span>
												</Link>
											</li>
										))}
										{pagedFiles.map((file) => (
											<li key={file.path} className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
												<a href={file.url} target="_blank" rel="noreferrer" className="block aspect-square bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-size-[16px_16px] dark:bg-[repeating-conic-gradient(#1e293b_0_25%,#0f172a_0_50%)]">
													{/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of arbitrary storage objects, incl. SVG */}
													<img src={file.url} alt={file.name} loading="lazy" className="h-full w-full object-contain" />
												</a>
												<div className="flex items-center gap-2 p-2">
													<div className="min-w-0 flex-1">
														<p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200" title={file.name}>
															{file.name}
														</p>
														<p className="text-[11px] text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
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
															className={dangerIconClass}
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

				<Pagination page={page} perPage={PER_PAGE} total={files.length} basePath="/admin/media" params={listParams} />

				<p className="text-xs text-slate-600 dark:text-slate-400">
					{UPLOAD_RULES_TEXT}. Convert JPG/PNG to WebP first (e.g. squoosh.app) so every image on the site loads fast. Need it in a post? Use{" "}
					<span className="font-medium">Choose from media</span> in the editor —{" "}
					<Link href="/admin/blogs/new" className={buttonClass("ghost", "sm", "h-auto px-1 text-xs text-teal-700 dark:text-teal-300")}>
						new post
					</Link>
				</p>
			</div>
		</>
	);
}
