import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicServices, getServiceCategories, SERVICES_PER_PAGE } from "@/lib/services";
import { pageParam, param } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ContentCard, EmptyNotice, LinkTabs, PageIntro, Pill } from "@/components/site/content-card";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";

const description = "Everything Merkado PH can do for you — from sourcing to delivery. Explore our services and get in touch.";

export async function generateMetadata({ searchParams }: PageProps<"/services">): Promise<Metadata> {
	const params = await searchParams;
	const category = param(params, "category");
	const page = pageParam(params);
	const qs = new URLSearchParams({ ...(category ? { category } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
	return pageMetadata({
		title: `${category ? `${category} services` : "Services"}${page > 1 ? ` — Page ${page}` : ""}`,
		description,
		path: qs ? `/services?${qs}` : "/services",
	});
}

export default async function ServicesPage({ searchParams }: PageProps<"/services">) {
	const params = await searchParams;
	const page = pageParam(params);
	const categories = await getServiceCategories();
	const category = categories.includes(param(params, "category")) ? param(params, "category") : "";
	const { services, total } = await getPublicServices(category || undefined, page);
	if (page > 1 && services.length === 0) notFound();

	return (
		<main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
			<PageIntro eyebrow="Services" title="Paano kami makakatulong" description={description} />

			{categories.length > 1 && (
				<LinkTabs
					label="Service categories"
					current={category}
					tabs={[{ label: "All", value: "", href: "/services" }, ...categories.map((c) => ({ label: c, value: c, href: `/services?category=${encodeURIComponent(c)}` }))]}
				/>
			)}

			{services.length === 0 ? (
				<EmptyNotice title="Our services are being lined up." description="Abangan! Check back soon." />
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
						<Pagination page={page} perPage={SERVICES_PER_PAGE} total={total} basePath="/services" params={category ? { category } : {}} />
					</div>
				</>
			)}
		</main>
	);
}
