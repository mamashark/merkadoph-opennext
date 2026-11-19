/**
 * Merkado Byggnadsavdelning (/bygg): the page from the old Shopify store (theme template page.building-page),
 * kept in Swedish with its original wording (Kay, 2026-11-19). Photos and logos are in public/bygg/.
 * One sentence that stopped mid-way on the old page ("levererar skräddarsydda") is completed as "skräddarsydda lösningar".
 * To change the page, edit this file.
 */
export const BYGG = {
	metaTitle: "Merkado Bygg- och Entreprenadtjänster i Västra Götaland",
	metaDescription: "Högkvalitativa bygg- och entreprenadtjänster med särskild inriktning på takläggning, för bostäder och kommersiella fastigheter i Västra Götaland.",
	hero: { src: "/bygg/hero.jpg", alt: "Röd fasad i falsad plåt ovanför ett rött tegeltak, mot blå himmel", width: 2000, height: 1333 },
	logo: { vertical: "/bygg/logo-vertical.svg", horizontal: "/bygg/logo-horizontal.png" },
	slogan: "Din Byggare i Tiden!",
	intro:
		"På Merkado PH erbjuder vi högkvalitativa bygg- och entreprenadtjänster, med särskild inriktning på takläggning. Vi strävar efter att leverera hållbara och estetiskt tilltalande lösningar för både bostäder och kommersiella fastigheter i Västra Götaland.",
	partner: "I samarbete med A. R. Tak & Byggservice i Göteborg AB",
	servicesHeading: "Våra Takläggningstjänster",
	services: [
		{
			slug: "takinstallation",
			title: "Takinstallation",
			text: "Vi specialiserar oss på installation av nya tak med material av högsta kvalitet, anpassade efter kundens behov och byggnadens stil. Oavsett om det är tegel, plåt, bandtäckning eller papptak, så ser vi till att ditt tak är både hållbart och estetiskt tilltalande.",
			image: { src: "/bygg/takinstallation.jpg", alt: "Närbild på rader av röda takpannor", width: 2000, height: 1333 },
		},
		{
			slug: "takrenovering-och-reparation",
			title: "Takrenovering & Reparation",
			text: "Vi erbjuder omfattande takrenoveringar och reparationer för att säkerställa att ditt tak håller sig i bästa skick. Våra tjänster inkluderar läckagekontroll, utbyte av skadade takpannor och förstärkning av takkonstruktioner.",
			image: { src: "/bygg/takrenovering.jpg", alt: "En takläggare med hjälm skruvar fast takpannor på läkten med en skruvdragare", width: 2000, height: 1355 },
		},
		{
			slug: "takunderhall",
			title: "Takunderhåll",
			text: "Regelbundet underhåll av taket förlänger dess livslängd och minskar risken för kostsamma skador. Vi erbjuder takrengöring, mossborttagning och inspektioner för att säkerställa att ditt tak är i toppskick året runt.",
			image: { src: "/bygg/takunderhall.jpg", alt: "Flygfoto över en lång byggnad vars tak är öppnat ner till takstolarna under renovering", width: 2000, height: 1125 },
		},
		{
			slug: "solpaneler",
			title: "Solpaneler",
			text: "Vi samarbetar med några olika solcellsleverantörer och är då behjälpliga med montering av dessa.",
			image: { src: "/bygg/solpaneler.jpg", alt: "Svarta solpaneler monterade på ett rött tegeltak, sett ovanifrån", width: 2000, height: 1125 },
		},
	],
	whyHeading: "Varför Välja Merkado PH?",
	reasons: [
		{ title: "Lokal Expertis", text: "Vi har lång erfarenhet av takläggning i Västra Götaland och anpassar våra lösningar efter regionens klimat." },
		{ title: "Högkvalitativa Material", text: "Vi arbetar endast med hållbara och certifierade material." },
		{ title: "Professionellt Team", text: "Våra yrkesarbetare är utbildade och erfarna inom alla typer av tak och fasadarbeten." },
		{ title: "Kundfokus", text: "Vi lyssnar på våra kunders behov och levererar skräddarsydda lösningar." },
		{ title: "Kompetens", text: "Vi har utbildad personal och bygger egen byggnadsställning upp till 9 meter." },
	],
	cta: {
		heading: "Redo att starta ditt byggprojekt?",
		text: "Kontakta oss idag för en kostnadsfri konsultation och låt Merkado PH ta hand om ditt takprojekt i Västra Götaland!",
		phone: { label: "+46 70 432 60 21", href: "tel:+46704326021" },
		email: "bygg@merkadoph.se",
		formLead: "Eller fyll i kontaktuppgifter nedan.",
		image: { src: "/bygg/kontakt.jpg", alt: "", width: 808, height: 540 },
	},
	footerTitle: "Merkado PH Bygg- och Entreprenadtjänster",
} as const;
