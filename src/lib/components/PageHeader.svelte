<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Breadcrumb, condensed uppercase title (as on the website), badges, and actions. */
	type Props = {
		title: string;
		breadcrumb?: Snippet;
		badges?: Snippet;
		actions?: Snippet;
		/** One line under the title. */
		description?: string;
	};

	let { title, breadcrumb, badges, actions, description }: Props = $props();
</script>

<div class="mb-6">
	{#if breadcrumb}
		<nav
			aria-label="Breadcrumb"
			class="mb-2 flex items-center gap-1.5 text-[13px] text-muted-foreground"
		>
			{@render breadcrumb()}
		</nav>
	{/if}
	<div class="flex flex-wrap items-end gap-x-4 gap-y-3">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="display text-[clamp(30px,4vw,44px)] break-words">{title}</h1>
				{@render badges?.()}
			</div>
			{#if description}<p class="mt-2 text-sm text-muted-foreground">{description}</p>{/if}
		</div>
		{#if actions}
			<div class="ml-auto flex flex-wrap items-center gap-2">{@render actions()}</div>
		{/if}
	</div>
</div>
