/**
 * Homepage text (src/components/highlights/highlights-home.tsx). To change a word on the homepage, edit this file.
 *
 * - Change only the text between the quotes. Use ’ (curly apostrophe) or “ ” inside text, never a straight ".
 * - *Stars* around a word make it the highlighted (marker) word in a heading, e.g. "Mga *Kuwento*".
 * - Never leave a heading empty (""): an empty heading confuses screen readers.
 * - Don't delete or rename a line (the part before the colon). The site won't build without it.
 * - The order and colours of the Highlights, and the counts, are set in highlights-home.tsx.
 * - The header menu has its own names and descriptions: src/components/site/site-nav.ts.
 * - The Bygg, Digital and Tahooo texts come from their own files (bygg-content.ts, digital-content.ts, tahooo-content.ts).
 */
export const HOME = {
	/** The constellation hero at the top: the sky and the chapter mark only (the welcome text is in `about`, Kay 2026-11-25). */
	hero: {
		/** The big vertical word down the hero's left edge (upright phones: across the top), linking to the Bagong Yugto post. */
		chapter: { title: "Ang Bagong Yugto", sub: "The Next Chapter", cta: "Read the blog", href: "/blogs/bagong-yugto-next-chapter-for-merkado-ph" },
	},

	/**
	 * Each Highlight in the constellation, the index and the section headings.
	 * label = its name · sub = one-line description · allLabel = the "see everything" link · cta = the button in the zoomed-in panel.
	 */
	highlights: {
		blogs: { label: "Blogs", sub: "Stories from Merkado PH and our community", allLabel: "All stories", cta: "Read the full story" },
		/** Events have two versions: when events are coming up ("upcoming"), and when none are ("past"). */
		events: {
			label: "Events",
			cta: "Event details",
			upcoming: { sub: "Community and cultural events, pop-ups, festivals", allLabel: "All events" },
			past: { sub: "Our most recent events", allLabel: "Events archive" },
		},
		impact: { label: "Community Impact", sub: "Every year, the same community", allLabel: "All of Community Impact", cta: "View the entry", groupsLabel: "All years" },
		/** The business names come from src/lib/businesses.ts; the "Visit …" link adds the name after this word. */
		bygg: { sub: "Construction by Tindero Pedro", allLabelPrefix: "Visit", cta: "Read more" },
		digital: { sub: "Branding, marketing, websites and consulting", allLabelPrefix: "Visit", cta: "Read more" },
		/** The Highlight's name comes from TAHOOO.highlight in tahooo-content.ts ("Project Taho"). */
		tahooo: { sub: "Tahooo Corner: taho for your event in Gothenburg", allLabel: "Visit Tahooo Corner", cta: "Read more" },
		bulletin: { label: "Bulletin Board", sub: "Embassy news, notices and offers", allLabel: "Bulletin Board", cta: "Read more" },
	},

	/** "Mabuhay" section under the hero. */
	about: {
		/** The small line above the heading (Kay, 2026-11-25). Split so "Mabuhay!" is read as Tagalog and "Välkommen" as Swedish. */
		greeting: { tl: "Mabuhay!", sv: "Välkommen", rest: "to Merkado PH." },
		/** The big heading, the page's h1; *word* is highlighted. */
		tagline: "Everything *Filipino*, from Gothenburg and beyond.",
		body: "What began as a Filipino grocery store in 2023 has evolved into something more. A space where our culture lives on, stories are shared, connections are strengthened, and the Filipino spirit continues to be celebrated. A new chapter, the same heart.",
		stats: {
			founded: { label: "Merkado PH founded in Gothenburg", value: "2023" },
			stories: "Stories about Filipino culture",
			highlights: "Highlights to explore",
		},
	},

	/** The section for each Highlight further down the page: its heading and the line under it. */
	sections: {
		blogs: { heading: "Stories we *carry*", body: "The flavours, traditions and memories that connect us to home, wherever we may be." },
		events: {
			heading: "What’s up! Ano’ng *ganap*?",
			body: "Discover markets, cultural gatherings and opportunities to meet our community.",
			/** Shown instead when no events are coming up. */
			bodyNoUpcoming: "No events coming up right now. These are our most recent ones; follow the Bulletin Board for news.",
		},
		impact: { heading: "Beyond borders. Better *together*.", body: "Every year, the same community: the markets, Independence Day, our anniversaries and Tambayan Sessions, year by year." },
		/** The Bygg and Digital lines under the heading come from bygg-content.ts (intro) and digital-content.ts (lede). */
		bygg: { heading: "Merkado *Byggnadsavdelning*" },
		digital: { heading: "Merkado PH *Digital*" },
		/** The Taho line under the heading, the menu card and the booking steps come from tahooo-content.ts. */
		tahooo: { heading: "Project *Taho*", bookCard: "Book the cart" },
		bulletin: { heading: "Ano’ng latest na *chismis*?", body: "The good kind of chismis. Embassy updates, community announcements, opportunities and special offers from friends of Merkado PH." },
	},

	/** Small labels used on cards and links. */
	labels: {
		backToHighlights: "↖ Back to highlights",
		readStory: "Read story →",
		eventDetails: "Details",
		offer: "Offer",
		viewOffer: "View offer",
		/** Offer end date: "Until 5 Dec" on the button, and in lower case in the small note ("Offer · until 5 Dec"). */
		until: "Until",
		notice: "Notice",
		/** Shown as the author when a notice has none. */
		defaultAuthor: "Merkado PH",
	},

	/** "Get in touch" section with the contact form. */
	contact: {
		eyebrow: "Kumusta?",
		heading: "Let’s create something *good*.",
		lede: "Have an idea, a project or a story worth sharing? Let’s collaborate! Contact us.",
	},
};
