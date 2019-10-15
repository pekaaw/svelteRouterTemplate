import BlogView from '../pages/Blog.svelte';

const route = {
    name: "Blog",
    route: "/blog",
    level: 0,
    view: BlogView,
    scope: scope
};

export function getRoute() {
    return route;
}

export function scope(request, navigator) {
    return {
        navigator
    };
}
