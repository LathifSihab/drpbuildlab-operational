<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ClientForm, { CLIENT_FIELD_LABELS } from '#lib/components/ClientForm.svelte';
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

	type Change = { field: string; from: unknown; to: unknown };

	function changesOf(diff: Record<string, unknown> | null): Change[] {
		if (!diff) return [];
		return Object.entries(diff).flatMap(([field, value]) =>
			value !== null && typeof value === 'object' && 'from' in value && 'to' in value
				? [{ field, from: value.from, to: value.to }]
				: []
		);
	}

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
</script>

<svelte:head>
	<title>{client.name} · DRP Operational</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
	<a href={resolve('/clients')} class="hover:text-foreground">Clients</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">{client.name}</span>
</nav>

<div class="mt-1 flex flex-wrap items-center gap-3">
	<h1 class="text-xl font-semibold">{client.name}</h1>
	<span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-secondary">
		{client.isPartner ? 'Partner' : 'Client'}
	</span>
	<div class="ml-auto flex gap-2">
		{#if data.canEdit && !editing}
			<button
				type="button"
				class="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary"
				onclick={() => (editing = true)}
			>
				Edit
			</button>
		{/if}
		{#if data.canDelete && inUse === 0}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm(`Delete “${client.name}”? This cannot be undone.`)) cancel();
				}}
			>
				<button
					class="rounded border border-destructive px-3 py-1.5 text-sm font-medium text-destructive hover:bg-muted"
				>
					Delete
				</button>
			</form>
		{/if}
	</div>
</div>

<div aria-live="polite">
	{#if form?.deleteError}
		<p
			class="mt-3 rounded border border-destructive px-3 py-2 text-sm text-destructive"
			role="alert"
		>
			{form.deleteError}
		</p>
	{/if}
</div>

<div class="mt-4 max-w-4xl">
	{#if editing && data.canEdit}
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
	{:else}
		<section aria-labelledby="details-heading" class="rounded border border-border bg-card p-4">
			<h2 id="details-heading" class="sr-only">Details</h2>
			<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-muted-foreground">Type</dt>
					<dd>{client.isPartner ? 'Partner agency' : 'Client'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Email domains</dt>
					<dd>
						{#if client.emailDomains.length}
							<ul class="mt-0.5 flex flex-wrap gap-1">
								{#each client.emailDomains as domain (domain)}
									<li class="rounded bg-muted px-1.5 py-0.5 text-xs">{domain}</li>
								{/each}
							</ul>
						{:else}
							<span class="text-muted-foreground">–</span>
						{/if}
					</dd>
				</div>
				{#if data.canSeePersonal}
					<div class="sm:col-span-2">
						<dt class="text-muted-foreground">Notes</dt>
						<dd class="whitespace-pre-line">
							{#if notes}{notes}{:else}<span class="text-muted-foreground">–</span>{/if}
						</dd>
					</div>
				{/if}
			</dl>

			{#if data.canSeePersonal}
				<h3 class="mt-4 text-sm font-medium">Contacts</h3>
				{#if contacts.length === 0}
					<p class="text-sm text-muted-foreground">No contacts.</p>
				{:else}
					<div class="mt-1 overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead class="border-b border-border text-muted-foreground">
								<tr>
									<th scope="col" class="py-1.5 pr-3 font-medium">Name</th>
									<th scope="col" class="py-1.5 pr-3 font-medium">Email</th>
									<th scope="col" class="py-1.5 pr-3 font-medium">Phone</th>
									<th scope="col" class="py-1.5 font-medium">Role</th>
								</tr>
							</thead>
							<tbody>
								{#each contacts as contact, i (i)}
									<tr class="border-b border-border last:border-0">
										<td class="py-1.5 pr-3">{contact.name}</td>
										<td class="py-1.5 pr-3">
											{#if contact.email}
												<a href="mailto:{contact.email}" class="text-accent hover:underline"
													>{contact.email}</a
												>
											{:else}<span class="text-muted-foreground">–</span>{/if}
										</td>
										<td class="py-1.5 pr-3">{contact.phone ?? '–'}</td>
										<td class="py-1.5">{contact.role ?? '–'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{:else}
				<p class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
					Contacts and notes are visible to admins and developers only.
				</p>
			{/if}

			<p class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
				Created <time datetime={client.createdAt.toISOString()}
					>{dateTime.format(client.createdAt)}</time
				>
				· updated
				<time datetime={client.updatedAt.toISOString()}>{dateTime.format(client.updatedAt)}</time>
				{#if data.canDelete && inUse > 0}
					· can be deleted once no project uses it
				{/if}
			</p>
		</section>
	{/if}
</div>

<section aria-labelledby="projects-heading" class="mt-8 max-w-4xl">
	<h2 id="projects-heading" class="font-semibold">Projects</h2>
	{#if data.projects.length === 0}
		<p class="mt-1 text-sm text-muted-foreground">No projects yet.</p>
	{:else}
		<div class="mt-2 overflow-x-auto rounded border border-border bg-card">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th scope="col" class="px-3 py-2 font-medium">Project</th>
						<th scope="col" class="px-3 py-2 font-medium">As</th>
						<th scope="col" class="px-3 py-2 font-medium">Phase</th>
						<th scope="col" class="px-3 py-2 font-medium">Platform</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project (project.id)}
						<tr class="border-b border-border last:border-0">
							<td class="px-3 py-2 font-medium">
								<a
									href={resolve('/projects/[id]', { id: String(project.id) })}
									class="text-accent hover:underline">{project.title}</a
								>
								{#if project.deletedAt}
									<span class="ml-1 text-xs font-normal text-destructive">(deleted)</span>
								{/if}
							</td>
							<td class="px-3 py-2">{project.as === 'client' ? 'End client' : 'Partner'}</td>
							<td class="px-3 py-2">{optionLabel(project.phase)}</td>
							<td class="px-3 py-2">{optionLabel(project.platform)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<section aria-labelledby="history-heading" class="mt-8 max-w-4xl">
	<h2 id="history-heading" class="font-semibold">History</h2>
	{#if data.history.length === 0}
		<p class="mt-1 text-sm text-muted-foreground">No changes recorded.</p>
	{:else}
		<ol class="mt-2 divide-y divide-border rounded border border-border bg-card text-sm">
			{#each data.history as entry (entry.id)}
				{@const changes = entry.action === 'client.updated' ? changesOf(entry.diff) : []}
				<li class="px-3 py-2">
					<p>
						<span class="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
						{#if entry.action === 'client.created' && entry.diff?.via}
							<span class="text-muted-foreground">from the project form</span>
						{/if}
						<span class="text-muted-foreground">
							by {entry.actor} ·
							<time datetime={entry.at.toISOString()}>{dateTime.format(entry.at)}</time>
						</span>
					</p>
					{#if changes.length}
						<ul class="mt-1 space-y-0.5 text-xs">
							{#each changes as change (change.field)}
								<li>
									<span class="text-muted-foreground"
										>{CLIENT_FIELD_LABELS[change.field] ?? change.field}:</span
									>
									<del class="text-muted-foreground">{formatValue(change.field, change.from)}</del>
									<span aria-hidden="true">→</span>
									<span class="sr-only">changed to</span>
									<ins class="no-underline">{formatValue(change.field, change.to)}</ins>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
