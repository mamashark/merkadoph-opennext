import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { getPromotionTags, getPublicPromotions, promotionValidity, PROMOTIONS_PER_PAGE } from "@/lib/promotions";
import { pageParam, param } from "@/lib/content";
import { formatDayRange } from "@/lib/datetime";
import { pageMetadata } from "@/lib/seo";
import { ChipFilter, ContentCard, EmptyNotice, LinkTabs, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the tab/tag/page from the URL); the data itself comes from the cache.

const description = "Current offers on roofing and renovation work from Merkado PH, including community discounts. Limited time only.";

type Show = "current" | "ended";

/** Only known tags filter the list; anything else shows every promotion. */
async function readFilters(searchParams: PageProps<"/promotions">["searchParams"]) {
	const params = await searchParams;
	const show: Show = param(params, "show") === "ended" ? "ended" : "current";
	const tags = await getPromotionTags(show).catch((): string[] => []);
	return { show, tags, tag: tags.includes(param(params, "tag")) ? param(params, "tag") : "", page: pageParam(params) };
}

const listHref = (show: Show, tag: string, page = 1) => {
	const qs = new URLSearchParams({ ...(show === "ended" ? { show } : {}), ...(tag ? { tag } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return qs ? `/promotions?${qs}` : "/promotions";
};

export async function generateMetadata({ searchParams }: PageProps<"/promotions">): Promise<Metadata> {
	const { show, tag, page } = await readFilters(searchParams);
	return pageMetadata({
		title: `${show === "ended" ? "Past promotions" : "Promotions"}${tag ? `: ${tag}` : ""}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: listHref(show, tag, page),
	});
}

export default async function PromotionsPage({ searchParams }: PageProps<"/promotions">) {
	const { show, tags, tag, page } = await readFilters(searchParams);
	const { promotions, total } = await getPublicPromotions(show, page, PROMOTIONS_PER_PAGE, tag || undefined);
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

			{tags.length > 0 && <ChipFilter label="Filter promotions by tag" allLabel="All promotions" items={tags} current={tag} href={(t) => listHref(show, t)} />}

			{promotions.length === 0 ? (
				<EmptyNotice
					title={tag ? `No promotions tagged “${tag}” here.` : show === "current" ? "No promotions running right now." : "No ended promotions yet."}
					description={tag ? "Try another tag, or browse all promotions." : show === "current" ? "New deals drop here first — abangan!" : "Past offers will be listed here."}
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
												{p.discount_label && (
													<Pill tone="accent">
														<span className="font-display font-bold">{p.discount_label}</span>
													</Pill>
												)}
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
						<Pagination page={page} perPage={PROMOTIONS_PER_PAGE} total={total} basePath="/promotions" params={{ ...(show === "ended" ? { show } : {}), ...(tag ? { tag } : {}) }} />
					</div>
				</>
			)}
		</main>
	);
}
