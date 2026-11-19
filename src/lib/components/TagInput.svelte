<script lang="ts">
	/**
	 * A list of short values typed as tags: Enter or comma adds, Backspace on an empty field
	 * removes the last one, pasting "a, b, c" adds three. Submits one hidden field with the tags
	 * comma-joined, the format the server already reads.
	 */
	type Props = {
		/** Form field name of the hidden input. */
		name: string;
		/** id of the visible text input, for its <label>. */
		id: string;
		/** Tags when the form opens. */
		value: readonly string[];
		placeholder?: string;
		/** Cleans a typed value, e.g. lowercases a domain. Empty result = ignored. */
		normalize?: (raw: string) => string;
		describedby?: string;
		invalid?: boolean;
		onchange?: () => void;
	};

	let {
		name,
		id,
		value,
		placeholder,
		normalize = (raw) => raw.trim(),
		describedby,
		invalid,
		onchange
	}: Props = $props();

	// Starts from `value`; the form re-creates this component when it is refilled.
	// svelte-ignore state_referenced_locally
	let tags = $state([...value]);
	let draft = $state('');
	let input: HTMLInputElement | undefined = $state();

	// A typed value not yet turned into a tag still counts (e.g. saved with Ctrl+Enter).
	const submitted = $derived([...tags, normalize(draft)].filter(Boolean).join(', '));

	function add(raw: string) {
		const added = raw
			.split(',')
			.map(normalize)
			.filter((t) => t && !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()));
		if (added.length) {
			tags = [...tags, ...new Set(added)];
			onchange?.();
		}
	}

	function remove(index: number) {
		tags = tags.filter((_, i) => i !== index);
		onchange?.();
		input?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if ((event.key === 'Enter' && !event.ctrlKey && !event.metaKey) || event.key === ',') {
			event.preventDefault(); // Enter adds a tag here; it does not submit the form
			add(draft);
			draft = '';
		} else if (event.key === 'Backspace' && draft === '' && tags.length) {
			remove(tags.length - 1);
		}
	}

	function onpaste(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text') ?? '';
		if (!/[,\n]/.test(text)) return;
		event.preventDefault();
		add(text.replaceAll('\n', ','));
	}
</script>

<!-- Clicking anywhere in the frame focuses the text field; the field itself stays the keyboard target. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	class="input flex cursor-text flex-wrap items-center gap-1.5 py-2"
	onclick={() => input?.focus()}
>
	{#if tags.length}
		<ul class="contents">
			{#each tags as tag, i (tag)}
				<li class="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-sm">
					{tag}
					<button
						type="button"
						class="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-foreground hover:text-card"
						aria-label="Remove {tag}"
						onclick={(e) => {
							e.stopPropagation();
							remove(i);
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
		bind:value={draft}
		placeholder={tags.length ? undefined : placeholder}
		aria-describedby={describedby}
		aria-invalid={invalid || undefined}
		autocomplete="off"
		class="min-w-32 flex-1 bg-transparent py-0.5 outline-none"
		{onkeydown}
		{onpaste}
		oninput={onchange}
		onblur={() => {
			add(draft);
			draft = '';
		}}
	/>
	<input type="hidden" {name} value={submitted} />
</div>
