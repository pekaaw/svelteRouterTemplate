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