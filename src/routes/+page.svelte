<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let running = $state(false);

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<h1 class="text-xl font-semibold">Projects</h1>

<section aria-labelledby="projects-heading" class="mt-4">
	<h2 id="projects-heading" class="sr-only">Project list</h2>
	{#if data.projects.length === 0}
		<p
			class="rounded border border-dashed border-border bg-card px-4 py-8 text-center text-muted-foreground"
		>
			No projects yet. Projects appear here when the first request is approved.
		</p>
	{:else}
		<div class="overflow-x-auto rounded border border-border bg-card">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th scope="col" class="px-3 py-2 font-medium">Project</th>
						<th scope="col" class="px-3 py-2 font-medium">Client</th>
						<th scope="col" class="px-3 py-2 font-medium">Phase</th>
						<th scope="col" class="px-3 py-2 font-medium">Platform</th>
						<th scope="col" class="px-3 py-2 font-medium">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project (project.id)}
						<tr class="border-b border-border last:border-0">
							<td class="px-3 py-2 font-medium">{project.title}</td>
							<td class="px-3 py-2">{project.client ?? '–'}</td>
							<td class="px-3 py-2">{project.phase}</td>
							<td class="px-3 py-2">{project.platform}</td>
							<td class="px-3 py-2 text-muted-foreground">{dateTime.format(project.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<section aria-labelledby="system-heading" class="mt-10 rounded border border-border bg-card p-4">
	<h2 id="system-heading" class="font-semibold">System check</h2>
	<p class="mt-1 text-sm text-muted-foreground">
		The hello-world task runs on Trigger.dev and writes a row to the database.
	</p>

	{#if data.canRunTasks}
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
			<button
				class="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-60"
				disabled={running}
			>
				{running ? 'Starting…' : 'Run hello-world task'}
			</button>
		</form>
	{/if}

	<div aria-live="polite" class="mt-2 text-sm">
		{#if form?.error}
			<p class="text-destructive">{form.error}</p>
		{:else if form?.triggeredRunId}
			<p>Task started (run {form.triggeredRunId}). Reload in a few seconds to see its row.</p>
		{/if}
	</div>

	<h3 class="mt-4 text-sm font-medium">Latest task rows</h3>
	{#if data.taskRuns.length === 0}
		<p class="text-sm text-muted-foreground">None yet.</p>
	{:else}
		<ul class="mt-1 space-y-1 text-sm">
			{#each data.taskRuns as run (run.id)}
				<li>
					<time datetime={run.at.toISOString()}>{dateTime.format(run.at)}</time>
					<span class="text-muted-foreground">· {run.actor}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
