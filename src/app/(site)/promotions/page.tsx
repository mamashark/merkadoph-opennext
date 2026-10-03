import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { getPublicPromotions, promotionValidity, PROMOTIONS_PER_PAGE } from "@/lib/promotions";
import { pageParam, param } from "@/lib/content";
import { formatDayRange } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tab/page from the URL); the data itself comes from the cache.

const description = "Current offers on roofing and renovation work from Merkado PH, including community discounts. Limited time only.";

export async function generateMetadata({ searchParams }: PageProps<"/promotions">): Promise<Metadata> {
	const params = await searchParams;
	const ended = param(params, "show") === "ended";
	const page = pageParam(params);
	const qs = new URLSearchParams({ ...(ended ? { show: "ended" } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return pageMetadata({
		title: `${ended ? "Past promotions" : "Promotions"}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: qs ? `/promotions?${qs}` : "/promotions",
	});
}

export default async function PromotionsPage({ searchParams }: PageProps<"/promotions">) {
	const params = await searchParams;
	const show = param(params, "show") === "ended" ? "ended" : "current";
	const page = pageParam(params);
	const { promotions, total } = await getPublicPromotions(show, page);
	if (page > 1 && promotions.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Promotions" title="Sulit offers" description={description} />

			<LinkTabs
				label="Promotion status"
				current={show}
				tabs={[
					{ label: "Current offers", value: "current", href: "/promotions" },
					{ label: "Ended", value: "ended", href: "/promotions?show=ended" },
				]}
			/>

			{promotions.length === 0 ? (
				<EmptyNotice
					title={show === "current" ? "No promotions running right now." : "No ended promotions yet."}
					description={show === "current" ? "New deals drop here first — abangan!" : "Past offers will be listed here."}
				/>
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{promotions.map((p, i) => {
							const validity = promotionValidity(p);
							return (
								<ContentCard
									key={p.id}
									href={`/promotions/${p.slug}`}
									title={p.title}
									excerpt={p.excerpt}
									image={p.cover_image_url}
									imageAlt={p.cover_image_alt}
									priority={i === 0}
									badge={
										p.discount_label || validity !== "active" ? (
											<span className="flex gap-1.5">
												{p.discount_label && <Pill tone="accent">{p.discount_label}</Pill>}
												{validity === "upcoming" && <Pill>Starts soon</Pill>}
												{validity === "ended" && <Pill tone="muted">Ended</Pill>}
											</span>
										) : undefined
									}
									eyebrow={p.tags.slice(0, 2).join(" · ") || undefined}
									meta={
										<p className="flex items-center gap-1.5">
											<CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
											{formatDayRange(p.starts_at, p.ends_at)}
										</p>
									}
								/>
							);
						})}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={PROMOTIONS_PER_PAGE} total={total} basePath="/promotions" params={show === "ended" ? { show } : {}} />
					</div>
				</>
			)}
		</main>
	);
}
