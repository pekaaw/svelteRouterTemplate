import HomeView from '../pages/Home.svelte';
import * as Home from '../pages/Home.js';
import * as Blog from '../pages/Blog.js';
import * as BlogEntry from '../pages/BlogEntry.js';
import * as BlogNewEntry from '../pages/BlogNewEntry.js';

export const routes = [
    {
        name: "Home",
        route: "/home",
        level: 0,
        view: HomeView,
        scope: Home.scope
    },
    Blog.getRoute(),
    BlogEntry.getRoute(),
    BlogNewEntry.getRoute()
];

export const routesByLevel = level => routes.filter(route => route.level === level);
