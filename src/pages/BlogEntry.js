import BlogEntryView from './BlogEntry.svelte';

const route = {
    name: "BlogEntry",
    route: "/blog/entry/:id",
    level: 1,
    view: BlogEntryView,
    scope
};

export function getRoute() {
    return route;
}

export function scope(request, navigator) {
    let entryId = request.params.id;
    return {
        navigator,
        entryId
    };
}
