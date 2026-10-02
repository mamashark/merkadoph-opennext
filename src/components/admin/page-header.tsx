import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

export function PageHeader({
	title,
	description,
	breadcrumbs = [],
	actions,
}: {
	title: string;
	description?: string;
	breadcrumbs?: Crumb[];
	actions?: React.ReactNode;
}) {
	return (
		<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				{breadcrumbs.length > 0 && (
					<nav aria-label="Breadcrumb" className="mb-2">
						<ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
							{breadcrumbs.map((crumb, i) => (
								<li key={crumb.label} className="flex items-center gap-1">
									{i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
									{crumb.href ? (
										<Link href={crumb.href} className="hover:text-slate-900">
											{crumb.label}
										</Link>
									) : (
										<span aria-current="page" className="text-slate-700">
											{crumb.label}
										</span>
									)}
								</li>
							))}
						</ol>
					</nav>
				)}
				<h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
				{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
			</div>
			{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}
