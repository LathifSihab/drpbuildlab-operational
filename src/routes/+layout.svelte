<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>DRP Operational</title>
</svelte:head>

<a
	href="#main"
	class="sr-only rounded bg-card px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
>
	Skip to content
</a>

<header class="border-b border-border bg-card">
	<div class="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
		<a href={resolve('/')} class="font-semibold tracking-tight">DRP Operational</a>
		<nav aria-label="Main">
			<ul class="flex gap-4 text-sm">
				<li>
					<a href={resolve('/')} class="text-muted-foreground hover:text-foreground">Projects</a>
				</li>
			</ul>
		</nav>
		<p class="ml-auto text-sm text-muted-foreground">
			{data.user.email}
			<span class="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-secondary">
				{data.user.role}
			</span>
		</p>
	</div>
</header>

<main id="main" class="mx-auto max-w-7xl px-4 py-6">
	{@render children()}
</main>
