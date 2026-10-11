"use client";

/** Last-resort error page (replaces the root layout), so it carries its own html/body and inline styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<head>
				<title>Something went wrong | Merkado PH</title>
				<meta name="robots" content="noindex" />
			</head>
			<body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#faf9f6", color: "#1c1917" }}>
				<main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
					<h1 style={{ fontSize: 28, margin: 0 }}>Pasensya na, may problema.</h1>
					<p style={{ marginTop: 12, lineHeight: 1.5 }}>The site couldn&apos;t load right now. Please try again in a moment.</p>
					{error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#57534e" }}>Reference: {error.digest}</p>}
					<button
						type="button"
						onClick={retry}
						style={{ marginTop: 16, height: 44, padding: "0 20px", borderRadius: 12, border: 0, background: "#1c1917", color: "#fff", fontWeight: 600, cursor: "pointer" }}
					>
						Try again
					</button>
				</main>
			</body>
		</html>
	);
}
