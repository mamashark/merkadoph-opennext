/**
 * Tahooo Corner (/tahooo), the taho cart from Merkado PH. Wording and photos come from Kay's Tahooo Corner slides
 * (19 Nov 2026), Swedish first and English second as on the slides; small typos in the English lines are fixed.
 * Photos are cropped from the slides into public/tahooo/. No prices yet.
 */
export type Bilingual = { sv: string; en: string };
export type TahoooImage = { src: string; alt: string; width: number; height: number };

const img = (name: string, alt: string, width: number, height: number): TahoooImage => ({ src: `/tahooo/${name}.webp`, alt, width, height });

export const TAHOOO = {
	name: "Tahooo Corner",
	metaTitle: "Tahooo Corner: taho for your event in Gothenburg",
	metaDescription: "The taho corner for birthdays, weddings, baptisms and company events in Gothenburg. Eight flavours, warm or chilled, made fresh and served cup by cup.",
	brand: "Tahooo by Merkado PH",
	area: "Göteborg",

	hero: {
		eyebrow: { sv: "Nu bokningsbart", en: "Now booking" },
		lead: { sv: "Taho-hörnan för kalas, bröllop, dop, community- och företagsevent.", en: "The taho corner for birthdays, weddings, baptisms and company events in Göteborg." },
		cart: { src: "/tahooo/cart.webp", alt: "The Tahooo cart: a wooden cart with lit banig-weave panels and a “Tahooo! @ Merkado PH” sign, two steel pots, clear cups and wooden spoons on top", width: 1200, height: 1155 },
	},

	whatIsTaho: {
		eyebrow: { sv: "Vad är taho?", en: "What is taho?" },
		title: { sv: "Tre lager. Ett minne.", en: "Three layers. One memory." },
		meet: "Meet Taho,",
		meetLine: "a warm, silky soy dessert with sweet syrup and chewy, soft pearls.",
		layers: [
			{ sv: "Sagopärlor", en: "Sago pearls · soft and chewy" },
			{ sv: "Arnibal", en: "Brown sugar syrup · caramel-sweet" },
			{ sv: "Silkestofu", en: "Silken tofu · warm and silky" },
		],
		image: img("glass", "A glass of taho on a bamboo mat: silken tofu, dark arnibal syrup and sago pearls in layers", 1100, 767),
	},

	call: {
		title: "Tahoooooo!",
		line: { sv: "Ropet som fick varje barn att springa ut.", en: "The call that sent every kid running outside." },
		now: { sv: "Nu kan det ropas på ditt kalas.", en: "Now it can ring at your party." },
		image: img("vendor", "A street vendor scoops taho from a steel bucket into a paper cup held out by a customer", 1100, 1223),
	},

	howItWorks: {
		eyebrow: { sv: "Så funkar det", en: "How it works" },
		title: "Taho Corner",
		line: { sv: "Gatuförsäljarens taho, mitt på din fest.", en: "The street vendor’s taho, right at your party." },
		points: [
			{ sv: "En taho-station på plats", en: "A taho station at your event" },
			{ sv: "Färsk, gjort på beställning", en: "Made fresh, served to order" },
			{ sv: "En smak för varje gäst", en: "A flavour for every guest" },
		],
		image: img("cup-hand", "A gloved hand holds up a Tahooo cup of taho with arnibal and sago pearls", 1100, 1220),
	},

	flavoursIntro: {
		eyebrow: { sv: "Smaker", en: "Flavours" },
		title: { sv: "Åtta smaker", en: "Eight flavours, warm or chilled" },
	},
	flavours: [
		{ id: "classic", name: "Classic", line: "The original street taho", premium: false, colour: "sago", ingredients: ["Sago pearls", "Silken tofu", "Arnibal syrup"] },
		{ id: "ube", name: "Ube", line: "With corn flakes", premium: false, colour: "ube", ingredients: ["Corn flakes", "Sago pearls", "Silken tofu", "Ube halaya"] },
		{ id: "pandan", name: "Pandan", line: "With pandan pinipig", premium: false, colour: "pandan", ingredients: ["Pandan pinipig", "Sago pearls", "Silken tofu", "Pandan syrup"] },
		{ id: "peach-mango", name: "Peach & Mango", line: "Sunny and fruity", premium: false, colour: "mango", ingredients: ["Mango cubes", "Peach", "Sago pearls", "Silken tofu", "Peach & mango compote"] },
		{ id: "ube-langka", name: "Ube-Langka", line: "With grated langka crisp", premium: true, colour: "ube", ingredients: ["Langka crisp", "Sago pearls", "Ube halaya", "Silken tofu"] },
		{ id: "strawberry", name: "Strawberry", line: "Fresh berries, sweet sauce", premium: false, colour: "strawberry", ingredients: ["Fresh strawberry", "Sago pearls", "Silken tofu", "Strawberry sauce"] },
		{ id: "matcha", name: "Matcha", line: "Ceremonial-grade green", premium: true, colour: "pandan", ingredients: ["Matcha dust", "Sago pearls", "Silken tofu", "Matcha syrup"] },
		{ id: "taholatte", name: "Taholatte", line: "Taho meets espresso", premium: true, colour: "boba", ingredients: ["Espresso shot", "Sago pearls", "Silken tofu", "Espresso arnibal"] },
	],

	occasionsEyebrow: { sv: "Perfekt för", en: "Perfect for" },
	occasions: [
		{
			id: "kalas",
			sv: "Kalas",
			en: "Birthdays",
			line: { sv: "Godiset alla köar för, från barnbordet till titos och titas.", en: "The treat everyone lines up for, from the kids’ table to the titos and titas." },
			examples: "Barnkalas, 18-årsfester och jubileum",
			image: img("birthday", "Three cupcakes with orange, yellow and pink frosting and lit candles on an orange background", 1100, 944),
		},
		{
			id: "brollop",
			sv: "Bröllop",
			en: "Weddings",
			line: { sv: "En varm filippinsk välkomst och ett dessertbord gästerna pratar om.", en: "A warm Filipino welcome, and a dessert corner your guests will talk about." },
			examples: "Mottagningar, välkomstmiddagar och förlovningar",
			image: img("wedding", "Two gold wedding rings beside a white rose and greenery on an orange background", 1100, 944),
		},
		{
			id: "dop",
			sv: "Dop",
			en: "Baptisms · Binyag",
			line: { sv: "Välkomna familjens nyaste medlem med en smak av hemma.", en: "Welcome the newest member of the family with a taste of home." },
			examples: "För ninongs, ninangs, lolas och alla däremellan",
			image: img("baptism", "Water poured over a baby’s head at a baptism", 1100, 1007),
		},
		{
			id: "foretagsevent",
			sv: "Företagsevent",
			en: "Company events",
			line: { sv: "Fika med en twist för kontoret, kickoffen och personalfesten.", en: "A fika with a twist for the office, the kick-off and the staff party." },
			examples: "Kontorsfika, kickoffer, mässor och julbord.",
			image: img("company", "Guests mingling at a company event behind a table of small desserts in glasses", 1100, 1007),
		},
	],

	howToBook: {
		eyebrow: { sv: "Så bokar du", en: "How to book" },
		title: { sv: "Tre steg", en: "Three steps to your own Tahooo Corner" },
		steps: [
			{ sv: "Skicka ditt datum.", en: "Send your date, place and number of guests." },
			{ sv: "Välj 2–3 smaker.", en: "Pick your flavours, classic or the new ones." },
			{ sv: "Vi serverar, ni firar.", en: "We serve fresh taho, cup by cup." },
		],
		image: img("cup-ube", "A Tahooo cup of ube taho topped with dark purple pearls", 1100, 1241),
	},

	book: {
		eyebrow: { sv: "Boka nu!", en: "Book now!" },
		title: { sv: "Boka ditt Tahooo Corner", en: "Book your Tahooo Corner" },
		occasions: "Kalas · Bröllop · Dop · Företagsevents",
		line: "Birthdays, weddings and baptisms, even company events, in Göteborg.",
		image: img("cups", "Six glass cups of taho in different flavours: mango, ube with corn flakes, matcha, strawberry, pandan, and one tipped over spilling arnibal and pearls", 1100, 1241),
	},

	contact: {
		title: "For inquiries:",
		email: "hello@merkadoph.se",
		social: "@merkadoph.se",
		phone: { label: "+46 70 432 60 21", href: "tel:+46704326021" },
		image: img("glass-stool", "A curvy glass of ube taho on an orange stool against a yellow wall", 1100, 1241),
	},
} as const;

export type TahoooFlavour = (typeof TAHOOO.flavours)[number];
export const flavourImage = (id: string) => `/tahooo/flavour-${id}.webp`;
