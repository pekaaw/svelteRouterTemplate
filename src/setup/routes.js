import HomeView from '../pages/Home.svelte';
import * as Home from '../pages/Home.js';
import BlogView from '../pages/Blog.svelte';
import * as Blog from '../pages/Blog.js';
import BlogNewEntryView from '../pages/BlogNewEntry.svelte';
import * as BlogNewEntry from '../pages/BlogNewEntry.js';

export const routes = [
    {
        name: "Home",
        route: "/home",
        level: 0,
        view: HomeView,
        scope: Home.scope
    },
    {
        name: "Blog",
        route: "/blog",
        level: 0,
        view: BlogView,
        scope: Blog.scope
    },
    {
        name: "BlogNewEntry",
        route: "/blog/new",
        level: 1,
        view: BlogNewEntryView,
        scope: BlogNewEntry.scope
    }
];

export const routesByLevel = level => routes.filter(route => route.level === level);
