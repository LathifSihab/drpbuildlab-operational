<script lang="ts" module>
	import type { ProjectField } from '#lib/schemas/project.ts';

	type Named = { id: number; name: string };

	/** What the project pages' load functions return as `options`. */
	export type ProjectOptions = {
		clients: Named[];
		partners: Named[];
		users: { id: number; email: string; name: string | null }[];
		/** The shared tool list for the tools dropdown. */
		tools: string[];
		phases: readonly string[];
		platforms: readonly string[];
	};

	/** The project columns this form edits. */
	export type EditableProject = {
		title: string;
		clientId: number | null;
		partnerId: number | null;
		accountManagerId: number | null;
		picId: number | null;
		phase: string;
		platform: string;
		platformDetail: string | null;
		productType: string | null;
		siteUrl: string | null;
		stagingUrl: string | null;
		productionUrl: string | null;
		repoUrl: string | null;
		domainRegistrar: string | null;
		tools: string[];
		notes: string | null;
	};

	/** A failed `create` / `update` action: per-field errors and the values that were sent. */
	export type ProjectFormResult = {
		errors?: Partial<Record<string, string[]>>;
		values?: Partial<Record<string, string>>;
	};

	export const FIELD_LABELS: Record<string, string> = {
		title: 'Title',
		clientId: 'Client',
		newClient: 'New client',
		partnerId: 'Partner',
		newPartner: 'New partner',
		accountManagerId: 'Account manager',
		picId: 'PIC',
		phase: 'Phase',
		platform: 'Platform',
		platformDetail: 'Platform detail',
		productType: 'Product type',
		siteUrl: 'Site URL',
		stagingUrl: 'Staging URL',
		productionUrl: 'Production URL',
		repoUrl: 'Repository URL',
		domainRegistrar: 'Domain registrar',
		tools: 'Tools',
		notes: 'Notes'
	};

	const SPECIAL_LABELS: Record<string, string> = {
		uat: 'UAT',
		drp_custom: 'DRP custom',
		wordpress: 'WordPress'
	};

	/** Display label for a phase or platform value, e.g. `drp_custom` -> "DRP custom". */
	export function optionLabel(value: string): string {
		const label = SPECIAL_LABELS[value] ?? value.replaceAll('_', ' ');
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	export function userLabel(user: { email: string; name: string | null }): string {
		return user.name ? `${user.name} (${user.email})` : user.email;
	}

	/** Where an error message jumps to, when that is not `pf-<field>`. */
	const ERROR_TARGETS: Partial<Record<string, string>> = {
		newClient: 'pf-clientId',
		newPartner: 'pf-partnerId'
	};
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import ChoiceChips from '#lib/components/ChoiceChips.svelte';
	import EntityPicker from '#lib/components/EntityPicker.svelte';
	import ErrorSummary from '#lib/components/ErrorSummary.svelte';
	import FormFooter from '#lib/components/FormFooter.svelte';
	import FormSection from '#lib/components/FormSection.svelte';
	import ToolPicker from '#lib/components/ToolPicker.svelte';
	import { guardUnsavedChanges } from '#lib/unsaved-changes.ts';
	import { withHttps } from '#lib/url.ts';

	type Props = {
		options: ProjectOptions;
		project?: EditableProject;
		form?: ProjectFormResult | null;
		/** Form action, e.g. "?/create". */
		action: string;
		submitLabel: string;
		/** Shows a Cancel button when set. */
		oncancel?: () => void;
		/** Called after a successful save (the action redirected). */
		onsaved?: () => void;
	};

	let { options, project, form, action, submitLabel, oncancel, onsaved }: Props = $props();

	let submitting = $state(false);
	let dirty = $state(false);
	const markDirty = () => (dirty = true);
	guardUnsavedChanges(() => dirty && !submitting);

	const idOrEmpty = (id: number | null | undefined) => (id == null ? '' : String(id));

	// Refill from the failed submission when there is one, else from the project (or blanks for create).
	const initial = $derived.by((): Record<ProjectField, string> => {
		const p = project;
		const base: Record<ProjectField, string> = {
			title: p?.title ?? '',
			clientId: idOrEmpty(p?.clientId),
			newClient: '',
			partnerId: idOrEmpty(p?.partnerId),
			newPartner: '',
			accountManagerId: idOrEmpty(p?.accountManagerId),
			picId: idOrEmpty(p?.picId),
			phase: p?.phase ?? 'lead',
			platform: p?.platform ?? 'unknown',
			platformDetail: p?.platformDetail ?? '',
			productType: p?.productType ?? '',
			siteUrl: p?.siteUrl ?? '',
			stagingUrl: p?.stagingUrl ?? '',
			productionUrl: p?.productionUrl ?? '',
			repoUrl: p?.repoUrl ?? '',
			domainRegistrar: p?.domainRegistrar ?? '',
			tools: p?.tools.join(', ') ?? '',
			notes: p?.notes ?? ''
		};
		return form?.values ? { ...base, ...form.values } : base;
	});

	const errors = $derived(form?.errors ?? {});
	const hasError = (name: ProjectField) => (errors[name]?.length ?? 0) > 0;
	const errorOf = (name: ProjectField) => errors[name]?.join(' ');

	const errorItems = $derived(
		Object.entries(errors)
			.filter(([, messages]) => messages && messages.length > 0)
			.map(([field, messages]) => ({
				targetId: ERROR_TARGETS[field] ?? `pf-${field}`,
				label: FIELD_LABELS[field] ?? field,
				message: (messages ?? []).join(' ')
			}))
	);

	function describedBy(name: ProjectField, hint?: string): string | undefined {
		const ids = [hint ? `pf-${name}-hint` : '', hasError(name) ? `pf-${name}-error` : ''];
		return ids.filter(Boolean).join(' ') || undefined;
	}

	const phaseOptions = $derived(options.phases.map((p) => ({ value: p, label: optionLabel(p) })));
	const platformOptions = $derived(
		options.platforms.map((p) => ({ value: p, label: optionLabel(p) }))
	);

	const TOOLS_HINT = 'Pick every tool the project uses. Missing one? Type it and press +.';

	function cancel() {
		if (dirty && !confirm('Discard your changes?')) return;
		dirty = false;
		oncancel?.();
	}

	function onUrlBlur(event: FocusEvent & { currentTarget: HTMLInputElement }) {
		const el = event.currentTarget;
		const fixed = withHttps(el.value);
		if (fixed !== el.value) {
			el.value = fixed;
			markDirty();
		}
	}
</script>

{#snippet hintAndError(name: ProjectField, hint?: string)}
	{#if hint}<p id="pf-{name}-hint" class="hint">{hint}</p>{/if}
	{#if hasError(name)}<p id="pf-{name}-error" class="field-error">{errorOf(name)}</p>{/if}
{/snippet}

{#snippet textField(
	name: ProjectField,
	opts: { type?: 'text' | 'url'; hint?: string; placeholder?: string } = {}
)}
	<div>
		<label for="pf-{name}" class="label">{FIELD_LABELS[name]}</label>
		<input
			id="pf-{name}"
			{name}
			type={opts.type ?? 'text'}
			inputmode={opts.type === 'url' ? 'url' : undefined}
			value={initial[name]}
			placeholder={opts.placeholder ?? (opts.type === 'url' ? 'example.com' : undefined)}
			aria-invalid={hasError(name) || undefined}
			aria-describedby={describedBy(name, opts.hint)}
			class="input"
			onblur={opts.type === 'url' ? onUrlBlur : undefined}
		/>
		{@render hintAndError(name, opts.hint)}
	</div>
{/snippet}

{#snippet userSelect(name: 'accountManagerId' | 'picId', hint?: string)}
	<div>
		<label for="pf-{name}" class="label">{FIELD_LABELS[name]}</label>
		<select
			id="pf-{name}"
			{name}
			value={initial[name]}
			aria-invalid={hasError(name) || undefined}
			aria-describedby={describedBy(name, hint)}
			class="input"
		>
			<option value="">Nobody yet</option>
			{#each options.users as user (user.id)}
				<option value={String(user.id)}>{userLabel(user)}</option>
			{/each}
		</select>
		{@render hintAndError(name, hint)}
	</div>
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
		<FormSection step="01" title="Basics" description="What the project is and where it stands.">
			<div class="space-y-5">
				<div>
					<label for="pf-title" class="label">
						Title <span class="text-destructive" aria-hidden="true">*</span>
					</label>
					<input
						id="pf-title"
						name="title"
						value={initial.title}
						required
						maxlength="200"
						placeholder="e.g. TÈRRO Vastgoed – new website"
						aria-invalid={hasError('title') || undefined}
						aria-describedby={describedBy('title')}
						class="input text-lg font-medium"
					/>
					{@render hintAndError('title')}
				</div>

				<ChoiceChips
					name="phase"
					legend="Phase"
					idPrefix="pf-phase"
					options={phaseOptions}
					value={initial.phase}
					error={errorOf('phase')}
					onchange={markDirty}
				/>

				<ChoiceChips
					name="platform"
					legend="Platform"
					idPrefix="pf-platform"
					options={platformOptions}
					value={initial.platform}
					error={errorOf('platform')}
					onchange={markDirty}
				/>

				<div class="grid gap-4 sm:grid-cols-2">
					{@render textField('platformDetail', {
						hint: 'Theme, plan, or page builder',
						placeholder: 'e.g. Dawn theme, Shopify Basic'
					})}
					{@render textField('productType', { placeholder: 'e.g. Real-estate website' })}
				</div>
			</div>
		</FormSection>

		<FormSection step="02" title="People" description="Who it is for, and who runs it at DRP.">
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="pf-clientId" class="label">Client</label>
					<EntityPicker
						id="pf-clientId"
						idName="clientId"
						newName="newClient"
						noun="client"
						options={options.clients}
						selectedId={initial.clientId}
						newValue={initial.newClient}
						invalid={hasError('clientId') || hasError('newClient')}
						describedby={hasError('clientId') || hasError('newClient')
							? 'pf-clientId-error'
							: undefined}
						onchange={markDirty}
					/>
					{#if hasError('clientId') || hasError('newClient')}
						<p id="pf-clientId-error" class="field-error">
							{errorOf('clientId') ?? errorOf('newClient')}
						</p>
					{/if}
				</div>
				<div>
					<label for="pf-partnerId" class="label">Partner agency</label>
					<EntityPicker
						id="pf-partnerId"
						idName="partnerId"
						newName="newPartner"
						noun="partner"
						options={options.partners}
						selectedId={initial.partnerId}
						newValue={initial.newPartner}
						invalid={hasError('partnerId') || hasError('newPartner')}
						describedby={hasError('partnerId') || hasError('newPartner')
							? 'pf-partnerId-error'
							: undefined}
						onchange={markDirty}
					/>
					{#if hasError('partnerId') || hasError('newPartner')}
						<p id="pf-partnerId-error" class="field-error">
							{errorOf('partnerId') ?? errorOf('newPartner')}
						</p>
					{/if}
				</div>
				{@render userSelect('accountManagerId')}
				{@render userSelect('picId', 'Person in charge of the work')}
			</div>
		</FormSection>

		<FormSection
			step="03"
			title="Links and hosting"
			description="Where it lives. Paste a domain; https:// is added for you."
		>
			<div class="grid gap-4 sm:grid-cols-2">
				{@render textField('siteUrl', { type: 'url' })}
				{@render textField('productionUrl', { type: 'url' })}
				{@render textField('stagingUrl', { type: 'url' })}
				{@render textField('repoUrl', { type: 'url', placeholder: 'github.com/…' })}
				{@render textField('domainRegistrar', { placeholder: 'e.g. Combell, TransIP' })}
			</div>
		</FormSection>

		<FormSection step="04" title="Tools and notes">
			<div class="space-y-5">
				<div>
					<label for="pf-tools" class="label">{FIELD_LABELS.tools}</label>
					<ToolPicker
						id="pf-tools"
						name="tools"
						value={initial.tools
							.split(',')
							.map((t) => t.trim())
							.filter(Boolean)}
						options={options.tools}
						describedby={describedBy('tools', TOOLS_HINT)}
						invalid={hasError('tools')}
						onchange={markDirty}
					/>
					{@render hintAndError('tools', TOOLS_HINT)}
				</div>
				<div>
					<label for="pf-notes" class="label">{FIELD_LABELS.notes}</label>
					<textarea
						id="pf-notes"
						name="notes"
						rows="4"
						value={initial.notes}
						placeholder="Anything the next developer should know"
						aria-invalid={hasError('notes') || undefined}
						aria-describedby={describedBy('notes')}
						class="input"></textarea>
					{@render hintAndError('notes')}
				</div>
			</div>
		</FormSection>
	{/key}

	<FormFooter {submitLabel} {submitting} {dirty} oncancel={oncancel ? cancel : undefined} />
</form>
