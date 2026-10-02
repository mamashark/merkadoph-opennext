import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const isImageOnly = (node: { children?: Array<{ type: string; tagName?: string; value?: string }> } | undefined) =>
	!!node?.children?.length &&
	node.children.every((c) => (c.type === "element" && c.tagName === "img") || (c.type === "text" && !c.value?.trim()));

const components: Components = {
	// An image on its own line becomes a <figure>; unwrap the <p> so the markup stays valid.
	p({ node, children }) {
		if (isImageOnly(node)) return <>{children}</>;
		return <p>{children}</p>;
	},
	img({ src, alt }) {
		if (typeof src !== "string" || !src) return null;
		return (
			<figure>
				{/* eslint-disable-next-line @next/next/no-img-element -- dimensions of content images are unknown */}
				<img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
				{alt && <figcaption>{alt}</figcaption>}
			</figure>
		);
	},
	a({ href, children }) {
		const external = typeof href === "string" && /^https?:\/\//.test(href);
		return (
			<a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
				{children}
			</a>
		);
	},
	// Reserve <h1> for the post title.
	h1({ children }) {
		return <h2>{children}</h2>;
	},
};

/** Renders post Markdown. Raw HTML is not allowed, so content can't inject scripts. */
export function Markdown({ content }: { content: string }) {
	return (
		<div className="prose-blog">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
