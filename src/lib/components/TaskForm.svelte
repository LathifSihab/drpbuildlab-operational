<script lang="ts" module>
	import type { TaskStatus, TaskType } from '#lib/schemas/task.ts';

	export type TaskUser = { id: number; email: string; name: string | null };

	/** The task columns this form edits. */
	export type EditableTask = {
		id: number;
		title: string;
		type: TaskType;
		status: TaskStatus;
		description: string | null;
		assigneeId: number | null;
		dueDate: string | null;
	};

	/** A failed save of this form: per-field errors and the values that were sent. */
	export type TaskFormFailure = {
		taskId: number | null;
		errors: Partial<Record<string, string[]>>;
		values: Partial<Record<string, string>>;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import ChoiceChips from '#lib/components/ChoiceChips.svelte';
	import { userLabel } from '#lib/components/ProjectForm.svelte';
	import { TASK_STATUSES, TASK_TYPES } from '#lib/schemas/task.ts';
	import { TASK_STATUS_LABELS, TASK_TYPE_HINTS, TASK_TYPE_LABELS } from '#lib/tasks.ts';

	type Props = {
		/** Omitted for a new task. */
		task?: EditableTask;
		users: readonly TaskUser[];
		/** The last failed save of this form, if any. */
		failure?: TaskFormFailure;
		action: string;
		onclose: () => void;
	};

	let { task, users, failure, action, onclose }: Props = $props();

	let submitting = $state(false);

	const prefix = $derived(`task-${task?.id ?? 'new'}`);

	/** What a field shows: the value sent in a failed save, else the task's own. */
	function initial(field: keyof EditableTask): string {
		const sent = failure?.values?.[field];
		if (sent !== undefined) return sent;
		const value = task?.[field];
		return value === null || value === undefined ? '' : String(value);
	}

	const errorOf = (field: string) => failure?.errors?.[field]?.[0];

	/** Field -> the element an error on it focuses, in form order. */
	const FIELD_TARGETS = {
		title: 'title',
		type: 'type',
		status: 'status',
		assigneeId: 'assignee',
		dueDate: 'due',
		description: 'description'
	} as const;

	function focusFirstError() {
		const field = (Object.keys(FIELD_TARGETS) as (keyof typeof FIELD_TARGETS)[]).find(errorOf);
		if (field) document.getElementById(`${prefix}-${FIELD_TARGETS[field]}`)?.focus();
	}

	const typeOptions = TASK_TYPES.map((value) => ({
		value,
		label: TASK_TYPE_LABELS[value],
		description: TASK_TYPE_HINTS[value]
	}));
	const statusOptions = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));
</script>

<!-- The form only listens for Ctrl/Cmd+Enter and Escape bubbling up from its fields; it is never focused itself. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	method="POST"
	{action}
	class="space-y-4 rounded-2xl border border-border bg-muted/40 p-4"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			submitting = false;
			if (result.type === 'success' || result.type === 'redirect') onclose();
			else focusFirstError();
		};
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			e.currentTarget.requestSubmit();
		}
		if (e.key === 'Escape') onclose();
	}}
>
	{#if task}<input type="hidden" name="taskId" value={task.id} />{/if}

	<div>
		<label for="{prefix}-title" class="label">Title</label>
		<!-- The form opens on a click, so focus moves into it. -->
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="{prefix}-title"
			name="title"
			class="input"
			required
			maxlength="200"
			autofocus
			value={initial('title')}
			placeholder="e.g. Add Klaviyo signup form to the footer"
			aria-invalid={errorOf('title') ? 'true' : undefined}
			aria-describedby={errorOf('title') ? `${prefix}-title-error` : undefined}
		/>
		{#if errorOf('title')}
			<p id="{prefix}-title-error" class="field-error">{errorOf('title')}</p>
		{/if}
	</div>

	<ChoiceChips
		name="type"
		legend="Type"
		idPrefix="{prefix}-type"
		options={typeOptions}
		value={initial('type') || 'enhancement'}
		error={errorOf('type')}
	/>

	{#if task}
		<ChoiceChips
			name="status"
			legend="Status"
			idPrefix="{prefix}-status"
			options={statusOptions}
			value={initial('status')}
			error={errorOf('status')}
		/>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<label for="{prefix}-assignee" class="label">Assignee</label>
			<select
				id="{prefix}-assignee"
				name="assigneeId"
				class="input"
				aria-invalid={errorOf('assigneeId') ? 'true' : undefined}
				aria-describedby={errorOf('assigneeId') ? `${prefix}-assignee-error` : undefined}
			>
				<option value="">Nobody yet</option>
				{#each users as user (user.id)}
					<option value={String(user.id)} selected={initial('assigneeId') === String(user.id)}>
						{userLabel(user)}
					</option>
				{/each}
			</select>
			{#if errorOf('assigneeId')}
				<p id="{prefix}-assignee-error" class="field-error">{errorOf('assigneeId')}</p>
			{/if}
		</div>
		<div>
			<label for="{prefix}-due" class="label">Due date</label>
			<input
				id="{prefix}-due"
				name="dueDate"
				type="date"
				class="input"
				value={initial('dueDate')}
				aria-invalid={errorOf('dueDate') ? 'true' : undefined}
				aria-describedby={errorOf('dueDate') ? `${prefix}-due-error` : undefined}
			/>
			{#if errorOf('dueDate')}
				<p id="{prefix}-due-error" class="field-error">{errorOf('dueDate')}</p>
			{/if}
		</div>
	</div>

	<div>
		<label for="{prefix}-description" class="label">Description</label>
		<textarea
			id="{prefix}-description"
			name="description"
			class="input"
			maxlength="10000"
			placeholder="What to do, where, and how to check it is done"
			aria-invalid={errorOf('description') ? 'true' : undefined}
			aria-describedby={errorOf('description') ? `${prefix}-description-error` : undefined}
			value={initial('description')}></textarea>
		{#if errorOf('description')}
			<p id="{prefix}-description-error" class="field-error">{errorOf('description')}</p>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-primary btn-sm" disabled={submitting}>
			{submitting ? 'Saving…' : task ? 'Save task' : 'Add task'}
		</button>
		<button type="button" class="btn btn-line btn-sm" onclick={onclose} disabled={submitting}>
			Cancel
		</button>
		<span class="ml-auto hidden text-[13px] text-muted-foreground sm:inline">
			<kbd class="font-mono text-xs">Ctrl</kbd> / <kbd class="font-mono text-xs">⌘</kbd> +
			<kbd class="font-mono text-xs">Enter</kbd> to save
		</span>
	</div>
</form>
