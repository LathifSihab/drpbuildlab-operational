<script lang="ts">
	import { resolve } from '$app/paths';
	import ClientForm from '#lib/components/ClientForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>New client · DRP Operational</title>
</svelte:head>

{#snippet breadcrumb()}
	<a href={resolve('/clients')} class="hover:text-foreground">Clients</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">New</span>
{/snippet}

<div class="max-w-4xl">
	<PageHeader
		title="New client"
		description="A company we work for, or a partner agency."
		{breadcrumb}
	/>
	<ClientForm
		{form}
		canSeePersonal={data.canSeePersonal}
		action="?/create"
		submitLabel="Create client"
	/>
</div>
