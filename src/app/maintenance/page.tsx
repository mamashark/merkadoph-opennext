import type { Metadata } from "next";
import { UnderConstruction } from "@/components/home/under-construction";

/** "Coming soon" page. src/proxy.ts serves it at / while the site is gated. */
export const metadata: Metadata = {
	title: { absolute: "Merkado PH — Coming soon to Gothenburg" },
	description:
		"The store has a new home. Coming soon: Filipino culture, festivals and pop-ups, and three years of stories from our community in Gothenburg.",
	alternates: { canonical: "/" },
};

export default function MaintenancePage() {
	return <UnderConstruction />;
}
