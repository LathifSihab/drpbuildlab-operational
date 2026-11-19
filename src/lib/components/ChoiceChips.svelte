<script lang="ts">
	/**
	 * A radio group shown as pills (the website's "chips"). Native radios underneath, so arrow
	 * keys, required, and form submission work as usual.
	 */
	type Option = { value: string; label: string; description?: string };

	type Props = {
		name: string;
		legend: string;
		options: readonly Option[];
		/** The picked value when the form opens. */
		value: string;
		hint?: string;
		error?: string;
		/** Prefix for element ids, unique on the page. */
		idPrefix: string;
		onchange?: () => void;
	};

	let { name, legend, options, value, hint, error, idPrefix, onchange }: Props = $props();

	const describedBy = $derived(
		[hint ? `${idPrefix}-hint` : '', error ? `${idPrefix}-error` : ''].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<fieldset aria-describedby={describedBy}>
	<legend class="label">{legend}</legend>
	<div class="flex flex-wrap gap-2">
		{#each options as option, i (option.value)}
			<label class="chip" title={option.description}>
				<input
					id={i === 0 ? idPrefix : undefined}
					type="radio"
					{name}
					value={option.value}
					checked={option.value === value}
					class="sr-only"
					{onchange}
				/>
				{option.label}
			</label>
		{/each}
	</div>
	{#if hint}<p id="{idPrefix}-hint" class="hint">{hint}</p>{/if}
	{#if error}<p id="{idPrefix}-error" class="field-error">{error}</p>{/if}
</fieldset>
