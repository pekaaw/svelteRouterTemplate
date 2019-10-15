import crayon from 'crayon';
import svelte from 'crayon-svelte';
import animate from 'crayon-animate';
import transition from 'crayon-transition';

export class AppNavigation {
    constructor(routes) {
        this.routes = routes;
        this.app = crayon.create();
		this.app.use(transition.loader());
		this.app.use(animate.defaults({
			name: transition.pushLeft,
			duration: 350
        }));

        const originalNavigate = this.app.navigate.bind(this.app);
        this.app.navigate = async function pushStateChange() {
            let url = routes[0].route;
            if (arguments[0] instanceof Event) {
                let event = arguments[0];
                if (event.target.nodeName === "A") {
                    event.preventDefault();
                    url = event.target.pathname;
                }
            }
            else if (typeof arguments[0] === "string") {
                url = arguments[0];
            }

            await originalNavigate(url);
            window.dispatchEvent(new Event("pushstate"));
        };
    }

    getInstance() {
        return this.app;
    }

    enable(targetElement) {
        this.app.use(svelte.router(targetElement));
		this.app.path('/', (req, res) => res.redirect('/home'));

        this.routes.map(route =>
			this.app.path(
                route.route,
                (req, res) => res.mount(route.view, route.scope(req, this.app))
            )
		);

		this.app.load();
    }

    disable() {
        this.app.destroy();
    }
}
