import type { Metadata } from "next";
import { UnderConstruction } from "@/components/home/under-construction";

/** "Coming soon" page. src/proxy.ts serves it at / while the site is gated. */
export const metadata: Metadata = {
	title: { absolute: "Merkado PH — Bagong Yugto, coming soon" },
	description: "Merkado PH: Bagong Yugto, coming soon! Abangan!",
	alternates: { canonical: "/" },
};

export default function MaintenancePage() {
	return <UnderConstruction />;
}
