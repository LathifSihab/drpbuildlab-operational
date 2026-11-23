<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TaskList from '#lib/components/TaskList.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const taskFailure = $derived(form && 'taskForm' in form ? form.taskForm : undefined);

	const title = $derived(data.everyone ? 'All tasks' : 'My tasks');
</script>

<svelte:head>
	<title>{title} · DRP Operational</title>
</svelte:head>

{#snippet actions()}
	<nav aria-label="Whose tasks" class="flex gap-2">
		<a
			href={resolve('/tasks')}
			class={['chip', !data.everyone && 'border-chip-on bg-chip-on text-on-chip-on']}
			aria-current={!data.everyone ? 'page' : undefined}>Mine</a
		>
		<a
			href={resolve('/tasks?who=all')}
			class={['chip', data.everyone && 'border-chip-on bg-chip-on text-on-chip-on']}
			aria-current={data.everyone ? 'page' : undefined}>Everyone</a
		>
	</nav>
{/snippet}

<PageHeader
	{title}
	description={`Open tasks across projects, and those finished in the last ${data.doneDays} days. Add a task here or on its project; edit tasks on the project page.`}
	{actions}
/>

<section aria-labelledby="task-list-heading" class="card p-5 sm:p-6">
	<h2 id="task-list-heading" class="sr-only">Task list</h2>
	<TaskList
		tasks={data.tasks}
		users={data.users}
		today={data.today}
		canChangeStatus={data.canChangeStatus}
		canAdd={data.canAdd}
		projects={data.projects}
		defaultAssigneeId={data.me}
		failure={taskFailure}
		showProject
		emptyText={data.everyone
			? 'No open tasks on any project.'
			: 'Nothing assigned to you. Add a task above, or get one assigned on a project page.'}
	/>
</section>
