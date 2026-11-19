<script lang="ts" module>
	import type { EditableTask } from '#lib/components/TaskForm.svelte';

	/** One task as the list shows it. */
	export type TaskListItem = EditableTask & {
		projectId: number;
		projectTitle: string;
		assigneeEmail: string | null;
		assigneeName: string | null;
		updatedAt: Date;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import TaskForm, { type TaskFormFailure, type TaskUser } from '#lib/components/TaskForm.svelte';
	import { userLabel } from '#lib/components/ProjectForm.svelte';
	import {
		formatDueDate,
		isOverdue,
		NEXT_STATUS,
		sortTasks,
		TASK_STATUS_LABELS,
		TASK_TYPE_LABELS
	} from '#lib/tasks.ts';

	/**
	 * A project's tasks, or "My tasks" across projects. Status buttons post to `?/setTaskStatus`;
	 * with `canManage`, add / edit / delete post to `?/addTask`, `?/updateTask`, `?/deleteTask`.
	 */
	type Props = {
		tasks: readonly TaskListItem[];
		users: readonly TaskUser[];
		/** YYYY-MM-DD from the server, for "overdue". */
		today: string;
		canChangeStatus: boolean;
		/** Add, edit, and delete (the project page). */
		canManage?: boolean;
		/** Show each task's project ("My tasks"). */
		showProject?: boolean;
		/** The last failed task form, so it opens again with its errors. */
		failure?: TaskFormFailure;
		emptyText: string;
	};

	let {
		tasks,
		users,
		today,
		canChangeStatus,
		canManage = false,
		showProject = false,
		failure,
		emptyText
	}: Props = $props();

	/** The open form: 'new', a task id, or none. A failed save opens its form again. */
	let openForm = $derived<'new' | number | null>(failure ? (failure.taskId ?? 'new') : null);

	const sorted = $derived(sortTasks(tasks));
	const open = $derived(sorted.filter((t) => t.status !== 'done'));
	const done = $derived(sorted.filter((t) => t.status === 'done'));

	const failureFor = (id: 'new' | number) =>
		failure && (failure.taskId ?? 'new') === id ? failure : undefined;

	function assigneeOf(task: TaskListItem): string | null {
		return task.assigneeEmail
			? userLabel({ email: task.assigneeEmail, name: task.assigneeName })
			: null;
	}
</script>

{#snippet statusBadge(task: TaskListItem)}
	<span
		class={[
			'badge',
			task.status === 'in_progress' && 'border-accent text-accent',
			task.status === 'done' && 'border-transparent bg-muted text-muted-foreground'
		]}
	>
		{TASK_STATUS_LABELS[task.status]}
	</span>
{/snippet}

{#snippet row(task: TaskListItem)}
	{@const assignee = assigneeOf(task)}
	{@const overdue = isOverdue(task, today)}
	<li class="py-3 first:pt-0 last:pb-0">
		{#if openForm === task.id && canManage}
			<TaskForm
				{task}
				{users}
				failure={failureFor(task.id)}
				action="?/updateTask"
				onclose={() => (openForm = null)}
			/>
		{:else}
			<div class="flex flex-wrap items-start gap-x-3 gap-y-2">
				<div class="min-w-0 flex-1">
					<p class="flex flex-wrap items-center gap-2">
						{@render statusBadge(task)}
						<span
							class={[
								'font-medium break-words',
								task.status === 'done' && 'text-muted-foreground line-through'
							]}>{task.title}</span
						>
						<span class="badge border-transparent bg-muted">{TASK_TYPE_LABELS[task.type]}</span>
					</p>
					<p class="mt-1 flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
						{#if showProject}
							<a
								href={resolve('/projects/[id]', { id: String(task.projectId) })}
								class="font-medium text-accent underline-offset-2 hover:underline"
								>{task.projectTitle}</a
							>
							<span aria-hidden="true">·</span>
						{/if}
						<span>{assignee ?? 'Unassigned'}</span>
						{#if task.dueDate}
							<span aria-hidden="true">·</span>
							<span class={overdue ? 'font-medium text-destructive' : undefined}>
								{overdue ? 'Overdue, was due' : 'Due'}
								<time datetime={task.dueDate}>{formatDueDate(task.dueDate)}</time>
							</span>
						{/if}
					</p>
					{#if task.description}
						<details class="mt-1.5 text-sm">
							<summary
								class="cursor-pointer text-[13px] text-muted-foreground hover:text-foreground"
							>
								Description
							</summary>
							<p class="mt-1.5 break-words whitespace-pre-line">{task.description}</p>
						</details>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-1.5">
					{#if canChangeStatus}
						{@const next = NEXT_STATUS[task.status]}
						<form method="POST" action="?/setTaskStatus" use:enhance>
							<input type="hidden" name="taskId" value={task.id} />
							<input type="hidden" name="status" value={next.to} />
							<button class="btn btn-line btn-sm">
								{next.label}<span class="sr-only">: {task.title}</span>
							</button>
						</form>
					{/if}
					{#if canManage}
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => (openForm = task.id)}>
							Edit<span class="sr-only">: {task.title}</span>
						</button>
						<form
							method="POST"
							action="?/deleteTask"
							use:enhance={({ cancel }) => {
								if (!confirm(`Delete the task “${task.title}”? This cannot be undone.`)) cancel();
							}}
						>
							<input type="hidden" name="taskId" value={task.id} />
							<button class="btn btn-ghost btn-sm text-destructive hover:text-destructive">
								Delete<span class="sr-only">: {task.title}</span>
							</button>
						</form>
					{/if}
				</div>
			</div>
		{/if}
	</li>
{/snippet}

{#if canManage}
	{#if openForm === 'new'}
		<div class="mb-4">
			<h3 class="sr-only">New task</h3>
			<TaskForm
				{users}
				failure={failureFor('new')}
				action="?/addTask"
				onclose={() => (openForm = null)}
			/>
		</div>
	{:else}
		<button type="button" class="btn btn-line btn-sm mb-4" onclick={() => (openForm = 'new')}>
			<svg viewBox="0 0 16 16" class="size-3" aria-hidden="true"
				><path
					d="M8 3v10M3 8h10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/></svg
			>
			Add task
		</button>
	{/if}
{/if}

{#if open.length === 0}
	<p class="text-sm text-muted-foreground">{emptyText}</p>
{:else}
	<ul class="divide-y divide-border">
		{#each open as task (task.id)}
			{@render row(task)}
		{/each}
	</ul>
{/if}

{#if done.length}
	<details
		class="mt-4 border-t border-border pt-3"
		open={typeof openForm === 'number' && done.some((t) => t.id === openForm)}
	>
		<summary class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
			Done ({done.length})
		</summary>
		<ul class="mt-3 divide-y divide-border">
			{#each done as task (task.id)}
				{@render row(task)}
			{/each}
		</ul>
	</details>
{/if}
