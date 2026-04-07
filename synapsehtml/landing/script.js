const ROUTES = {
	login: "../login/",
	registro: "../registro/",
	dashboard: "../dashboard/",
};

function getStoredUser() {
	const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function bindRouteButtons() {
	document.querySelectorAll("[data-route]").forEach((button) => {
		button.addEventListener("click", () => {
			const route = button.getAttribute("data-route");
			window.location.href = ROUTES[route] || ROUTES.login;
		});
	});
}

if (getStoredUser()) {
	window.location.href = ROUTES.dashboard;
} else {
	bindRouteButtons();
}
