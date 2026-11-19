<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ProjectForm from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>New project · DRP Operational</title>
</svelte:head>

{#snippet breadcrumb()}
	<a href={resolve('/')} class="hover:text-foreground">Projects</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">New</span>
{/snippet}

<div class="max-w-4xl">
	<PageHeader
		title="New project"
		description="Only the title is required; fill in the rest as you learn it."
		{breadcrumb}
	/>
	<ProjectForm options={data.options} {form} action="?/create" submitLabel="Create project" />
</div>
