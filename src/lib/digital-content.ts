/**
 * Merkado PH Digital (/digital): branding, marketing, website development & design, and consulting (Kay, 2026-11-20).
 * A fixed page, like /bygg. The wording is a first draft for Kay to review: it describes what each service covers and
 * makes no claims about prices, clients or results. To change the page, edit this file.
 */
export type DigitalService = {
	slug: string;
	title: string;
	/** One line under the title. */
	tagline: string;
	text: string;
	includes: string[];
	icon: "palette" | "megaphone" | "monitor" | "compass";
};

export const DIGITAL = {
	metaTitle: "Merkado PH Digital: branding, marketing and websites",
	metaDescription: "Branding, marketing, website development and design, and digital consulting from Merkado PH, for businesses, associations and community projects in Sweden.",
	eyebrow: "Branding · Marketing · Websites · Consulting",
	lede: "Branding, marketing, website development and design, and digital consulting, for businesses, associations and community projects in Sweden.",
	intro:
		"Merkado PH began as a small Filipino store in Torslanda. Creating its name and logo, building its webshop and filling its events taught us what a small business needs to look good, be found and sell online. Merkado PH Digital puts that experience to work for you, with one team for all of it.",
	servicesHeading: "Our services",
	services: [
		{
			slug: "branding",
			title: "Branding",
			tagline: "A look people remember",
			text: "Your brand is the first thing people meet. We shape a name, a look and a voice that feel like you, and make them work everywhere: on screen, on paper and on the shop floor.",
			includes: ["Logo and visual identity", "Colours, typography and brand guidelines", "Menus, flyers, posters and signage", "Packaging and labels", "Templates for social media"],
			icon: "palette",
		},
		{
			slug: "marketing",
			title: "Marketing",
			tagline: "Get found, get chosen",
			text: "Good work deserves to be seen. We plan and make the content that brings people to your door, your event or your webshop, and help you keep it going week after week.",
			includes: ["Social media planning and content", "Campaigns for launches and events", "Email newsletters", "Search engine optimisation (SEO) and Google Business Profile", "Photo and video direction"],
			icon: "megaphone",
		},
		{
			slug: "website-development-and-design",
			title: "Website development & design",
			tagline: "Websites and webshops that work",
			text: "We design and build websites and webshops that are fast, easy to use on a phone and accessible to everyone, with a simple admin so you can update them yourself.",
			includes: ["Website and webshop design (UX and UI)", "Development: fast, mobile-first, accessible", "Webshops, payments and shipping set-up", "Content management you can use yourself", "Hosting, security and ongoing care"],
			icon: "monitor",
		},
		{
			slug: "consulting",
			title: "Consulting",
			tagline: "A clear next step",
			text: "Not sure where to start, or stuck with tools that don't fit? We look at where you are, help you choose what's worth doing, and stay with you while it gets done.",
			includes: ["Digital strategy and planning", "Choosing platforms and tools", "Website and webshop check-ups: speed, accessibility, SEO", "Training for you and your team", "Project management"],
			icon: "compass",
		},
	] satisfies DigitalService[],
	processHeading: "How we work",
	process: [
		{ title: "Kwentuhan", text: "We start with a conversation: your business, your goals, your budget and your timeline." },
		{ title: "Plan", text: "You get a clear proposal: what we'll make, when, and what it costs, before any work starts." },
		{ title: "Make", text: "We design and build in steps, showing you the work as it grows so you can steer it." },
		{ title: "Launch and care", text: "We launch together, show you how everything works, and stay available afterwards." },
	],
	contact: {
		heading: "Tell us about your project",
		text: "Write a few lines about what you have in mind, even if it's just an idea. We'll get back to you.",
		email: "hello@merkadoph.se",
	},
} as const;
