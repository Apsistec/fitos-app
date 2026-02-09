/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
 
(window as unknown as Record<string, boolean>).__Zone_disable_customElements = true;
