<script lang="ts">
	/** The save bar, stuck to the bottom of the screen while the form is long. */
	type Props = {
		submitLabel: string;
		submitting: boolean;
		dirty: boolean;
		/** Shows a Cancel button when set. */
		oncancel?: () => void;
	};

	let { submitLabel, submitting, dirty, oncancel }: Props = $props();
</script>

<!-- Floats at the bottom of the screen while the form is longer than it. -->
<div
	class="sticky bottom-4 z-10 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-lg backdrop-blur-md"
>
	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : submitLabel}
		</button>
		{#if oncancel}
			<button type="button" class="btn btn-line" onclick={oncancel} disabled={submitting}>
				Cancel
			</button>
		{/if}
		<p class="ml-auto flex items-center gap-3 text-[13px] text-muted-foreground">
			{#if dirty && !submitting}
				<span class="flex items-center gap-1.5">
					<span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
					Unsaved changes
				</span>
			{/if}
			<span class="hidden sm:inline">
				<kbd class="font-mono text-xs">Ctrl</kbd> / <kbd class="font-mono text-xs">⌘</kbd> +
				<kbd class="font-mono text-xs">Enter</kbd> to save
			</span>
		</p>
	</div>
</div>
