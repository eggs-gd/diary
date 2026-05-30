/** Move node to document.body so modals escape fixed bars with pointer-events: none */
export function portalToBody(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
