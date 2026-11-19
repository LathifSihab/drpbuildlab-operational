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

	const CONTACT_PLACEHOLDERS: Record<ContactField, string> = {
		name: 'Full name',
		email: 'name@company.be',
		phone: '+32 …',
		role: 'e.g. Owner, Marketing'
	};

	const KIND_OPTIONS = [
		{ value: 'client', label: 'Client', description: 'Hires us directly' },
		{ value: 'partner', label: 'Partner agency', description: 'Resells our work to its clients' }
	] as const;

	/** "@Terro.be" or "an@terro.be" -> "terro.be". */
	const normalizeDomain = (raw: string) => raw.trim().toLowerCase().replace(/^.*@/, '');
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ChoiceChips from '#lib/components/ChoiceChips.svelte';
	import ErrorSummary, { type ErrorItem } from '#lib/components/ErrorSummary.svelte';
	import FormFooter from '#lib/components/FormFooter.svelte';
	import FormSection from '#lib/components/FormSection.svelte';
	import TagInput from '#lib/components/TagInput.svelte';
	import { guardUnsavedChanges } from '#lib/unsaved-changes.ts';

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
	let dirty = $state(false);
	const markDirty = () => (dirty = true);
	guardUnsavedChanges(() => dirty && !submitting);

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
	const hasError = (key: string) => (errors[key]?.length ?? 0) > 0;
	const errorOf = (key: string) => errors[key]?.join(' ');

	function describedBy(key: string, hint?: string): string | undefined {
		const id = key.replaceAll('.', '-');
		const ids = [hint ? `cf-${id}-hint` : '', hasError(key) ? `cf-${id}-error` : ''];
		return ids.filter(Boolean).join(' ') || undefined;
	}

	const errorItems = $derived(
		Object.entries(errors)
			.filter(([, messages]) => messages.length > 0)
			.map(([key, messages]): ErrorItem => {
				const message = messages.join(' ');
				const contact = key.match(/^contacts\.(\d+)\.(\w+)$/);
				if (contact) {
					const sent = Number(contact[1]);
					const field = contact[2] as ContactField;
					const row = rows.find((r) => r.sent === sent);
					return {
						targetId: row ? `cf-${row.key}-${field}` : 'cf-add-contact',
						label: `Contact ${sent + 1}, ${CONTACT_LABELS[field]?.toLowerCase() ?? field}`,
						message
					};
				}
				const targets: Record<string, string> = { contacts: 'cf-add-contact' };
				return {
					targetId: targets[key] ?? `cf-${key}`,
					label: CLIENT_FIELD_LABELS[key] ?? key,
					message
				};
			})
	);

	async function addContact() {
		rows = [
			...rows,
			{ name: '', email: '', phone: '', role: '', key: `new-${added++}`, sent: null }
		];
		markDirty();
		await tick();
		contactsList?.querySelector<HTMLInputElement>('li:last-child input')?.focus();
	}

	function removeContact(index: number) {
		rows = rows.filter((_, i) => i !== index);
		markDirty();
	}

	function cancel() {
		if (dirty && !confirm('Discard your changes?')) return;
		dirty = false;
		oncancel?.();
	}

	const domainsHint =
		'Press Enter after each. Intake uses these to recognise the client. Pasting an email address keeps its domain.';
</script>

{#snippet hintAndError(key: string, hint?: string)}
	{@const id = key.replaceAll('.', '-')}
	{#if hint}<p id="cf-{id}-hint" class="hint">{hint}</p>{/if}
	{#if hasError(key)}<p id="cf-{id}-error" class="field-error">{errorOf(key)}</p>{/if}
{/snippet}

{#snippet personalBadge()}
	<span class="badge gap-1 text-muted-foreground">
		<svg viewBox="0 0 16 16" class="size-3" aria-hidden="true">
			<rect
				x="3"
				y="7"
				width="10"
				height="7"
				rx="1.5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			/>
			<path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.5" />
		</svg>
		Admin and dev only
	</span>
{/snippet}

<!-- The form only listens for Ctrl/Cmd+Enter bubbling up from its fields; it is never focused itself. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	method="POST"
	{action}
	novalidate
	class="space-y-5"
	oninput={markDirty}
	onkeydown={(event) => {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			event.currentTarget.requestSubmit();
		}
	}}
	use:enhance={({ formElement }) => {
		submitting = true;
		return async ({ result, update }) => {
			await update();
			submitting = false;
			if (result.type === 'redirect') {
				dirty = false;
				onsaved?.();
			} else if (result.type === 'failure') {
				await tick();
				formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			}
		};
	}}
>
	<ErrorSummary items={errorItems} />

	<!-- Rebuilt from the sent values after a failed save. -->
	{#key form}
		<FormSection
			step="01"
			title="Company"
			description="Who they are and how intake recognises them."
		>
			<div class="space-y-5">
				<div>
					<label for="cf-name" class="label">
						Name <span class="text-destructive" aria-hidden="true">*</span>
					</label>
					<input
						id="cf-name"
						name="name"
						value={initial.name}
						required
						maxlength="200"
						placeholder="e.g. TÈRRO Vastgoed"
						aria-invalid={hasError('name') || undefined}
						aria-describedby={describedBy('name')}
						class="input text-lg font-medium"
					/>
					{@render hintAndError('name')}
				</div>

				<ChoiceChips
					name="kind"
					legend="Type"
					idPrefix="cf-kind"
					options={KIND_OPTIONS}
					value={initial.kind === 'partner' ? 'partner' : 'client'}
					hint="A partner agency resells our work to its own clients."
					error={errorOf('kind')}
					onchange={markDirty}
				/>

				<div>
					<label for="cf-emailDomains" class="label">Email domains</label>
					<TagInput
						id="cf-emailDomains"
						name="emailDomains"
						value={initial.emailDomains
							.split(/[\s,;]+/)
							.map(normalizeDomain)
							.filter(Boolean)}
						normalize={normalizeDomain}
						placeholder="terro.be"
						describedby={describedBy('emailDomains', domainsHint)}
						invalid={hasError('emailDomains')}
						onchange={markDirty}
					/>
					{@render hintAndError('emailDomains', domainsHint)}
				</div>
			</div>
		</FormSection>

		{#if canSeePersonal}
			<FormSection step="02" title="Contacts" aside={personalBadge}>
				{#if rows.length === 0}
					<p
						class="rounded-xl border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground"
					>
						No contacts yet.
					</p>
				{:else}
					<ol bind:this={contactsList} class="space-y-3">
						{#each rows as row, i (row.key)}
							<li class="rounded-xl border border-border bg-background/60 p-4">
								<div class="mb-3 flex items-center gap-2">
									<span class="step">{String(i + 1).padStart(2, '0')}</span>
									<span class="text-sm font-medium">Contact {i + 1}</span>
									<button
										type="button"
										class="btn btn-ghost btn-sm ml-auto"
										onclick={() => removeContact(i)}
									>
										Remove<span class="sr-only"> contact {i + 1}</span>
									</button>
								</div>
								<div class="grid gap-3 sm:grid-cols-2">
									{#each CONTACT_FIELDS as field (field)}
										{@const key =
											row.sent === null ? `new.${row.key}` : `contacts.${row.sent}.${field}`}
										<div>
											<label for="cf-{row.key}-{field}" class="label text-[13px]">
												{CONTACT_LABELS[field]}{#if field === 'name'}
													<span class="text-destructive" aria-hidden="true"> *</span>{/if}
												<span class="sr-only"> of contact {i + 1}</span>
											</label>
											<input
												id="cf-{row.key}-{field}"
												name="contact{CONTACT_LABELS[field]}"
												type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
												value={row[field]}
												placeholder={CONTACT_PLACEHOLDERS[field]}
												autocomplete="off"
												aria-invalid={hasError(key) || undefined}
												aria-describedby={describedBy(key)}
												class="input py-2"
											/>
											{@render hintAndError(key)}
										</div>
									{/each}
								</div>
							</li>
						{/each}
					</ol>
				{/if}
				{@render hintAndError('contacts')}
				<button
					id="cf-add-contact"
					type="button"
					class="btn btn-line btn-sm mt-4"
					onclick={addContact}
				>
					<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true"
						><path
							d="M8 3v10M3 8h10"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/></svg
					>
					Add contact
				</button>
			</FormSection>

			<FormSection step="03" title="Notes" aside={personalBadge}>
				<label for="cf-notes" class="sr-only">Notes</label>
				<textarea
					id="cf-notes"
					name="notes"
					rows="4"
					value={initial.notes}
					placeholder="How they like to work, who decides, anything to remember"
					aria-invalid={hasError('notes') || undefined}
					aria-describedby={describedBy('notes')}
					class="input"></textarea>
				{@render hintAndError('notes')}
			</FormSection>
		{/if}
	{/key}

	<FormFooter {submitLabel} {submitting} {dirty} oncancel={oncancel ? cancel : undefined} />
</form>
