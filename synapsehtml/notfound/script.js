const ROUTES = {
	dashboard: "../dashboard/",
	landing: "../landing/",
};

document.querySelectorAll("[data-route]").forEach((button) => {
	button.addEventListener("click", () => {
		const path = ROUTES[button.getAttribute("data-route")] || ROUTES.landing;
		window.location.href = path;
	});
});
