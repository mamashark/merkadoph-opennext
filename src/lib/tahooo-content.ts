/**
 * Tahooo Corner (/tahooo), the taho cart from Merkado PH. Sources: the Tahooo Brand Guide (October 2026), the cart
 * photo and Kay's brief (occasions, Gothenburg). No prices or booking terms yet: they were in the Facebook launch post,
 * which could not be read. Add them here when Kay sends them. Photos and logo: public/tahooo/.
 */
export const TAHOOO = {
	name: "Tahooo Corner",
	metaTitle: "Tahooo Corner: taho for your event in Gothenburg",
	metaDescription: "Fresh taho from our banig cart: silken tofu, arnibal and sago, made to order. Book Tahooo Corner for birthdays, weddings, baptisms and events in Gothenburg.",
	brand: "Tahooo by Merkado PH",
	sister: "A sister brand of Merkado PH",
	logo: { src: "/tahooo/logo-stacked.svg", width: 440, height: 520 },
	cart: { src: "/tahooo/cart.webp", alt: "The Tahooo cart: a wooden cart with lit banig-weave panels and a “Tahooo! @ Merkado PH” sign, two steel pots, clear cups and wooden spoons on top", width: 1200, height: 1155 },
	tagline: { sv: "Silkesmjuk tofupudding, gjord på beställning.", en: "Silken tofu pudding, made to order." },
	whatIsTaho:
		"Warm silken tofu with arnibal (brown-sugar syrup) and sago pearls. Sold every morning across the Philippines by the magtataho, who carries two buckets on a pole and calls “Tahooo!” down the street.",
	flavours: [
		{ id: "klassisk", sv: "Klassisk", en: "Classic", colour: "sago" },
		{ id: "ube", sv: "Ube", en: "Ube", colour: "ube" },
		{ id: "ube-langka", sv: "Ube-Langka", en: "Ube-Langka", colour: "ube" },
		{ id: "mango", sv: "Mango", en: "Mango", colour: "mango" },
		{ id: "langka", sv: "Langka", en: "Langka", colour: "mango" },
		{ id: "jordgubb", sv: "Jordgubb", en: "Strawberry", colour: "strawberry" },
		{ id: "buko-pandan", sv: "Buko Pandan", en: "Buko Pandan", colour: "pandan" },
		{ id: "matcha", sv: "Matcha", en: "Matcha", colour: "pandan" },
	],
	addOns: { sv: "Tillval: boba och sago", en: "Add-ons: boba and sago" },
	sizes: "12 oz · 16 oz",
	allergens: { sv: "Vegan · Innehåller soja", en: "Vegan · Contains soy" },
	occasions: ["Birthdays", "Weddings", "Baptisms", "Community events", "Company events"],
	area: "Gothenburg",
} as const;

export type TahoooFlavourColour = (typeof TAHOOO.flavours)[number]["colour"];
