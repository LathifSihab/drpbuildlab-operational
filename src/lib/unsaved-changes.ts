import { beforeNavigate } from '$app/navigation';

/**
 * Asks before leaving a form with unsaved changes: a confirm for links inside the app, the
 * browser's own prompt for closing or reloading the tab. Call during component setup.
 */
export function guardUnsavedChanges(hasUnsavedChanges: () => boolean) {
	beforeNavigate((navigation) => {
		if (!hasUnsavedChanges()) return;
		if (navigation.type === 'leave') {
			navigation.cancel(); // the browser shows its "leave site?" prompt
			return;
		}
		if (!confirm('You have unsaved changes. Leave without saving?')) navigation.cancel();
	});
}
