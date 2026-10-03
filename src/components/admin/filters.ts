import type { FilterDef } from "./list-toolbar";

export const STATE_FILTER: FilterDef = {
	name: "status",
	label: "Status",
	options: [
		{ label: "All statuses", value: "" },
		{ label: "Published", value: "published" },
		{ label: "Scheduled", value: "scheduled" },
		{ label: "Draft", value: "draft" },
	],
};
