<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

	const kinds = [
		{ value: '', label: 'All' },
		{ value: 'client', label: 'Clients' },
		{ value: 'partner', label: 'Partners' }
	];
</script>

<svelte:head>
	<title>Clients · DRP Operational</title>
</svelte:head>

{#snippet actions()}
	{#if data.canCreate}
		<a href={resolve('/clients/new')} class="btn btn-primary">
			<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true"
				><path
					d="M8 3v10M3 8h10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/></svg
			>
			New client
		</a>
	{/if}
{/snippet}

<PageHeader
	title="Clients"
	description="End clients and the partner agencies that resell our work."
	{actions}
/>

<!-- Picking a type submits right away; Search works without JavaScript too. -->
<form method="GET" role="search" class="mb-4 flex flex-wrap items-center gap-3">
	<fieldset class="flex gap-2">
		<legend class="sr-only">Type</legend>
		{#each kinds as kind (kind.value)}
			<label class="chip">
				<input
					type="radio"
					name="kind"
					value={kind.value}
					checked={(data.kind ?? '') === kind.value}
					class="sr-only"
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
				/>
				{kind.label}
			</label>
		{/each}
	</fieldset>
	<div class="ml-auto flex gap-2">
		<label for="q" class="sr-only">Search name or email domain</label>
		<input
			id="q"
			name="q"
			type="search"
			value={data.q}
			placeholder="Search name or domain"
			class="input w-64 rounded-full py-2"
		/>
		<button class="btn btn-line">Search</button>
	</div>
</form>

<section aria-labelledby="clients-heading">
	<h2 id="clients-heading" class="sr-only">Client list</h2>
	{#if data.clients.length === 0}
		<p class="card border-dashed px-4 py-12 text-center text-muted-foreground">
			{#if data.q}
				Nothing matches “{data.q}”.
			{:else}
				No clients yet. Add one with “New client”, or type a new one on a project.
			{/if}
		</p>
	{:else}
		<div class="card overflow-x-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">Type</th>
						<th scope="col">Email domains</th>
						<th scope="col" class="text-right">Projects</th>
						<th scope="col">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.clients as client (client.id)}
						<tr>
							<td class="font-medium">
								<a
									href={resolve('/clients/[id]', { id: String(client.id) })}
									class="hover:text-accent hover:underline"
								>
									{client.name}
								</a>
							</td>
							<td>
								<span class={['badge', client.isPartner && 'border-accent text-accent']}>
									{client.isPartner ? 'Partner' : 'Client'}
								</span>
							</td>
							<td class="text-muted-foreground">
								{client.emailDomains.length ? client.emailDomains.join(', ') : '–'}
							</td>
							<td class="text-right tabular-nums">{client.projectCount}</td>
							<td class="text-muted-foreground">{dateTime.format(client.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
