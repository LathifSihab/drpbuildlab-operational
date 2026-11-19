<script lang="ts" module>
	import {
		CONTACT_FIELDS,
		type ClientFormValues,
		type Contact,
		type ContactField
	} from '#lib/schemas/client.ts';

	/** The client columns this form edits. `contacts` / `notes` are absent without access. */
	export type EditableClient = {
		name: string;
		isPartner: boolean;
		emailDomains: string[];
		contacts?: Contact[];
		notes?: string | null;
	};

	/** A failed `create` / `update` action: errors keyed by field and the values that were sent. */
	export type ClientFormResult = {
		errors?: Record<string, string[]>;
		values?: ClientFormValues;
	};

	export const CLIENT_FIELD_LABELS: Record<string, string> = {
		name: 'Name',
		isPartner: 'Type',
		kind: 'Type',
		emailDomains: 'Email domains',
		contacts: 'Contacts',
		notes: 'Notes'
	};

	const CONTACT_LABELS: Record<ContactField, string> = {
		name: 'Name',
		email: 'Email',
		phone: 'Phone',
		role: 'Role'
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';

	type Props = {
		client?: EditableClient;
		form?: ClientFormResult | null;
		/** Shows the contacts and notes fields (admin and dev). */
		canSeePersonal: boolean;
		/** Form action, e.g. "?/create". */
		action: string;
		submitLabel: string;
		/** Shows a Cancel button when set. */
		oncancel?: () => void;
		/** Called after a successful save (the action redirected). */
		onsaved?: () => void;
	};

	let { client, form, canSeePersonal, action, submitLabel, oncancel, onsaved }: Props = $props();

	let submitting = $state(false);
	let contactsList: HTMLElement | undefined = $state();

	// Refill from the failed submission when there is one, else from the client (or blanks).
	const initial = $derived.by((): ClientFormValues => {
		if (form?.values) return form.values;
		return {
			name: client?.name ?? '',
			kind: client?.isPartner ? 'partner' : 'client',
			emailDomains: client?.emailDomains.join(', ') ?? '',
			notes: client?.notes ?? '',
			contacts: (client?.contacts ?? []).map((c) => ({
				name: c.name,
				email: c.email ?? '',
				phone: c.phone ?? '',
				role: c.role ?? ''
			}))
		};
	});

	/** `sent` is the row's position in the last submission (its error keys); null for new rows. */
	type Row = Record<ContactField, string> & { key: string; sent: number | null };

	// Each refill gets new keys, so the rows (and their inputs) are rebuilt from the new values.
	let generation = 0;
	let added = 0;
	let rows = $derived.by((): Row[] => {
		const gen = ++generation;
		return initial.contacts.map((c, i) => ({ ...c, key: `${gen}-${i}`, sent: i }));
	});

	const errors = $derived(form?.errors ?? {});
	const errorCount = $derived(Object.values(errors).filter((e) => e && e.length > 0).length);

	const hasError = (key: string) => (errors[key]?.length ?? 0) > 0;

	function describedBy(key: string, hint?: string): string | undefined {
		const id = key.replaceAll('.', '-');
		const ids = [hint ? `cf-${id}-hint` : '', hasError(key) ? `cf-${id}-error` : ''];
		return ids.filter(Boolean).join(' ') || undefined;
	}

	async function addContact() {
		rows = [
			...rows,
			{ name: '', email: '', phone: '', role: '', key: `new-${added++}`, sent: null }
		];
		await tick();
		contactsList?.querySelector<HTMLInputElement>('li:last-child input')?.focus();
	}

	function removeContact(index: number) {
		rows = rows.filter((_, i) => i !== index);
	}

	const inputClass =
		'mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm aria-invalid:border-destructive';

	const kindHint = 'A partner agency resells our work to its own clients.';
	const domainsHint =
		'Comma-separated, e.g. terro.be, terro.nl. Intake uses these to recognise the client. Not gmail.com and the like.';
</script>

{#snippet hintAndError(key: string, hint?: string)}
	{@const id = key.replaceAll('.', '-')}
	{#if hint}
		<p id="cf-{id}-hint" class="mt-1 text-xs text-muted-foreground">{hint}</p>
	{/if}
	{#if hasError(key)}
		<p id="cf-{id}-error" class="mt-1 text-xs text-destructive">{errors[key]?.join(' ')}</p>
	{/if}
{/snippet}

<form
	method="POST"
	{action}
	novalidate
	class="space-y-4"
	use:enhance={({ formElement }) => {
		submitting = true;
		return async ({ result, update }) => {
			await update();
			submitting = false;
			if (result.type === 'redirect') {
				onsaved?.();
			} else if (result.type === 'failure') {
				await tick();
				formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			}
		};
	}}
>
	<div aria-live="polite">
		{#if errorCount > 0}
			<p class="rounded border border-destructive px-3 py-2 text-sm text-destructive" role="alert">
				{errorCount === 1 ? '1 field needs' : `${errorCount} fields need`} attention.
			</p>
		{/if}
	</div>

	<fieldset class="rounded border border-border bg-card p-4">
		<legend class="px-1 text-sm font-semibold">Client</legend>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="cf-name" class="block text-sm font-medium">
					Name <span class="text-destructive" aria-hidden="true">*</span>
				</label>
				<input
					id="cf-name"
					name="name"
					value={initial.name}
					required
					maxlength="200"
					aria-invalid={hasError('name') || undefined}
					aria-describedby={describedBy('name')}
					class={inputClass}
				/>
				{@render hintAndError('name')}
			</div>

			<fieldset aria-describedby={describedBy('kind', kindHint)}>
				<legend class="block text-sm font-medium">Type</legend>
				<div class="mt-2 flex gap-4 text-sm">
					<label class="flex items-center gap-1.5">
						<input type="radio" name="kind" value="client" checked={initial.kind !== 'partner'} />
						Client
					</label>
					<label class="flex items-center gap-1.5">
						<input type="radio" name="kind" value="partner" checked={initial.kind === 'partner'} />
						Partner agency
					</label>
				</div>
				{@render hintAndError('kind', kindHint)}
			</fieldset>

			<div class="sm:col-span-2">
				<label for="cf-emailDomains" class="block text-sm font-medium">Email domains</label>
				<input
					id="cf-emailDomains"
					name="emailDomains"
					value={initial.emailDomains}
					aria-invalid={hasError('emailDomains') || undefined}
					aria-describedby={describedBy('emailDomains', domainsHint)}
					class={inputClass}
				/>
				{@render hintAndError('emailDomains', domainsHint)}
			</div>
		</div>
	</fieldset>

	{#if canSeePersonal}
		<fieldset class="rounded border border-border bg-card p-4">
			<legend class="px-1 text-sm font-semibold">Contacts</legend>
			<p class="text-xs text-muted-foreground">
				Personal data: visible to admins and developers only.
			</p>
			{#if rows.length === 0}
				<p class="mt-2 text-sm text-muted-foreground">No contacts.</p>
			{:else}
				<ol bind:this={contactsList} class="mt-2 space-y-3">
					{#each rows as row, i (row.key)}
						<li class="grid items-start gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
							{#each CONTACT_FIELDS as field (field)}
								{@const key =
									row.sent === null ? `new.${row.key}` : `contacts.${row.sent}.${field}`}
								<div>
									<label for="cf-{row.key}-{field}" class="block text-xs text-muted-foreground">
										{CONTACT_LABELS[field]}<span class="sr-only"> of contact {i + 1}</span>
										{#if field === 'name'}<span class="text-destructive" aria-hidden="true">*</span
											>{/if}
									</label>
									<input
										id="cf-{row.key}-{field}"
										name="contact{CONTACT_LABELS[field]}"
										type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
										value={row[field]}
										autocomplete="off"
										aria-invalid={hasError(key) || undefined}
										aria-describedby={describedBy(key)}
										class={inputClass}
									/>
									{@render hintAndError(key)}
								</div>
							{/each}
							<button
								type="button"
								class="mt-5 rounded border border-border px-2 py-1.5 text-sm hover:bg-muted"
								onclick={() => removeContact(i)}
							>
								Remove<span class="sr-only"> contact {i + 1}</span>
							</button>
						</li>
					{/each}
				</ol>
			{/if}
			{@render hintAndError('contacts')}
			<button
				type="button"
				class="mt-3 rounded border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
				onclick={addContact}
			>
				Add contact
			</button>
		</fieldset>

		<fieldset class="rounded border border-border bg-card p-4">
			<legend class="px-1 text-sm font-semibold">Notes</legend>
			<label for="cf-notes" class="sr-only">Notes</label>
			<textarea
				id="cf-notes"
				name="notes"
				rows="4"
				value={initial.notes}
				aria-invalid={hasError('notes') || undefined}
				aria-describedby={describedBy('notes')}
				class={inputClass}></textarea>
			{@render hintAndError('notes')}
		</fieldset>
	{/if}

	<div class="flex items-center gap-2">
		<button
			class="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-60"
			disabled={submitting}
		>
			{submitting ? 'Saving…' : submitLabel}
		</button>
		{#if oncancel}
			<button
				type="button"
				class="rounded border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
				onclick={oncancel}
				disabled={submitting}
			>
				Cancel
			</button>
		{/if}
	</div>
</form>
