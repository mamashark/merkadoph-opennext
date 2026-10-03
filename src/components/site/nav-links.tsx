"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const links = [
	{ href: "/blogs", label: "Blog" },
	{ href: "/events", label: "Events" },
	{ href: "/promotions", label: "Promotions" },
	{ href: "/services", label: "Services" },
];

/** Only client piece of the public header: highlights the current section. */
export function NavLinks() {
	const pathname = usePathname();
	return (
		<ul className="flex items-center gap-1 overflow-x-auto text-sm font-medium">
			{links.map(({ href, label }) => {
				const active = pathname === href || pathname.startsWith(href + "/");
				return (
					<li key={href}>
						<Link
							href={href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"block whitespace-nowrap rounded-full px-3 py-1.5 transition-colors",
								active
									? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
									: "text-stone-700 hover:bg-stone-900/5 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white",
							)}
						>
							{label}
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
