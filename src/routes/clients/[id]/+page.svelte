<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ClientForm, { CLIENT_FIELD_LABELS } from '#lib/components/ClientForm.svelte';
	import HistoryList, { type HistoryEntry } from '#lib/components/HistoryList.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { optionLabel } from '#lib/components/ProjectForm.svelte';
	import type { Contact } from '#lib/schemas/client.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const client = $derived(data.client);
	const contacts = $derived('contacts' in client ? client.contacts : []);
	const notes = $derived('notes' in client ? client.notes : null);
	const inUse = $derived(data.usage.asClient + data.usage.asPartner);

	// Opens by itself when a save failed, so the errors are visible; Edit / Cancel / a save override it.
	let editing = $derived(Boolean(form?.errors));

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

	const ACTION_LABELS: Record<string, string> = {
		'client.created': 'Created',
		'client.updated': 'Updated',
		'client.deleted': 'Deleted'
	};

	function formatValue(field: string, value: unknown): string {
		if (value === null || value === undefined || value === '') return '–';
		if (field === 'isPartner') return value ? 'Partner' : 'Client';
		if (field === 'contacts' && Array.isArray(value)) {
			// Full details, so a changed phone or role shows; this history is admin and dev only.
			return value.length
				? (value as Contact[])
						.map((c) => [c.name, c.email, c.phone, c.role].filter(Boolean).join(', '))
						.join('; ')
				: '–';
		}
		if (Array.isArray(value)) return value.length ? value.join(', ') : '–';
		const text = typeof value === 'string' ? value : JSON.stringify(value);
		return text.length > 160 ? `${text.slice(0, 160)}…` : text;
	}

	const historyNote = (entry: HistoryEntry) =>
		entry.action === 'client.created' && entry.diff?.via ? 'from the project form' : undefined;
</script>

<svelte:head>
	<title>{client.name} · DRP Operational</title>
</svelte:head>

{#snippet empty()}<span class="text-muted-foreground">–</span>{/snippet}

{#snippet breadcrumb()}
	<a href={resolve('/clients')} class="hover:text-foreground">Clients</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page" class="truncate">{client.name}</span>
{/snippet}

{#snippet badges()}
	<span class={['badge', client.isPartner && 'border-accent text-accent']}>
		{client.isPartner ? 'Partner agency' : 'Client'}
	</span>
{/snippet}

{#snippet actions()}
	{#if data.canEdit && !editing}
		<button type="button" class="btn btn-primary" onclick={() => (editing = true)}>Edit</button>
	{/if}
	{#if data.canDelete && inUse === 0 && !editing}
		<form
			method="POST"
			action="?/delete"
			use:enhance={({ cancel }) => {
				if (!confirm(`Delete “${client.name}”? This cannot be undone.`)) cancel();
			}}
		>
			<button class="btn btn-danger">Delete</button>
		</form>
	{/if}
{/snippet}

<PageHeader title={client.name} {breadcrumb} {badges} {actions} />

<div aria-live="polite">
	{#if form?.deleteError}
		<p
			class="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			{form.deleteError}
		</p>
	{/if}
</div>

{#if editing && data.canEdit}
	<div class="max-w-4xl">
		<h2 class="sr-only">Edit client</h2>
		<ClientForm
			client={{ ...client, contacts, notes }}
			{form}
			canSeePersonal={data.canSeePersonal}
			action="?/update"
			submitLabel="Save changes"
			oncancel={() => (editing = false)}
			onsaved={() => (editing = false)}
		/>
	</div>
{:else}
	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
		<div class="space-y-6">
			<section aria-labelledby="company-heading" class="card p-5 sm:p-6">
				<h2 id="company-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
					Company
				</h2>
				<dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-[13px] text-muted-foreground">Type</dt>
						<dd class="mt-0.5">
							{client.isPartner
								? 'Partner agency (resells our work)'
								: 'Client (hires us directly)'}
						</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Email domains</dt>
						<dd class="mt-1">
							{#if client.emailDomains.length}
								<ul class="flex flex-wrap gap-1.5">
									{#each client.emailDomains as domain (domain)}
										<li class="badge font-mono">{domain}</li>
									{/each}
								</ul>
							{:else}
								{@render empty()}
							{/if}
						</dd>
					</div>
				</dl>
			</section>

			{#if data.canSeePersonal}
				<section aria-labelledby="contacts-heading" class="card p-5 sm:p-6">
					<h2 id="contacts-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
						Contacts
					</h2>
					{#if contacts.length === 0}
						<p class="text-sm text-muted-foreground">No contacts yet.</p>
					{:else}
						<ul class="grid gap-3 sm:grid-cols-2">
							{#each contacts as contact, i (i)}
								<li class="rounded-xl border border-border p-4 text-sm">
									<p class="font-semibold">{contact.name}</p>
									{#if contact.role}<p class="text-muted-foreground">{contact.role}</p>{/if}
									<div class="mt-2 space-y-0.5">
										{#if contact.email}
											<a
												href="mailto:{contact.email}"
												class="block break-all text-accent hover:underline">{contact.email}</a
											>
										{/if}
										{#if contact.phone}
											<a
												href="tel:{contact.phone.replace(/[^\d+]/g, '')}"
												class="block hover:underline">{contact.phone}</a
											>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					{/if}
					{#if notes}
						<h3 class="mt-6 mb-1 text-[13px] text-muted-foreground">Notes</h3>
						<p class="text-sm whitespace-pre-line">{notes}</p>
					{/if}
				</section>
			{:else}
				<p class="card px-5 py-4 text-sm text-muted-foreground">
					Contacts and notes are visible to admins and developers only.
				</p>
			{/if}

			<section aria-labelledby="projects-heading" class="card overflow-hidden">
				<h2
					id="projects-heading"
					class="px-5 pt-5 pb-3 font-display text-lg font-bold [font-stretch:90%] sm:px-6"
				>
					Projects
				</h2>
				{#if data.projects.length === 0}
					<p class="px-5 pb-5 text-sm text-muted-foreground sm:px-6">No projects yet.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="data-table">
							<thead>
								<tr>
									<th scope="col">Project</th>
									<th scope="col">As</th>
									<th scope="col">Phase</th>
									<th scope="col">Platform</th>
								</tr>
							</thead>
							<tbody>
								{#each data.projects as project (project.id)}
									<tr>
										<td class="font-medium">
											<a
												href={resolve('/projects/[id]', { id: String(project.id) })}
												class="hover:text-accent hover:underline">{project.title}</a
											>
											{#if project.deletedAt}
												<span class="ml-1 text-xs font-normal text-destructive">(deleted)</span>
											{/if}
										</td>
										<td>{project.as === 'client' ? 'End client' : 'Partner'}</td>
										<td><span class="badge">{optionLabel(project.phase)}</span></td>
										<td class="text-muted-foreground">{optionLabel(project.platform)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<p class="text-xs text-muted-foreground">
				Created
				<time datetime={client.createdAt.toISOString()}>{dateTime.format(client.createdAt)}</time>
				· updated
				<time datetime={client.updatedAt.toISOString()}>{dateTime.format(client.updatedAt)}</time>
				{#if data.canDelete && inUse > 0}
					· can be deleted once no project uses it
				{/if}
			</p>
		</div>

		<section aria-labelledby="history-heading" class="card p-5 lg:sticky lg:top-20">
			<h2 id="history-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
				History
			</h2>
			<HistoryList
				entries={data.history}
				actionLabels={ACTION_LABELS}
				fieldLabels={CLIENT_FIELD_LABELS}
				format={formatValue}
				note={historyNote}
			/>
		</section>
	</div>
{/if}
