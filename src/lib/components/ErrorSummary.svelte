<script lang="ts" module>
	export type ErrorItem = { targetId: string; label: string; message: string };
</script>

<script lang="ts">
	/** "N fields need attention" with one button per problem that jumps to its field. */
	let { items }: { items: readonly ErrorItem[] } = $props();
</script>

<div aria-live="polite">
	{#if items.length}
		<div class="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3" role="alert">
			<p class="text-sm font-semibold text-destructive">
				{items.length === 1 ? '1 field needs' : `${items.length} fields need`} attention
			</p>
			<ul class="mt-1.5 space-y-1 text-sm">
				{#each items as item, i (i)}
					<li>
						<button
							type="button"
							class="text-left underline-offset-2 hover:underline"
							onclick={() => document.getElementById(item.targetId)?.focus()}
						>
							<span class="font-medium">{item.label}:</span>
							{item.message}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
