"use client";

import { createContext, useContext, useState } from "react";

/**
 * Shows only the editor sections that matter for the chosen content type (spec §6.2). Sections stay in the DOM
 * (hidden), so switching back and forth never loses what was typed; the server ignores fields a type doesn't use.
 */
const TypeContext = createContext<string>("");

export function TypeScope({ initial, children }: { initial: string; children: React.ReactNode }) {
	const [type, setType] = useState(initial);
	return (
		<TypeContext.Provider value={type}>
			<div
				onChange={(e) => {
					const el = e.target as unknown as HTMLSelectElement;
					if (el.name === "content_type") setType(el.value);
				}}
			>
				{children}
			</div>
		</TypeContext.Provider>
	);
}

export function ForTypes({ types, not = false, children }: { types: readonly string[]; not?: boolean; children: React.ReactNode }) {
	const type = useContext(TypeContext);
	const match = types.includes(type);
	return <div hidden={not ? match : !match}>{children}</div>;
}
