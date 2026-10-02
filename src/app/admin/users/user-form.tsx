import { createUser, updateUser } from "./actions";
import type { AdminUser } from "@/lib/users";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardClass, hintClass, inputClass, labelClass } from "@/lib/ui";

type Props = {
	user?: AdminUser;
	isSelf?: boolean;
	/** Values echoed back after a failed create. */
	draft?: { name?: string; email?: string };
};

export function UserForm({ user, isSelf, draft }: Props) {
	return (
		<form action={user ? updateUser : createUser} className={`${cardClass} max-w-2xl divide-y divide-slate-100`}>
			{user && <input type="hidden" name="id" value={user.id} />}

			<div className="grid gap-5 p-5 sm:grid-cols-2">
				<div>
					<label htmlFor="name" className={labelClass}>
						Full name
					</label>
					<input id="name" name="name" maxLength={100} defaultValue={user?.name ?? draft?.name} autoComplete="off" placeholder="Juan Dela Cruz" className={inputClass} />
				</div>
				<div>
					<label htmlFor="email" className={labelClass}>
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						maxLength={254}
						defaultValue={user?.email ?? draft?.email}
						autoComplete="off"
						placeholder="name@merkado.ph"
						className={inputClass}
					/>
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="password" className={labelClass}>
						{user ? "New password" : "Password"}
					</label>
					<input id="password" name="password" type="password" minLength={8} required={!user} autoComplete="new-password" className={inputClass} />
					<p className={hintClass}>{user ? "Leave blank to keep the current password. " : ""}At least 8 characters.</p>
				</div>
			</div>

			<div className="p-5">
				<label className="flex items-start gap-3">
					<input
						type="checkbox"
						name="access"
						defaultChecked={user ? user.hasAccess : true}
						disabled={isSelf}
						className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
					/>
					<span>
						<span className="block text-sm font-medium text-slate-800">Admin access</span>
						<span className="block text-xs text-slate-500">
							{isSelf ? "You can't remove your own access." : "Allow this user to sign in to the admin panel. Turning this off signs them out on their next request."}
						</span>
					</span>
				</label>
				{/* Disabled checkboxes don't submit; keep own access on. */}
				{isSelf && <input type="hidden" name="access" value="on" />}
			</div>

			<div className="flex justify-end gap-2 bg-slate-50/60 p-4">
				<SubmitButton pendingLabel={user ? "Saving…" : "Creating…"}>{user ? "Save changes" : "Create user"}</SubmitButton>
			</div>
		</form>
	);
}
