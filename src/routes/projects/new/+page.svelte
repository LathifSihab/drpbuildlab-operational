<script lang="ts">
	import { resolve } from '$app/paths';
	import ProjectForm from '#lib/components/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>New project · DRP Operational</title>
</svelte:head>

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
	<a href={resolve('/')} class="hover:text-foreground">Projects</a>
	<span aria-hidden="true">/</span>
	<span aria-current="page">New</span>
</nav>

<h1 class="mt-1 mb-4 text-xl font-semibold">New project</h1>

<div class="max-w-4xl">
	<ProjectForm options={data.options} {form} action="?/create" submitLabel="Create project" />
</div>
