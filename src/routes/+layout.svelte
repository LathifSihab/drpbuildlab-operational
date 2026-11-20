<script lang="ts">
	import '../app.css';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const path = $derived(page.url.pathname);
	const nav = $derived([
		{ href: resolve('/'), label: 'Projects', active: path === '/' || path.startsWith('/projects') },
		{ href: resolve('/tasks'), label: 'My tasks', active: path.startsWith('/tasks') },
		{ href: resolve('/clients'), label: 'Clients', active: path.startsWith('/clients') }
	]);
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<title>DRP Operational</title>
</svelte:head>

<a
	href="#main"
	class="sr-only rounded-full bg-card px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
>
	Skip to content
</a>

<!-- Dark bar in both themes, like the website's navigation. -->
<header class="sticky top-0 z-30 bg-ink text-on-ink">
	<div class="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3 sm:gap-8">
		<a
			href={resolve('/')}
			class="flex items-center gap-3"
			aria-label="DRP BuildLab Operational, home"
		>
			<span class="flex flex-col leading-[0.82]" aria-hidden="true">
				<span
					class="font-display text-[24px] font-black tracking-[-0.02em] italic [font-stretch:88%]"
					>DRP</span
				>
				<span
					class="mt-[3px] font-display text-[7.6px] font-extrabold tracking-[0.42em] text-brand-hi [font-stretch:110%]"
					>BUILDLAB</span
				>
			</span>
			<span class="hidden h-7 w-px bg-white/15 sm:block" aria-hidden="true"></span>
			<span class="hidden text-sm font-medium text-on-ink-muted sm:inline" aria-hidden="true"
				>Operational</span
			>
		</a>

		<nav aria-label="Main">
			<ul class="flex gap-4 text-[15px] sm:gap-6">
				{#each nav as item (item.label)}
					<li>
						<a
							href={item.href}
							aria-current={item.active ? 'page' : undefined}
							class={[
								'relative py-1.5 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current after:transition-transform',
								item.active
									? 'text-on-ink after:scale-x-100'
									: 'text-on-ink-muted after:scale-x-0 hover:text-on-ink hover:after:scale-x-100'
							]}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="ml-auto flex items-center gap-2.5 text-[13px] text-on-ink-muted">
			<span class="hidden truncate sm:inline">{data.user.email}</span>
			<span class="rounded-full px-2.5 py-0.5 text-xs font-medium text-on-ink ring-1 ring-white/25">
				{data.user.role}
			</span>
			{#if !dev}
				<!-- Cloudflare Access's own logout page: ends the sign-in session; the next visit asks
				     for Microsoft again. A full page load, so the app's router does not handle it. -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -- served by Cloudflare, not a route of this app -->
				<a
					href="/cdn-cgi/access/logout"
					data-sveltekit-reload
					class="rounded-full px-2.5 py-0.5 font-medium transition-colors hover:bg-white/10 hover:text-on-ink"
				>
					Sign out
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>
	</div>
</header>

<main id="main" class="mx-auto max-w-7xl px-4 py-8">
	{@render children()}
</main>
