<script lang="ts">
	/**
	 * Type to find an existing client (or partner), or keep typing to create a new one.
	 * Submits the same two fields as before: `idName` for an existing record, `newName` for a
	 * new one, both empty for none. Names are unique per kind, so a typed name that matches an
	 * existing one exactly picks that one.
	 * ARIA combobox pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
	 */
	type Item = { id: number; name: string };

	type Props = {
		id: string;
		idName: string;
		newName: string;
		options: readonly Item[];
		/** Selected id when the form opens ('' for none). */
		selectedId: string;
		/** Typed new name when the form opens (after a failed save). */
		newValue: string;
		/** "client" or "partner", used in the hints. */
		noun: string;
		describedby?: string;
		invalid?: boolean;
		onchange?: () => void;
	};

	let {
		id,
		idName,
		newName,
		options,
		selectedId,
		newValue,
		noun,
		describedby,
		invalid,
		onchange
	}: Props = $props();

	// Starts from the props; the form re-creates this component when it is refilled.
	// svelte-ignore state_referenced_locally
	let query = $state(newValue || options.find((o) => String(o.id) === selectedId)?.name || '');
	let open = $state(false);
	let active = $state(-1);

	const listId = $derived(`${id}-list`);
	const statusId = $derived(`${id}-status`);
	const trimmed = $derived(query.trim());
	const exact = $derived(options.find((o) => o.name.toLowerCase() === trimmed.toLowerCase()));

	type Row = { kind: 'existing'; item: Item } | { kind: 'create'; name: string };
	const rows = $derived.by((): Row[] => {
		const q = trimmed.toLowerCase();
		const matches = options
			.filter((o) => !q || o.name.toLowerCase().includes(q))
			.slice(0, 8)
			.map((item): Row => ({ kind: 'existing', item }));
		return trimmed && !exact ? [...matches, { kind: 'create', name: trimmed }] : matches;
	});

	function choose(row: Row) {
		query = row.kind === 'existing' ? row.item.name : row.name;
		open = false;
		active = -1;
		onchange?.();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) open = true;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = rows.length ? (active + step + rows.length) % rows.length : -1;
		} else if (event.key === 'Enter' && open && active >= 0 && rows[active]) {
			event.preventDefault(); // picks the option instead of submitting the form
			choose(rows[active]);
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
			active = -1;
		}
	}

	const describedByAll = $derived([statusId, describedby].filter(Boolean).join(' '));
	const optionId = (i: number) => `${id}-opt-${i}`;
</script>

<div
	class="relative"
	onfocusout={(event) => {
		// Close when focus leaves the picker (not when it moves to the clear button).
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) open = false;
	}}
>
	<div class="input flex items-center gap-2 py-0 pr-1.5">
		<svg viewBox="0 0 20 20" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true">
			<circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
			<path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		</svg>
		<input
			{id}
			bind:value={query}
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
			aria-describedby={describedByAll}
			aria-invalid={invalid || undefined}
			autocomplete="off"
			placeholder="Search or type a new {noun}"
			class="min-w-0 flex-1 bg-transparent py-2.5 outline-none"
			oninput={() => {
				open = true;
				active = -1;
				onchange?.();
			}}
			onfocus={() => (open = true)}
			onclick={() => (open = true)}
			{onkeydown}
		/>
		{#if query}
			<button
				type="button"
				class="btn-ghost grid size-7 shrink-0 place-items-center rounded-full"
				aria-label="Clear {noun}"
				onclick={() => {
					query = '';
					onchange?.();
					document.getElementById(id)?.focus();
				}}
			>
				<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
					<path
						d="M4 4l8 8M12 4l-8 8"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<ul
		id={listId}
		role="listbox"
		aria-label="{noun} suggestions"
		class={[
			'card absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-auto p-1.5 shadow-lg',
			(!open || rows.length === 0) && 'hidden'
		]}
	>
		{#each rows as row, i (row.kind === 'existing' ? row.item.id : 'create')}
			<!-- Keyboard users pick options from the input (arrows + Enter), as the combobox pattern intends. -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				id={optionId(i)}
				role="option"
				aria-selected={i === active}
				class={[
					'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
					i === active ? 'bg-muted' : 'hover:bg-muted/60'
				]}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => choose(row)}
			>
				{#if row.kind === 'existing'}
					<span class="flex-1 truncate">{row.item.name}</span>
					{#if exact?.id === row.item.id}<span class="text-xs text-muted-foreground">Selected</span
						>{/if}
				{:else}
					<span class="grid size-5 place-items-center rounded-full bg-primary text-on-primary">
						<svg viewBox="0 0 16 16" class="size-3" aria-hidden="true"
							><path
								d="M8 3v10M3 8h10"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/></svg
						>
					</span>
					<span>Create new {noun} “<strong>{row.name}</strong>”</span>
				{/if}
			</li>
		{/each}
	</ul>

	<!-- Kept in the page while empty, so screen readers hear it change. -->
	<p id={statusId} class={['hint', !trimmed && 'sr-only']} aria-live="polite">
		{#if trimmed && !exact}
			<span class="font-medium text-accent">New {noun}</span> “{trimmed}” will be created when you
			save.
		{:else if exact}
			Linked to an existing {noun}.
		{/if}
	</p>

	<input type="hidden" name={idName} value={exact ? String(exact.id) : ''} />
	<input type="hidden" name={newName} value={exact ? '' : trimmed} />
</div>
