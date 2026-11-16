<script lang="ts" module>
	import type { ProjectField } from '#lib/schemas/project.ts';

	type Named = { id: number; name: string };

	/** What the project pages' load functions return as `options`. */
	export type ProjectOptions = {
		clients: Named[];
		partners: Named[];
		users: { id: number; email: string; name: string | null }[];
		phases: readonly string[];
		platforms: readonly string[];
	};

	/** The project columns this form edits. */
	export type EditableProject = {
		title: string;
		clientId: number | null;
		partnerId: number | null;
		accountManagerId: number | null;
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

	const SPECIAL_LABELS: Record<string, string> = { uat: 'UAT', drp_custom: 'DRP custom' };

	/** Display label for a phase or platform value, e.g. `drp_custom` -> "DRP custom". */
	export function optionLabel(value: string): string {
		const label = SPECIAL_LABELS[value] ?? value.replaceAll('_', ' ');
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	export function userLabel(user: { email: string; name: string | null }): string {
		return user.name ? `${user.name} (${user.email})` : user.email;
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';

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
	const errorCount = $derived(Object.values(errors).filter((e) => e && e.length > 0).length);

	const hasError = (name: ProjectField) => (errors[name]?.length ?? 0) > 0;

	function describedBy(name: ProjectField, hint?: string): string | undefined {
		const ids = [hint ? `pf-${name}-hint` : '', hasError(name) ? `pf-${name}-error` : ''];
		return ids.filter(Boolean).join(' ') || undefined;
	}

	const inputClass =
		'mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm aria-invalid:border-destructive';
</script>

{#snippet hintAndError(name: ProjectField, hint?: string)}
	{#if hint}
		<p id="pf-{name}-hint" class="mt-1 text-xs text-muted-foreground">{hint}</p>
	{/if}
	{#if hasError(name)}
		<p id="pf-{name}-error" class="mt-1 text-xs text-destructive">{errors[name]?.join(' ')}</p>
	{/if}
{/snippet}

{#snippet textField(name: ProjectField, type: 'text' | 'url' = 'text', hint?: string)}
	<div>
		<label for="pf-{name}" class="block text-sm font-medium">{FIELD_LABELS[name]}</label>
		<input
			id="pf-{name}"
			{name}
			{type}
			value={initial[name]}
			placeholder={type === 'url' ? 'https://' : undefined}
			aria-invalid={hasError(name) || undefined}
			aria-describedby={describedBy(name, hint)}
			class={inputClass}
		/>
		{@render hintAndError(name, hint)}
	</div>
{/snippet}

{#snippet orgField(
	idName: 'clientId' | 'partnerId',
	newName: 'newClient' | 'newPartner',
	choices: Named[]
)}
	<div>
		<label for="pf-{idName}" class="block text-sm font-medium">{FIELD_LABELS[idName]}</label>
		<select
			id="pf-{idName}"
			name={idName}
			value={initial[idName]}
			aria-invalid={hasError(idName) || undefined}
			aria-describedby={describedBy(idName)}
			class={inputClass}
		>
			<option value="">None</option>
			{#each choices as choice (choice.id)}
				<option value={String(choice.id)}>{choice.name}</option>
			{/each}
		</select>
		{@render hintAndError(idName)}
	</div>
	<div>
		<label for="pf-{newName}" class="block text-sm font-medium">
			Or add a {idName === 'clientId' ? 'new client' : 'new partner'}
		</label>
		<input
			id="pf-{newName}"
			name={newName}
			value={initial[newName]}
			aria-invalid={hasError(newName) || undefined}
			aria-describedby={describedBy(newName, 'Replaces the selection when filled in')}
			class={inputClass}
		/>
		{@render hintAndError(newName, 'Replaces the selection when filled in')}
	</div>
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
		<legend class="px-1 text-sm font-semibold">Project</legend>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<div class="sm:col-span-2 lg:col-span-3">
				<label for="pf-title" class="block text-sm font-medium">
					Title <span class="text-destructive" aria-hidden="true">*</span>
				</label>
				<input
					id="pf-title"
					name="title"
					value={initial.title}
					required
					maxlength="200"
					aria-invalid={hasError('title') || undefined}
					aria-describedby={describedBy('title')}
					class={inputClass}
				/>
				{@render hintAndError('title')}
			</div>

			<div>
				<label for="pf-phase" class="block text-sm font-medium">{FIELD_LABELS.phase}</label>
				<select
					id="pf-phase"
					name="phase"
					value={initial.phase}
					aria-invalid={hasError('phase') || undefined}
					aria-describedby={describedBy('phase')}
					class={inputClass}
				>
					{#each options.phases as phase (phase)}
						<option value={phase}>{optionLabel(phase)}</option>
					{/each}
				</select>
				{@render hintAndError('phase')}
			</div>

			<div>
				<label for="pf-platform" class="block text-sm font-medium">{FIELD_LABELS.platform}</label>
				<select
					id="pf-platform"
					name="platform"
					value={initial.platform}
					aria-invalid={hasError('platform') || undefined}
					aria-describedby={describedBy('platform')}
					class={inputClass}
				>
					{#each options.platforms as platform (platform)}
						<option value={platform}>{optionLabel(platform)}</option>
					{/each}
				</select>
				{@render hintAndError('platform')}
			</div>

			{@render textField('platformDetail', 'text', 'e.g. theme name, plan, page builder')}
			{@render textField('productType')}
		</div>
	</fieldset>

	<fieldset class="rounded border border-border bg-card p-4">
		<legend class="px-1 text-sm font-semibold">People</legend>
		<div class="grid gap-3 sm:grid-cols-2">
			{@render orgField('clientId', 'newClient', options.clients)}
			{@render orgField('partnerId', 'newPartner', options.partners)}
			<div>
				<label for="pf-accountManagerId" class="block text-sm font-medium">
					{FIELD_LABELS.accountManagerId}
				</label>
				<select
					id="pf-accountManagerId"
					name="accountManagerId"
					value={initial.accountManagerId}
					aria-invalid={hasError('accountManagerId') || undefined}
					aria-describedby={describedBy('accountManagerId')}
					class={inputClass}
				>
					<option value="">None</option>
					{#each options.users as user (user.id)}
						<option value={String(user.id)}>{userLabel(user)}</option>
					{/each}
				</select>
				{@render hintAndError('accountManagerId')}
			</div>
		</div>
	</fieldset>

	<fieldset class="rounded border border-border bg-card p-4">
		<legend class="px-1 text-sm font-semibold">Links and hosting</legend>
		<div class="grid gap-3 sm:grid-cols-2">
			{@render textField('siteUrl', 'url')}
			{@render textField('stagingUrl', 'url')}
			{@render textField('productionUrl', 'url')}
			{@render textField('repoUrl', 'url')}
			{@render textField('domainRegistrar')}
		</div>
	</fieldset>

	<fieldset class="rounded border border-border bg-card p-4">
		<legend class="px-1 text-sm font-semibold">Other</legend>
		<div class="grid gap-3">
			{@render textField('tools', 'text', 'Comma-separated, e.g. Klaviyo, Google Analytics')}
			<div>
				<label for="pf-notes" class="block text-sm font-medium">{FIELD_LABELS.notes}</label>
				<textarea
					id="pf-notes"
					name="notes"
					rows="5"
					value={initial.notes}
					aria-invalid={hasError('notes') || undefined}
					aria-describedby={describedBy('notes')}
					class={inputClass}></textarea>
				{@render hintAndError('notes')}
			</div>
		</div>
	</fieldset>

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
