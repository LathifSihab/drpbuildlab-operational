<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import HistoryList from '#lib/components/HistoryList.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ProjectForm, {
		FIELD_LABELS,
		optionLabel,
		userLabel
	} from '#lib/components/ProjectForm.svelte';
	import TaskList from '#lib/components/TaskList.svelte';
	import {
		formatDueDate,
		TASK_FIELD_LABELS,
		TASK_STATUS_LABELS,
		TASK_TYPE_LABELS
	} from '#lib/tasks.ts';
	import type { TaskStatus, TaskType } from '#lib/schemas/task.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A failed task form (add / edit) comes back as `taskForm`; the project form's as `errors`.
	const taskFailure = $derived(form && 'taskForm' in form ? form.taskForm : undefined);
	const openTaskCount = $derived(data.tasks.filter((t) => t.status !== 'done').length);

	const project = $derived(data.project);

	// Opens by itself when a save failed, so the errors are visible; Edit / Cancel / a save override it.
	let editing = $derived(Boolean(form?.errors));

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

	const accountManager = $derived.by(() => {
		const user = data.options.users.find((u) => u.id === project.accountManagerId);
		return user ? userLabel(user) : project.accountManagerEmail;
	});

	const pic = $derived.by(() => {
		const user = data.options.users.find((u) => u.id === project.picId);
		return user ? userLabel(user) : project.picEmail;
	});

	const ACTION_LABELS: Record<string, string> = {
		'project.created': 'Created',
		'project.updated': 'Updated',
		'project.deleted': 'Deleted',
		'project.restored': 'Restored',
		'task.created': 'Task added',
		'task.updated': 'Task updated',
		'task.deleted': 'Task deleted'
	};

	const HISTORY_FIELD_LABELS = { ...FIELD_LABELS, ...TASK_FIELD_LABELS };

	/** Names the task in a task entry: Task updated “Fix checkout”. */
	function historyNote(entry: { action: string; diff: Record<string, unknown> | null }) {
		const title = entry.diff?.taskTitle;
		return entry.action.startsWith('task.') && typeof title === 'string' ? `“${title}”` : undefined;
	}

	const isHttpUrl = (url: string | null): url is string => !!url && /^https?:\/\//i.test(url);

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
			case 'accountManagerId':
			case 'picId':
			case 'assigneeId': {
				const user = data.options.users.find((u) => u.id === value);
				return user ? userLabel(user) : `#${String(value)}`;
			}
			case 'phase':
			case 'platform':
				return optionLabel(String(value));
			// Task fields
			case 'type':
				return TASK_TYPE_LABELS[value as TaskType] ?? String(value);
			case 'status':
				return TASK_STATUS_LABELS[value as TaskStatus] ?? String(value);
			case 'dueDate':
				return typeof value === 'string' ? formatDueDate(value) : String(value);
		}
		const text = typeof value === 'string' ? value : JSON.stringify(value);
		return text.length > 80 ? `${text.slice(0, 80)}…` : text;
	}

	const links = $derived([
		{ label: 'Site', url: project.siteUrl },
		{ label: 'Production', url: project.productionUrl },
		{ label: 'Staging', url: project.stagingUrl },
		{ label: 'Repository', url: project.repoUrl }
	]);
</script>

<svelte:head>
	<title>{project.title} · DRP Operational</title>
</svelte:head>

{#snippet empty()}<span class="text-muted-foreground">–</span>{/snippet}

{#snippet clientLink(id: number | null, name: string | null)}
	{#if id !== null && name}
		<a
			href={resolve('/clients/[id]', { id: String(id) })}
			class="font-medium text-accent underline-offset-2 hover:underline">{name}</a
		>
	{:else}
		{@render empty()}
	{/if}
{/snippet}

{#snippet breadcrumb()}
	<a href={resolve('/')} class="hover:text-foreground">Projects</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page" class="truncate">{project.title}</span>
{/snippet}

{#snippet badges()}
	<span class="badge border-chip-on bg-chip-on text-on-chip-on">{optionLabel(project.phase)}</span>
	<span class="badge">{optionLabel(project.platform)}</span>
{/snippet}

{#snippet actions()}
	{#if data.canEdit && !editing}
		<button type="button" class="btn btn-primary" onclick={() => (editing = true)}>Edit</button>
	{/if}
	{#if data.canDelete && !project.deletedAt && !editing}
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
			<button class="btn btn-danger">Delete</button>
		</form>
	{/if}
{/snippet}

<PageHeader title={project.title} {breadcrumb} {badges} {actions} />

{#if project.deletedAt}
	<div
		class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
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
				<button class="btn btn-primary btn-sm">Restore</button>
			</form>
		{/if}
	</div>
{/if}

{#if editing && data.canEdit}
	<div class="max-w-4xl">
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
	</div>
{:else}
	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
		<div class="space-y-6">
			<section aria-labelledby="overview-heading" class="card p-5 sm:p-6">
				<h2 id="overview-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
					Overview
				</h2>
				<dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<dt class="text-[13px] text-muted-foreground">Client</dt>
						<dd class="mt-0.5">{@render clientLink(project.clientId, project.clientName)}</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Partner agency</dt>
						<dd class="mt-0.5">{@render clientLink(project.partnerId, project.partnerName)}</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Account manager</dt>
						<dd class="mt-0.5">
							{#if accountManager}{accountManager}{:else}{@render empty()}{/if}
						</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">
							<abbr title="Person in charge" class="no-underline">PIC</abbr>
						</dt>
						<dd class="mt-0.5">
							{#if pic}{pic}{:else}{@render empty()}{/if}
						</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Platform</dt>
						<dd class="mt-0.5">
							{optionLabel(project.platform)}{#if project.platformDetail}
								<span class="text-muted-foreground"> · {project.platformDetail}</span>{/if}
						</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Product type</dt>
						<dd class="mt-0.5">
							{#if project.productType}{project.productType}{:else}{@render empty()}{/if}
						</dd>
					</div>
					<div>
						<dt class="text-[13px] text-muted-foreground">Domain registrar</dt>
						<dd class="mt-0.5">
							{#if project.domainRegistrar}{project.domainRegistrar}{:else}{@render empty()}{/if}
						</dd>
					</div>
				</dl>
			</section>

			<section aria-labelledby="tasks-heading" class="card p-5 sm:p-6">
				<h2
					id="tasks-heading"
					class="mb-4 flex items-baseline gap-2 font-display text-lg font-bold [font-stretch:90%]"
				>
					Tasks
					{#if openTaskCount}
						<span class="font-sans text-[13px] font-normal text-muted-foreground"
							>{openTaskCount} open</span
						>
					{/if}
				</h2>
				<TaskList
					tasks={data.tasks}
					users={data.options.users}
					today={data.today}
					canChangeStatus={data.canEditTasks}
					canManage={data.canEditTasks}
					failure={taskFailure}
					emptyText="No open tasks. Add enhancements, revisions, and fixes for this project here."
				/>
			</section>

			<section aria-labelledby="links-heading" class="card p-5 sm:p-6">
				<h2 id="links-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
					Links
				</h2>
				<dl class="divide-y divide-border text-sm">
					{#each links as item (item.label)}
						<div class="flex gap-4 py-2.5 first:pt-0 last:pb-0">
							<dt class="w-28 shrink-0 text-[13px] text-muted-foreground">{item.label}</dt>
							<dd class="min-w-0">
								{#if isHttpUrl(item.url)}
									<a
										href={item.url}
										target="_blank"
										rel="external noopener noreferrer"
										class="inline-flex items-center gap-1 break-all text-accent underline-offset-2 hover:underline"
									>
										{item.url.replace(/^https?:\/\//, '')}
										<svg viewBox="0 0 16 16" class="size-3 shrink-0" aria-hidden="true"
											><path
												d="M6 3h7v7M13 3L5 11"
												fill="none"
												stroke="currentColor"
												stroke-width="1.6"
												stroke-linecap="round"
											/></svg
										>
										<span class="sr-only">(opens in a new tab)</span>
									</a>
								{:else}
									{@render empty()}
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</section>

			<section aria-labelledby="notes-heading" class="card p-5 sm:p-6">
				<h2 id="notes-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
					Tools and notes
				</h2>
				{#if project.tools.length}
					<ul class="mb-4 flex flex-wrap gap-1.5">
						{#each project.tools as tool (tool)}
							<li class="badge">{tool}</li>
						{/each}
					</ul>
				{/if}
				{#if project.notes}
					<p class="text-sm whitespace-pre-line">{project.notes}</p>
				{:else if !project.tools.length}
					<p class="text-sm text-muted-foreground">No tools or notes yet.</p>
				{/if}
			</section>

			<p class="text-xs text-muted-foreground">
				<span class="font-mono">{project.slug}</span>
				· created
				<time datetime={project.createdAt.toISOString()}>{dateTime.format(project.createdAt)}</time>
				· updated
				<time datetime={project.updatedAt.toISOString()}>{dateTime.format(project.updatedAt)}</time>
			</p>
		</div>

		<section aria-labelledby="history-heading" class="card p-5 lg:sticky lg:top-20">
			<h2 id="history-heading" class="mb-4 font-display text-lg font-bold [font-stretch:90%]">
				History
			</h2>
			<HistoryList
				entries={data.history}
				actionLabels={ACTION_LABELS}
				fieldLabels={HISTORY_FIELD_LABELS}
				format={formatValue}
				note={historyNote}
			/>
		</section>
	</div>
{/if}
