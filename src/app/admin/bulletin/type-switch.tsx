"use client";

import { createContext, useContext, useState } from "react";

/**
 * Shows only the editor sections that matter for the chosen content type (spec §6.2). Hidden sections stay in the
 * DOM, so switching back and forth keeps what was typed, but they're disabled: not submitted and not validated by
 * the browser. The server also clears fields a type doesn't use (saveBulletinItem, TYPE_FIELDS).
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
	const off = not ? match : !match;
	return (
		<fieldset hidden={off} disabled={off} className="m-0 min-w-0 border-0 p-0">
			{children}
		</fieldset>
	);
}
