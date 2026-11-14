import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicServices, getServiceCategories, getServiceTags, SERVICES_PER_PAGE } from "@/lib/services";
import { pageParam, param } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ChipFilter, ContentCard, EmptyNotice, LinkTabs, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

// Renders per request (it reads the category/tag/page from the URL); the data itself comes from the cache.

const description = "Roofing, renovation and construction across Sweden from the family behind Merkado PH. Explore our services and ask for a free quote.";

/** Only known categories and tags filter the list; anything else shows every service. */
async function readFilters(searchParams: PageProps<"/services">["searchParams"]) {
	const params = await searchParams;
	const [categories, tags] = await Promise.all([getServiceCategories().catch((): string[] => []), getServiceTags().catch((): string[] => [])]);
	return {
		categories,
		tags,
		category: categories.includes(param(params, "category")) ? param(params, "category") : "",
		tag: tags.includes(param(params, "tag")) ? param(params, "tag") : "",
		page: pageParam(params),
	};
}

const listHref = (category: string, tag: string, page = 1) => {
	const qs = new URLSearchParams({ ...(category ? { category } : {}), ...(tag ? { tag } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return qs ? `/services?${qs}` : "/services";
};

export async function generateMetadata({ searchParams }: PageProps<"/services">): Promise<Metadata> {
	const { category, tag, page } = await readFilters(searchParams);
	return pageMetadata({
		title: `${category ? `${category} services` : "Services"}${tag ? `: ${tag}` : ""}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: listHref(category, tag, page),
	});
}

export default async function ServicesPage({ searchParams }: PageProps<"/services">) {
	const { categories, tags, category, tag, page } = await readFilters(searchParams);
	const { services, total } = await getPublicServices(category || undefined, page, SERVICES_PER_PAGE, tag || undefined);
	if (page > 1 && services.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Services" title="What we build and fix" description={description} />

			{categories.length > 1 && (
				<LinkTabs
					label="Service categories"
					current={category}
					tabs={[{ label: "All", value: "", href: listHref("", tag) }, ...categories.map((c) => ({ label: c, value: c, href: listHref(c, tag) }))]}
				/>
			)}

			{tags.length > 0 && <ChipFilter label="Filter services by tag" allLabel="All services" items={tags} current={tag} href={(t) => listHref(category, t)} />}

			{services.length === 0 ? (
				tag || category ? (
					<EmptyNotice title="No services match this filter." description="Try another tag or category, or browse all services." />
				) : (
					<EmptyNotice title="Our services are being lined up." description="Abangan! Check back soon." />
				)
			) : (
				<>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{services.map((s, i) => (
							<ContentCard
								key={s.id}
								href={`/services/${s.slug}`}
								title={s.title}
								excerpt={s.excerpt}
								image={s.cover_image_url}
								imageAlt={s.cover_image_alt}
								priority={i === 0}
								badge={s.is_featured ? <Pill tone="accent">Featured</Pill> : undefined}
								eyebrow={s.category ?? undefined}
								meta={s.price_label ? <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{s.price_label}</p> : undefined}
							/>
						))}
					</div>
					<div className="mt-12">
						<Pagination page={page} perPage={SERVICES_PER_PAGE} total={total} basePath="/services" params={{ ...(category ? { category } : {}), ...(tag ? { tag } : {}) }} />
					</div>
				</>
			)}
		</main>
	);
}
