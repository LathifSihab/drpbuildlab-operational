<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head>
	<title>Clients · DRP Operational</title>
</svelte:head>

<div class="flex flex-wrap items-center gap-3">
	<h1 class="text-xl font-semibold">Clients and partners</h1>
	<form method="GET" role="search" class="ml-auto flex gap-2">
		<label for="kind" class="sr-only">Type</label>
		<select
			id="kind"
			name="kind"
			value={data.kind ?? ''}
			class="rounded border border-border bg-card px-2 py-1.5 text-sm"
		>
			<option value="">Clients and partners</option>
			<option value="client">Clients only</option>
			<option value="partner">Partners only</option>
		</select>
		<label for="q" class="sr-only">Search name or email domain</label>
		<input
			id="q"
			name="q"
			type="search"
			value={data.q}
			placeholder="Search name or domain"
			class="w-56 rounded border border-border bg-card px-2 py-1.5 text-sm"
		/>
		<button class="rounded border border-border px-3 py-1.5 text-sm">Search</button>
	</form>
	{#if data.canCreate}
		<a
			href={resolve('/clients/new')}
			class="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary"
		>
			New client
		</a>
	{/if}
</div>

<section aria-labelledby="clients-heading" class="mt-4">
	<h2 id="clients-heading" class="sr-only">Client list</h2>
	{#if data.clients.length === 0}
		<p
			class="rounded border border-dashed border-border bg-card px-4 py-8 text-center text-muted-foreground"
		>
			{#if data.q}
				Nothing matches “{data.q}”.
			{:else}
				No clients yet. Add one with “New client”, or type a new one on a project.
			{/if}
		</p>
	{:else}
		<div class="overflow-x-auto rounded border border-border bg-card">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th scope="col" class="px-3 py-2 font-medium">Name</th>
						<th scope="col" class="px-3 py-2 font-medium">Type</th>
						<th scope="col" class="px-3 py-2 font-medium">Email domains</th>
						<th scope="col" class="px-3 py-2 text-right font-medium">Projects</th>
						<th scope="col" class="px-3 py-2 font-medium">Updated</th>
					</tr>
				</thead>
				<tbody>
					{#each data.clients as client (client.id)}
						<tr class="border-b border-border last:border-0">
							<td class="px-3 py-2 font-medium">
								<a
									href={resolve('/clients/[id]', { id: String(client.id) })}
									class="text-accent hover:underline"
								>
									{client.name}
								</a>
							</td>
							<td class="px-3 py-2">{client.isPartner ? 'Partner' : 'Client'}</td>
							<td class="px-3 py-2">
								{#if client.emailDomains.length}{client.emailDomains.join(', ')}{:else}<span
										class="text-muted-foreground">–</span
									>{/if}
							</td>
							<td class="px-3 py-2 text-right tabular-nums">{client.projectCount}</td>
							<td class="px-3 py-2 text-muted-foreground">{dateTime.format(client.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
