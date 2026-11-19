<script lang="ts">
	import { resolve } from '$app/paths';
	import ClientForm from '#lib/components/ClientForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>New client · DRP Operational</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
	<a href={resolve('/clients')} class="hover:text-foreground">Clients</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">New</span>
</nav>

<h1 class="mt-1 mb-4 text-xl font-semibold">New client</h1>

<div class="max-w-4xl">
	<ClientForm
		{form}
		canSeePersonal={data.canSeePersonal}
		action="?/create"
		submitLabel="Create client"
	/>
</div>
