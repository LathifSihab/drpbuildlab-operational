<script lang="ts">
	/**
	 * Pick several tools from the shared list (dropdown), or add a new one with the + button
	 * (or Enter). Picked tools show as chips. New names join the shared list when the form is
	 * saved. Submits one hidden field with the tools comma-joined, the format the server reads.
	 * ARIA combobox with a multi-select listbox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
	 */
	type Props = {
		/** Form field name of the hidden input. */
		name: string;
		/** id of the visible text input, for its <label>. */
		id: string;
		/** Tools picked when the form opens. */
		value: readonly string[];
		/** The shared tool list. */
		options: readonly string[];
		describedby?: string;
		invalid?: boolean;
		onchange?: () => void;
	};

	let { name, id, value, options, describedby, invalid, onchange }: Props = $props();

	// Starts from `value`; the form re-creates this component when it is refilled.
	// svelte-ignore state_referenced_locally
	let selected = $state([...value]);
	let query = $state('');
	let open = $state(false);
	let active = $state(-1);
	let input: HTMLInputElement | undefined = $state();

	const listId = $derived(`${id}-list`);
	const statusId = $derived(`${id}-status`);
	const trimmed = $derived(query.trim());

	const lower = (s: string) => s.toLowerCase();
	const isSelected = (tool: string) => selected.some((t) => lower(t) === lower(tool));
	const known = (tool: string) => options.find((o) => lower(o) === lower(tool));
	const isNew = (tool: string) => !known(tool);

	type Row = { kind: 'existing'; name: string } | { kind: 'create'; name: string };
	const rows = $derived.by((): Row[] => {
		const q = lower(trimmed);
		const matches = options
			.filter((o) => !q || lower(o).includes(q))
			.map((o): Row => ({ kind: 'existing', name: o }));
		const canCreate = trimmed && !trimmed.includes(',') && !known(trimmed) && !isSelected(trimmed);
		return canCreate ? [...matches, { kind: 'create', name: trimmed }] : matches;
	});

	function toggle(tool: string) {
		selected = isSelected(tool)
			? selected.filter((t) => lower(t) !== lower(tool))
			: [...selected, known(tool) ?? tool];
		onchange?.();
	}

	/** Adds what is typed (a comma-separated paste adds several), using the list's spelling. */
	function addTyped() {
		const names = query
			.split(',')
			.map((n) => n.trim().slice(0, 100))
			.filter(Boolean);
		if (names.length === 0) {
			open = true;
			input?.focus();
			return;
		}
		for (const n of names) if (!isSelected(n)) selected = [...selected, known(n) ?? n];
		query = '';
		active = -1;
		onchange?.();
		input?.focus();
	}

	function choose(row: Row) {
		if (row.kind === 'existing') toggle(row.name);
		else addTyped();
		query = '';
		active = -1;
		input?.focus();
	}

	function remove(tool: string) {
		selected = selected.filter((t) => t !== tool);
		onchange?.();
		input?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			open = true;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = rows.length ? (active + step + rows.length) % rows.length : -1;
		} else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault(); // picks or adds here; it does not submit the form
			if (open && active >= 0 && rows[active]) choose(rows[active]);
			else if (trimmed) addTyped();
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
			active = -1;
		} else if (event.key === 'Backspace' && query === '' && selected.length) {
			remove(selected[selected.length - 1]);
		}
	}

	const newCount = $derived(selected.filter(isNew).length);
	const describedByAll = $derived([statusId, describedby].filter(Boolean).join(' '));
	const optionId = (i: number) => `${id}-opt-${i}`;
</script>

<div
	class="relative"
	onfocusout={(event) => {
		// Close when focus leaves the picker (not when it moves to a chip or the + button).
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			open = false;
			active = -1;
		}
	}}
>
	<!-- Clicking anywhere in the frame focuses the text field; the field itself stays the keyboard target. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="input flex cursor-text flex-wrap items-center gap-1.5 py-1.5 pr-1.5"
		onclick={() => input?.focus()}
	>
		{#if selected.length}
			<ul class="contents" aria-label="Picked tools">
				{#each selected as tool (tool)}
					<li
						class="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-sm"
					>
						{tool}
						{#if isNew(tool)}<span class="text-xs font-medium text-accent">new</span>{/if}
						<button
							type="button"
							class="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-foreground hover:text-card"
							aria-label="Remove {tool}"
							onclick={(e) => {
								e.stopPropagation();
								remove(tool);
							}}
						>
							<svg viewBox="0 0 16 16" class="size-3" aria-hidden="true"
								><path
									d="M4 4l8 8M12 4l-8 8"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
								/></svg
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<input
			bind:this={input}
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
			placeholder={selected.length ? 'Add another tool' : 'Pick a tool or type a new one'}
			class="min-w-32 flex-1 bg-transparent py-1 outline-none"
			oninput={() => {
				open = true;
				active = -1;
			}}
			onfocus={() => (open = true)}
			onclick={() => (open = true)}
			{onkeydown}
		/>
		<button
			type="button"
			class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-on-primary hover:bg-primary-hover"
			aria-label={trimmed ? `Add “${trimmed}”` : 'Add a new tool'}
			title={trimmed ? `Add “${trimmed}”` : 'Type a tool name, then press + to add it'}
			onmousedown={(e) => e.preventDefault()}
			onclick={(e) => {
				e.stopPropagation();
				addTyped();
			}}
		>
			<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true"
				><path
					d="M8 3v10M3 8h10"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/></svg
			>
		</button>
	</div>

	<ul
		id={listId}
		role="listbox"
		aria-multiselectable="true"
		aria-label="Tools"
		class={[
			'card absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-auto p-1.5 shadow-lg',
			(!open || rows.length === 0) && 'hidden'
		]}
	>
		{#each rows as row, i (row.kind + row.name)}
			<!-- Keyboard users pick options from the input (arrows + Enter), as the combobox pattern intends. -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				id={optionId(i)}
				role="option"
				aria-selected={row.kind === 'existing' && isSelected(row.name)}
				class={[
					'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
					i === active ? 'bg-muted' : 'hover:bg-muted/60'
				]}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => choose(row)}
			>
				{#if row.kind === 'existing'}
					<span
						class={[
							'grid size-4 shrink-0 place-items-center rounded border',
							isSelected(row.name)
								? 'border-chip-on bg-chip-on text-on-chip-on'
								: 'border-input text-transparent'
						]}
					>
						<svg viewBox="0 0 16 16" class="size-3" aria-hidden="true"
							><path
								d="M3.5 8.5l3 3 6-7"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/></svg
						>
					</span>
					<span class="flex-1 truncate">{row.name}</span>
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
					<span>Add new tool “<strong>{row.name}</strong>”</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if open && rows.length === 0}
		<p
			class="card absolute inset-x-0 top-full z-20 mt-1.5 px-4 py-3 text-sm text-muted-foreground shadow-lg"
		>
			{trimmed ? 'Already picked.' : 'No tools in the list yet. Type one and press +.'}
		</p>
	{/if}

	<!-- Kept in the page while empty, so screen readers hear it change. -->
	<p id={statusId} class={['hint', !newCount && 'sr-only']} aria-live="polite">
		{#if newCount}
			<span class="font-medium text-accent">{newCount} new {newCount === 1 ? 'tool' : 'tools'}</span
			>
			will be added to the list when you save.
		{/if}
	</p>

	<input type="hidden" {name} value={selected.join(', ')} />
</div>
