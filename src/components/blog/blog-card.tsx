import Image from "next/image";
import Link from "next/link";
import { formatDate, type BlogSummary } from "@/lib/blogs";
import { cn } from "@/lib/ui";

export function BlogCard({ blog, featured = false }: { blog: BlogSummary; featured?: boolean }) {
	return (
		<article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm transition hover:shadow-md", featured && "md:flex-row")}>
			<div className={cn("relative aspect-[16/9] overflow-hidden bg-[#f4ebd9]", featured && "md:aspect-auto md:w-3/5")}>
				{blog.cover_image_url ? (
					<Image
						src={blog.cover_image_url}
						alt={blog.cover_image_alt ?? ""}
						fill
						sizes={featured ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
						className="object-cover transition duration-500 group-hover:scale-[1.03]"
						priority={featured}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-sm font-semibold tracking-widest text-amber-900/30">MERKADO PH</div>
				)}
			</div>
			<div className={cn("flex flex-1 flex-col p-5", featured && "md:justify-center md:p-8")}>
				{blog.tags.length > 0 && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-700">{blog.tags.slice(0, 2).join(" · ")}</p>}
				<h2 className={cn("font-semibold leading-snug text-slate-900", featured ? "text-2xl md:text-3xl" : "text-lg")}>
					<Link href={`/blogs/${blog.slug}`} className="after:absolute after:inset-0 focus:outline-none">
						{blog.title}
					</Link>
				</h2>
				{blog.excerpt && <p className={cn("mt-2 text-slate-600", featured ? "line-clamp-4" : "line-clamp-3 text-sm")}>{blog.excerpt}</p>}
				<p className="mt-auto pt-4 text-xs text-slate-500">
					<time dateTime={blog.published_at ?? undefined}>{formatDate(blog.published_at, { dateStyle: "long" })}</time>
					{blog.author_name && <> · {blog.author_name}</>}
				</p>
			</div>
		</article>
	);
}
