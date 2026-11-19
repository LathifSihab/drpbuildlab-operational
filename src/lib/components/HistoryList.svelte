<script lang="ts" module>
	export type HistoryEntry = {
		id: number;
		at: Date;
		actor: string;
		action: string;
		diff: Record<string, unknown> | null;
	};
</script>

<script lang="ts">
	/** An entity's audit trail: who did what, and for updates the fields that changed. */
	type Props = {
		entries: readonly HistoryEntry[];
		/** e.g. { 'project.created': 'Created' } */
		actionLabels: Record<string, string>;
		fieldLabels: Record<string, string>;
		/** Display text for one field value. */
		format: (field: string, value: unknown) => string;
		/** Extra words after the action, e.g. "from the project form". */
		note?: (entry: HistoryEntry) => string | undefined;
	};

	let { entries, actionLabels, fieldLabels, format, note }: Props = $props();

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

	type Change = { field: string; from: unknown; to: unknown };

	function changesOf(entry: HistoryEntry): Change[] {
		if (!entry.action.endsWith('.updated') || !entry.diff) return [];
		return Object.entries(entry.diff).flatMap(([field, value]) =>
			value !== null && typeof value === 'object' && 'from' in value && 'to' in value
				? [{ field, from: value.from, to: value.to }]
				: []
		);
	}
</script>

{#if entries.length === 0}
	<p class="text-sm text-muted-foreground">No changes recorded.</p>
{:else}
	<ol class="relative space-y-4 border-l border-border pl-5 text-sm">
		{#each entries as entry (entry.id)}
			{@const changes = changesOf(entry)}
			{@const extra = note?.(entry)}
			<li class="relative">
				<span
					class="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-primary"
					aria-hidden="true"
				></span>
				<p>
					<span class="font-semibold">{actionLabels[entry.action] ?? entry.action}</span>
					{#if extra}<span class="text-muted-foreground">{extra}</span>{/if}
				</p>
				<p class="text-[13px] text-muted-foreground">
					{entry.actor} ·
					<time datetime={entry.at.toISOString()}>{dateTime.format(entry.at)}</time>
				</p>
				{#if changes.length}
					<ul class="mt-2 space-y-1 rounded-xl bg-muted/60 px-3 py-2 text-[13px]">
						{#each changes as change (change.field)}
							<li class="break-words">
								<span class="text-muted-foreground"
									>{fieldLabels[change.field] ?? change.field}:</span
								>
								<del class="text-muted-foreground">{format(change.field, change.from)}</del>
								<span aria-hidden="true">→</span>
								<span class="sr-only">changed to</span>
								<ins class="font-medium no-underline">{format(change.field, change.to)}</ins>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
