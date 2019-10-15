import BlogNewEntryView from '../pages/BlogNewEntry.svelte';

const route = {
    name: "BlogNewEntry",
    route: "/blog/new",
    level: 1,
    view: BlogNewEntryView,
    scope: scope
};

export function getRoute() {
    return route;
}

export function scope(request, navigator) {
    return {};
}
