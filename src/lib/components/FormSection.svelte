<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A numbered card in a form: "01  Basics" with a one-line explanation. */
	type Props = {
		step: string;
		title: string;
		description?: string;
		/** Shown at the right of the title, e.g. an "Admin and dev only" badge. */
		aside?: Snippet;
		children: Snippet;
	};

	let { step, title, description, aside, children }: Props = $props();

	const headingId = $derived(`section-${step}`);
</script>

<section aria-labelledby={headingId} class="card p-5 sm:p-6">
	<header class="mb-5 flex flex-wrap items-start gap-x-3 gap-y-1">
		<span class="step mt-1" aria-hidden="true">{step}</span>
		<div class="min-w-0 flex-1">
			<h2
				id={headingId}
				class="font-display text-xl leading-tight font-bold tracking-tight [font-stretch:90%]"
			>
				{title}
			</h2>
			{#if description}<p class="mt-0.5 text-sm text-muted-foreground">{description}</p>{/if}
		</div>
		{@render aside?.()}
	</header>
	{@render children()}
</section>
