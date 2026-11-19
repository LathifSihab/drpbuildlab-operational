<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { optionLabel } from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let running = $state(false);

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
</script>

{#snippet actions()}
	<form method="GET" role="search" class="flex gap-2">
		{#if data.showDeleted}<input type="hidden" name="deleted" value="1" />{/if}
		<label for="q" class="sr-only">Search projects or clients</label>
		<input
			id="q"
			name="q"
			type="search"
			value={data.q}
			placeholder="Search project or client"
			class="input w-64 rounded-full py-2"
		/>
		<button class="btn btn-line">Search</button>
	</form>
	{#if data.canSeeDeleted}
		<a href={data.showDeleted ? resolve('/') : resolve('/?deleted=1')} class="btn btn-ghost">
			{data.showDeleted ? 'Back to projects' : 'Show deleted'}
		</a>
	{/if}
	{#if data.canCreate && !data.showDeleted}
		<a href={resolve('/projects/new')} class="btn btn-primary">
			<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true"
				><path
					d="M8 3v10M3 8h10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/></svg
			>
			New project
		</a>
	{/if}
{/snippet}

<PageHeader title={data.showDeleted ? 'Deleted projects' : 'Projects'} {actions} />

<section aria-labelledby="projects-heading">
	<h2 id="projects-heading" class="sr-only">Project list</h2>
	{#if data.projects.length === 0}
		<p class="card border-dashed px-4 py-12 text-center text-muted-foreground">
			{#if data.q}
				No projects match “{data.q}”.
			{:else if data.showDeleted}
				No deleted projects.
			{:else}
				No projects yet. Create one with “New project”, or they appear when a request is approved.
			{/if}
		</p>
	{:else}
		<div class="card overflow-x-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th scope="col">Project</th>
						<th scope="col">Client</th>
						<th scope="col"><abbr title="Person in charge" class="no-underline">PIC</abbr></th>
						<th scope="col">Phase</th>
						<th scope="col">Platform</th>
						<th scope="col">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project (project.id)}
						<tr>
							<td class="font-medium">
								<a
									href={resolve('/projects/[id]', { id: String(project.id) })}
									class="hover:text-accent hover:underline"
								>
									{project.title}
								</a>
							</td>
							<td>{project.client ?? '–'}</td>
							<td class="text-muted-foreground">{project.picName ?? project.picEmail ?? '–'}</td>
							<td><span class="badge">{optionLabel(project.phase)}</span></td>
							<td class="text-muted-foreground">{optionLabel(project.platform)}</td>
							<td class="text-muted-foreground">{dateTime.format(project.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-2 text-[13px] text-muted-foreground">
			{data.projects.length}
			{data.projects.length === 1 ? 'project' : 'projects'}
		</p>
	{/if}
</section>

<!-- Trigger.dev check: part of Phase 2 now (docs/PLAN.md), so folded away. -->
{#if data.canRunTasks}
	<details class="card mt-10 p-4 text-sm">
		<summary class="cursor-pointer font-medium text-muted-foreground">
			System check (Trigger.dev, Phase 2)
		</summary>
		<p class="mt-2 text-muted-foreground">
			The hello-world task runs on Trigger.dev and writes a row to the database.
		</p>
		<form
			method="POST"
			action="?/helloWorld"
			class="mt-3"
			use:enhance={() => {
				running = true;
				return async ({ update }) => {
					await update();
					running = false;
				};
			}}
		>
			<button class="btn btn-line btn-sm" disabled={running}>
				{running ? 'Starting…' : 'Run hello-world task'}
			</button>
		</form>
		<div aria-live="polite" class="mt-2">
			{#if form?.error}
				<p class="text-destructive">{form.error}</p>
			{:else if form?.triggeredRunId}
				<p>Task started (run {form.triggeredRunId}). Reload in a few seconds to see its row.</p>
			{/if}
		</div>
		<h3 class="mt-4 font-medium">Latest task rows</h3>
		{#if data.taskRuns.length === 0}
			<p class="text-muted-foreground">None yet.</p>
		{:else}
			<ul class="mt-1 space-y-1">
				{#each data.taskRuns as run (run.id)}
					<li>
						<time datetime={run.at.toISOString()}>{dateTime.format(run.at)}</time>
						<span class="text-muted-foreground">· {run.actor}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</details>
{/if}
