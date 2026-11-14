import { Constellation } from "@/components/constellation/constellation";
import type { ConstellationHub, ConstellationItem } from "@/components/constellation/types";

const HUBS: ConstellationHub[] = [
	{ id: "culture", label: "Culture", color: "blue", dots: 16 },
	{ id: "blog", label: "Blog", color: "leaf", dots: 30 },
	{ id: "events", label: "Events", color: "blue", dots: 12 },
	{ id: "festivals", label: "Festivals", color: "sun", dots: 18 },
	{ id: "popups", label: "Pop-ups", color: "red", dots: 10 },
	{ id: "community", label: "Community", color: "leaf", dots: 22 },
	{ id: "embassy", label: "Embassy news", color: "blue", dots: 8 },
	{ id: "portfolio", label: "Portfolio", color: "sun", dots: 24 },
	{ id: "construction", label: "Construction", color: "red", dots: 9 },
];

/** Sample tiles for the placeholder page. The homepage section uses real content. */
const ITEMS: ConstellationItem[] = [
	{ hub: "portfolio", title: "Torslanda torg shop", note: "2023 – 2026" },
	{ hub: "portfolio", title: "merkadoph.se", note: "Three years online" },
	{ hub: "portfolio", title: "PH Asian Market relaunch", note: "October 2026" },
	{ hub: "popups", title: "Tahooo by Merkado PH", note: "Taho in Gothenburg" },
	{ hub: "popups", title: "Sarap Without Waste", note: "Zero-waste Filipino-Swedish food" },
	{ hub: "blog", title: "Filipino culture stories", note: "Moving over from the old site" },
	{ hub: "blog", title: "Recipes from home", note: "Sample tile" },
	{ hub: "festivals", title: "Festival booths", note: "Sample tile" },
	{ hub: "community", title: "Gothenburg kababayan", note: "Sample tile" },
	{ hub: "embassy", title: "Embassy announcements", note: "Sample tile" },
	{ hub: "events", title: "Upcoming events", note: "Sample tile" },
	{ hub: "culture", title: "Traditions & holidays", note: "Sample tile" },
	{ hub: "construction", title: "Construction projects", note: "Sample tile" },
];

/** The public "coming soon" homepage: a folded constellation of what's coming that bursts open on click. */
export function UnderConstruction() {
	return (
		<Constellation
			variant="page"
			hubs={HUBS}
			items={ITEMS}
			randomThreads
			titleAs="h1"
			titleId="coming-soon-title"
			eyebrow="Coming soon · Gothenburg"
			title="Merkado PH"
			lede="The store has a new home. This is what comes next: Filipino culture, festivals and pop-ups, and three years of stories from our community."
			label="Constellation of what's coming to Merkado PH: culture, blog, events, festivals, pop-ups, community, embassy news, portfolio and construction"
		/>
	);
}
