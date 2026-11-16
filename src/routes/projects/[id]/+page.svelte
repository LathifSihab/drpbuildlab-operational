<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ProjectForm, {
		FIELD_LABELS,
		optionLabel,
		userLabel
	} from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const project = $derived(data.project);

	// Opens by itself when a save failed, so the errors are visible; Edit / Cancel / a save override it.
	let editing = $derived(Boolean(form?.errors));

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

	const accountManager = $derived.by(() => {
		const user = data.options.users.find((u) => u.id === project.accountManagerId);
		return user ? userLabel(user) : project.accountManagerEmail;
	});

	const ACTION_LABELS: Record<string, string> = {
		'project.created': 'Created',
		'project.updated': 'Updated',
		'project.deleted': 'Deleted',
		'project.restored': 'Restored'
	};

	const isHttpUrl = (url: string | null): url is string => !!url && /^https?:\/\//i.test(url);

	type Change = { field: string; from: unknown; to: unknown };

	function changesOf(diff: Record<string, unknown> | null): Change[] {
		if (!diff) return [];
		return Object.entries(diff).flatMap(([field, value]) =>
			value !== null && typeof value === 'object' && 'from' in value && 'to' in value
				? [{ field, from: value.from, to: value.to }]
				: []
		);
	}

	function nameOf(list: { id: number; name: string }[], id: unknown): string {
		return list.find((item) => item.id === id)?.name ?? `#${String(id)}`;
	}

	function formatValue(field: string, value: unknown): string {
		if (value === null || value === undefined || value === '') return '–';
		if (Array.isArray(value)) return value.length ? value.join(', ') : '–';
		switch (field) {
			case 'clientId':
			case 'partnerId':
				return nameOf([...data.options.clients, ...data.options.partners], value);
			case 'accountManagerId': {
				const user = data.options.users.find((u) => u.id === value);
				return user ? userLabel(user) : `#${String(value)}`;
			}
			case 'phase':
			case 'platform':
				return optionLabel(String(value));
		}
		const text = typeof value === 'string' ? value : JSON.stringify(value);
		return text.length > 80 ? `${text.slice(0, 80)}…` : text;
	}
</script>

<svelte:head>
	<title>{project.title} · DRP Operational</title>
</svelte:head>

{#snippet link(url: string | null)}
	{#if isHttpUrl(url)}
		<a
			href={url}
			target="_blank"
			rel="external noopener noreferrer"
			class="break-all text-accent underline-offset-2 hover:underline">{url}</a
		>
	{:else}
		<span class="text-muted-foreground">{url || '–'}</span>
	{/if}
{/snippet}

{#snippet value(text: string | null | undefined)}
	{#if text}{text}{:else}<span class="text-muted-foreground">–</span>{/if}
{/snippet}

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
	<a href={resolve('/')} class="hover:text-foreground">Projects</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">{project.title}</span>
</nav>

<div class="mt-1 flex flex-wrap items-center gap-3">
	<h1 class="text-xl font-semibold">{project.title}</h1>
	<span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-secondary">
		{optionLabel(project.phase)}
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
		{#if data.canDelete && !project.deletedAt}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (
						!confirm(
							`Delete “${project.title}”? It disappears from the list; an admin can restore it.`
						)
					) {
						cancel();
					}
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

{#if project.deletedAt}
	<div
		class="mt-4 flex flex-wrap items-center gap-3 rounded border border-destructive bg-card px-4 py-3 text-sm"
		role="status"
	>
		<p>
			<strong class="text-destructive">Deleted</strong>
			on
			<time datetime={project.deletedAt.toISOString()}>{dateTime.format(project.deletedAt)}</time>.
			Hidden from the project list; only admins can see it.
		</p>
		{#if data.canDelete}
			<form method="POST" action="?/restore" use:enhance class="ml-auto">
				<button class="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary">
					Restore
				</button>
			</form>
		{/if}
	</div>
{/if}

<div class="mt-4 max-w-4xl">
	{#if editing && data.canEdit}
		<h2 class="sr-only">Edit project</h2>
		<ProjectForm
			options={data.options}
			{project}
			{form}
			action="?/update"
			submitLabel="Save changes"
			oncancel={() => (editing = false)}
			onsaved={() => (editing = false)}
		/>
	{:else}
		<section aria-labelledby="details-heading" class="rounded border border-border bg-card p-4">
			<h2 id="details-heading" class="sr-only">Details</h2>
			<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<dt class="text-muted-foreground">Client</dt>
					<dd>{@render value(project.clientName)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Partner</dt>
					<dd>{@render value(project.partnerName)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Account manager</dt>
					<dd>{@render value(accountManager)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Phase</dt>
					<dd>{optionLabel(project.phase)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Platform</dt>
					<dd>
						{optionLabel(project.platform)}{#if project.platformDetail}
							<span class="text-muted-foreground"> · {project.platformDetail}</span>{/if}
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Product type</dt>
					<dd>{@render value(project.productType)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Site</dt>
					<dd>{@render link(project.siteUrl)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Staging</dt>
					<dd>{@render link(project.stagingUrl)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Production</dt>
					<dd>{@render link(project.productionUrl)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Repository</dt>
					<dd>{@render link(project.repoUrl)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Domain registrar</dt>
					<dd>{@render value(project.domainRegistrar)}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Slug</dt>
					<dd class="font-mono text-xs">{project.slug}</dd>
				</div>
				<div class="sm:col-span-2 lg:col-span-3">
					<dt class="text-muted-foreground">Tools</dt>
					<dd>
						{#if project.tools.length}
							<ul class="mt-0.5 flex flex-wrap gap-1">
								{#each project.tools as tool (tool)}
									<li class="rounded bg-muted px-1.5 py-0.5 text-xs">{tool}</li>
								{/each}
							</ul>
						{:else}
							<span class="text-muted-foreground">–</span>
						{/if}
					</dd>
				</div>
				<div class="sm:col-span-2 lg:col-span-3">
					<dt class="text-muted-foreground">Notes</dt>
					<dd class="whitespace-pre-line">{@render value(project.notes)}</dd>
				</div>
			</dl>
			<p class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
				Created <time datetime={project.createdAt.toISOString()}
					>{dateTime.format(project.createdAt)}</time
				>
				· updated
				<time datetime={project.updatedAt.toISOString()}>{dateTime.format(project.updatedAt)}</time>
			</p>
		</section>
	{/if}
</div>

<section aria-labelledby="history-heading" class="mt-8 max-w-4xl">
	<h2 id="history-heading" class="font-semibold">History</h2>
	{#if data.history.length === 0}
		<p class="mt-1 text-sm text-muted-foreground">No changes recorded.</p>
	{:else}
		<ol class="mt-2 divide-y divide-border rounded border border-border bg-card text-sm">
			{#each data.history as entry (entry.id)}
				{@const changes = entry.action === 'project.updated' ? changesOf(entry.diff) : []}
				<li class="px-3 py-2">
					<p>
						<span class="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
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
										>{FIELD_LABELS[change.field] ?? change.field}:</span
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
