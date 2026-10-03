export default function AdminLoading() {
	return (
		<div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
			<div className="space-y-2">
				<div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
				<div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-800" />
			</div>
			<div className="h-64 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
		</div>
	);
}
