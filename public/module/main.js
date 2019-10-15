
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
function noop() {}

function assign(tar, src) {
  // @ts-ignore
  for (const k in src) tar[k] = src[k];

  return tar;
}

function add_location(element, file, line, column, char) {
  element.__svelte_meta = {
    loc: {
      file,
      line,
      column,
      char
    }
  };
}

function run(fn) {
  return fn();
}

function blank_object() {
  return Object.create(null);
}

function run_all(fns) {
  fns.forEach(run);
}

function is_function(thing) {
  return typeof thing === 'function';
}

function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
}

function create_slot(definition, ctx, fn) {
  if (definition) {
    const slot_ctx = get_slot_context(definition, ctx, fn);
    return definition[0](slot_ctx);
  }
}

function get_slot_context(definition, ctx, fn) {
  return definition[1] ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {}))) : ctx.$$scope.ctx;
}

function get_slot_changes(definition, ctx, changed, fn) {
  return definition[1] ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {}))) : ctx.$$scope.changed || {};
}

function append(target, node) {
  target.appendChild(node);
}

function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}

function detach(node) {
  node.parentNode.removeChild(node);
}

function destroy_each(iterations, detaching) {
  for (let i = 0; i < iterations.length; i += 1) {
    if (iterations[i]) iterations[i].d(detaching);
  }
}

function element(name) {
  return document.createElement(name);
}

function text(data) {
  return document.createTextNode(data);
}

function space() {
  return text(' ');
}

function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}

function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);else node.setAttribute(attribute, value);
}

function children(element) {
  return Array.from(element.childNodes);
}

function toggle_class(element, name, toggle) {
  element.classList[toggle ? 'add' : 'remove'](name);
}

function custom_event(type, detail) {
  const e = document.createEvent('CustomEvent');
  e.initCustomEvent(type, false, false, detail);
  return e;
}

let current_component;

function set_current_component(component) {
  current_component = component;
}

function get_current_component() {
  if (!current_component) throw new Error(`Function called outside component initialization`);
  return current_component;
}

function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}

function onDestroy(fn) {
  get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;

function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}

function add_render_callback(fn) {
  render_callbacks.push(fn);
}

function flush() {
  const seen_callbacks = new Set();

  do {
    // first, call beforeUpdate functions
    // and update components
    while (dirty_components.length) {
      const component = dirty_components.shift();
      set_current_component(component);
      update(component.$$);
    }

    while (binding_callbacks.length) binding_callbacks.pop()(); // then, once components are updated, call
    // afterUpdate functions. This may cause
    // subsequent updates...


    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];

      if (!seen_callbacks.has(callback)) {
        callback(); // ...so guard against infinite loops

        seen_callbacks.add(callback);
      }
    }

    render_callbacks.length = 0;
  } while (dirty_components.length);

  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }

  update_scheduled = false;
}

function update($$) {
  if ($$.fragment) {
    $$.update($$.dirty);
    run_all($$.before_update);
    $$.fragment.p($$.dirty, $$.ctx);
    $$.dirty = null;
    $$.after_update.forEach(add_render_callback);
  }
}

const outroing = new Set();
let outros;

function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}

function transition_out(block, local, detach, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);

      if (callback) {
        if (detach) block.d(1);
        callback();
      }
    });
    block.o(local);
  }
}

function mount_component(component, target, anchor) {
  const {
    fragment,
    on_mount,
    on_destroy,
    after_update
  } = component.$$;
  fragment.m(target, anchor); // onMount happens before the initial afterUpdate

  add_render_callback(() => {
    const new_on_destroy = on_mount.map(run).filter(is_function);

    if (on_destroy) {
      on_destroy.push(...new_on_destroy);
    } else {
      // Edge case - component was destroyed immediately,
      // most likely as a result of a binding initialising
      run_all(new_on_destroy);
    }

    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}

function destroy_component(component, detaching) {
  if (component.$$.fragment) {
    run_all(component.$$.on_destroy);
    component.$$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
    // preserve final state?)

    component.$$.on_destroy = component.$$.fragment = null;
    component.$$.ctx = {};
  }
}

function make_dirty(component, key) {
  if (!component.$$.dirty) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty = blank_object();
  }

  component.$$.dirty[key] = true;
}

function init(component, options, instance, create_fragment, not_equal, prop_names) {
  const parent_component = current_component;
  set_current_component(component);
  const props = options.props || {};
  const $$ = component.$$ = {
    fragment: null,
    ctx: null,
    // state
    props: prop_names,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    before_update: [],
    after_update: [],
    context: new Map(parent_component ? parent_component.$$.context : []),
    // everything else
    callbacks: blank_object(),
    dirty: null
  };
  let ready = false;
  $$.ctx = instance ? instance(component, props, (key, ret, value = ret) => {
    if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
      if ($$.bound[key]) $$.bound[key](value);
      if (ready) make_dirty(component, key);
    }

    return ret;
  }) : props;
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment($$.ctx);

  if (options.target) {
    if (options.hydrate) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      $$.fragment.l(children(options.target));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      $$.fragment.c();
    }

    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    flush();
  }

  set_current_component(parent_component);
}

class SvelteComponent {
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }

  $on(type, callback) {
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }

  $set() {// overridden by instance, if it has props
  }

}

function dispatch_dev(type, detail) {
  document.dispatchEvent(custom_event(type, detail));
}

function append_dev(target, node) {
  dispatch_dev("SvelteDOMInsert", {
    target,
    node
  });
  append(target, node);
}

function insert_dev(target, node, anchor) {
  dispatch_dev("SvelteDOMInsert", {
    target,
    node,
    anchor
  });
  insert(target, node, anchor);
}

function detach_dev(node) {
  dispatch_dev("SvelteDOMRemove", {
    node
  });
  detach(node);
}

function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
  const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
  if (has_prevent_default) modifiers.push('preventDefault');
  if (has_stop_propagation) modifiers.push('stopPropagation');
  dispatch_dev("SvelteDOMAddEventListener", {
    node,
    event,
    handler,
    modifiers
  });
  const dispose = listen(node, event, handler, options);
  return () => {
    dispatch_dev("SvelteDOMRemoveEventListener", {
      node,
      event,
      handler,
      modifiers
    });
    dispose();
  };
}

function attr_dev(node, attribute, value) {
  attr(node, attribute, value);
  if (value == null) dispatch_dev("SvelteDOMRemoveAttribute", {
    node,
    attribute
  });else dispatch_dev("SvelteDOMSetAttribute", {
    node,
    attribute,
    value
  });
}

function set_data_dev(text, data) {
  data = '' + data;
  if (text.data === data) return;
  dispatch_dev("SvelteDOMSetData", {
    node: text,
    data
  });
  text.data = data;
}

class SvelteComponentDev extends SvelteComponent {
  constructor(options) {
    if (!options || !options.target && !options.$$inline) {
      throw new Error(`'target' is a required option`);
    }

    super();
  }

  $destroy() {
    super.$destroy();

    this.$destroy = () => {
      console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    };
  }

}

/* src\pages\shared\Nav.svelte generated by Svelte v3.12.1 */
const file = "src\\pages\\shared\\Nav.svelte";

function get_each_context(ctx, list, i) {
  const child_ctx = Object.create(ctx);
  child_ctx.page = list[i];
  return child_ctx;
} // (4:12) {#each pages as page}


function create_each_block(ctx) {
  var li,
      a,
      t_value = ctx.page.name + "",
      t,
      a_href_value,
      dispose;
  const block = {
    c: function create() {
      li = element("li");
      a = element("a");
      t = text(t_value);
      attr_dev(a, "class", "nav-link");
      attr_dev(a, "href", a_href_value = ctx.page.route);
      add_location(a, file, 4, 73, 241);
      attr_dev(li, "class", "nav-item");
      toggle_class(li, "active", ctx.isActive(ctx.page.route));
      add_location(li, file, 4, 16, 184);
      dispose = listen_dev(a, "click", ctx.navigate(ctx.page.route));
    },
    m: function mount(target, anchor) {
      insert_dev(target, li, anchor);
      append_dev(li, a);
      append_dev(a, t);
    },
    p: function update(changed, new_ctx) {
      ctx = new_ctx;

      if (changed.pages && t_value !== (t_value = ctx.page.name + "")) {
        set_data_dev(t, t_value);
      }

      if (changed.pages && a_href_value !== (a_href_value = ctx.page.route)) {
        attr_dev(a, "href", a_href_value);
      }

      if (changed.isActive || changed.pages) {
        toggle_class(li, "active", ctx.isActive(ctx.page.route));
      }
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(li);
      }

      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_each_block.name,
    type: "each",
    source: "(4:12) {#each pages as page}",
    ctx
  });
  return block;
}

function create_fragment(ctx) {
  var nav, section, ul;
  let each_value = ctx.pages;
  let each_blocks = [];

  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  }

  const block = {
    c: function create() {
      nav = element("nav");
      section = element("section");
      ul = element("ul");

      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }

      attr_dev(ul, "class", "navbar-nav mr-auto");
      add_location(ul, file, 2, 8, 100);
      attr_dev(section, "class", "container");
      add_location(section, file, 1, 4, 63);
      attr_dev(nav, "class", "navbar navbar-expand-sm navbar-dark bg-dark");
      add_location(nav, file, 0, 0, 0);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, nav, anchor);
      append_dev(nav, section);
      append_dev(section, ul);

      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].m(ul, null);
      }
    },
    p: function update(changed, ctx) {
      if (changed.isActive || changed.pages) {
        each_value = ctx.pages;
        let i;

        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context(ctx, each_value, i);

          if (each_blocks[i]) {
            each_blocks[i].p(changed, child_ctx);
          } else {
            each_blocks[i] = create_each_block(child_ctx);
            each_blocks[i].c();
            each_blocks[i].m(ul, null);
          }
        }

        for (; i < each_blocks.length; i += 1) {
          each_blocks[i].d(1);
        }

        each_blocks.length = each_value.length;
      }
    },
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(nav);
      }

      destroy_each(each_blocks, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

function instance($$self, $$props, $$invalidate) {
  let {
    pages,
    activePage,
    navigator
  } = $$props;

  let navigate = route => e => {
    e.preventDefault();
    navigator && navigator.navigate(route);
  };

  const writable_props = ['pages', 'activePage', 'navigator'];
  Object.keys($$props).forEach(key => {
    if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Nav> was created with unknown prop '${key}'`);
  });

  $$self.$set = $$props => {
    if ('pages' in $$props) $$invalidate('pages', pages = $$props.pages);
    if ('activePage' in $$props) $$invalidate('activePage', activePage = $$props.activePage);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  $$self.$capture_state = () => {
    return {
      pages,
      activePage,
      navigator,
      navigate,
      isActive
    };
  };

  $$self.$inject_state = $$props => {
    if ('pages' in $$props) $$invalidate('pages', pages = $$props.pages);
    if ('activePage' in $$props) $$invalidate('activePage', activePage = $$props.activePage);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
    if ('navigate' in $$props) $$invalidate('navigate', navigate = $$props.navigate);
    if ('isActive' in $$props) $$invalidate('isActive', isActive = $$props.isActive);
  };

  let isActive;

  $$self.$$.update = ($$dirty = {
    activePage: 1
  }) => {
    if ($$dirty.activePage) {
      $$invalidate('isActive', isActive = route => {
        return activePage === route;
      });
    }
  };

  return {
    pages,
    activePage,
    navigator,
    navigate,
    isActive
  };
}

class Nav extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance, create_fragment, safe_not_equal, ["pages", "activePage", "navigator"]);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Nav",
      options,
      id: create_fragment.name
    });
    const {
      ctx
    } = this.$$;
    const props = options.props || {};

    if (ctx.pages === undefined && !('pages' in props)) {
      console.warn("<Nav> was created without expected prop 'pages'");
    }

    if (ctx.activePage === undefined && !('activePage' in props)) {
      console.warn("<Nav> was created without expected prop 'activePage'");
    }

    if (ctx.navigator === undefined && !('navigator' in props)) {
      console.warn("<Nav> was created without expected prop 'navigator'");
    }
  }

  get pages() {
    throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set pages(value) {
    throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  get activePage() {
    throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set activePage(value) {
    throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  get navigator() {
    throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set navigator(value) {
    throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

}

/* src\pages\shared\Footer.svelte generated by Svelte v3.12.1 */
const file$1 = "src\\pages\\shared\\Footer.svelte";

function create_fragment$1(ctx) {
  var h2;
  const block = {
    c: function create() {
      h2 = element("h2");
      h2.textContent = "Footer";
      add_location(h2, file$1, 0, 0, 0);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, h2, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(h2);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$1.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

class Footer extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, null, create_fragment$1, safe_not_equal, []);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Footer",
      options,
      id: create_fragment$1.name
    });
  }

}

/* src\pages\shared\Layout.svelte generated by Svelte v3.12.1 */
const file$2 = "src\\pages\\shared\\Layout.svelte";

function create_fragment$2(ctx) {
  var header, t0, main, t1, footer1, current;
  var nav = new Nav({
    props: {
      pages: ctx.pages,
      activePage: ctx.activePage,
      navigator: ctx.navigator
    },
    $$inline: true
  });
  const default_slot_template = ctx.$$slots.default;
  const default_slot = create_slot(default_slot_template, ctx, null);
  var footer0 = new Footer({
    $$inline: true
  });
  const block = {
    c: function create() {
      header = element("header");
      nav.$$.fragment.c();
      t0 = space();
      main = element("main");
      if (default_slot) default_slot.c();
      t1 = space();
      footer1 = element("footer");
      footer0.$$.fragment.c();
      add_location(header, file$2, 0, 0, 0);
      attr_dev(main, "class", "container");
      add_location(main, file$2, 3, 0, 67);
      attr_dev(footer1, "id", "mainFooter");
      attr_dev(footer1, "class", "container d-flex aligh-self-end");
      add_location(footer1, file$2, 6, 0, 121);
    },
    l: function claim(nodes) {
      if (default_slot) default_slot.l(main_nodes);
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, header, anchor);
      mount_component(nav, header, null);
      insert_dev(target, t0, anchor);
      insert_dev(target, main, anchor);

      if (default_slot) {
        default_slot.m(main, null);
      }

      insert_dev(target, t1, anchor);
      insert_dev(target, footer1, anchor);
      mount_component(footer0, footer1, null);
      current = true;
    },
    p: function update(changed, ctx) {
      var nav_changes = {};
      if (changed.pages) nav_changes.pages = ctx.pages;
      if (changed.activePage) nav_changes.activePage = ctx.activePage;
      if (changed.navigator) nav_changes.navigator = ctx.navigator;
      nav.$set(nav_changes);

      if (default_slot && default_slot.p && changed.$$scope) {
        default_slot.p(get_slot_changes(default_slot_template, ctx, changed, null), get_slot_context(default_slot_template, ctx, null));
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(nav.$$.fragment, local);
      transition_in(default_slot, local);
      transition_in(footer0.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(nav.$$.fragment, local);
      transition_out(default_slot, local);
      transition_out(footer0.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(header);
      }

      destroy_component(nav);

      if (detaching) {
        detach_dev(t0);
        detach_dev(main);
      }

      if (default_slot) default_slot.d(detaching);

      if (detaching) {
        detach_dev(t1);
        detach_dev(footer1);
      }

      destroy_component(footer0);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$2.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

function instance$1($$self, $$props, $$invalidate) {
  let {
    pages,
    activePage,
    navigator
  } = $$props;
  const writable_props = ['pages', 'activePage', 'navigator'];
  Object.keys($$props).forEach(key => {
    if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Layout> was created with unknown prop '${key}'`);
  });
  let {
    $$slots = {},
    $$scope
  } = $$props;

  $$self.$set = $$props => {
    if ('pages' in $$props) $$invalidate('pages', pages = $$props.pages);
    if ('activePage' in $$props) $$invalidate('activePage', activePage = $$props.activePage);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
    if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
  };

  $$self.$capture_state = () => {
    return {
      pages,
      activePage,
      navigator
    };
  };

  $$self.$inject_state = $$props => {
    if ('pages' in $$props) $$invalidate('pages', pages = $$props.pages);
    if ('activePage' in $$props) $$invalidate('activePage', activePage = $$props.activePage);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  return {
    pages,
    activePage,
    navigator,
    $$slots,
    $$scope
  };
}

class Layout extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance$1, create_fragment$2, safe_not_equal, ["pages", "activePage", "navigator"]);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Layout",
      options,
      id: create_fragment$2.name
    });
    const {
      ctx
    } = this.$$;
    const props = options.props || {};

    if (ctx.pages === undefined && !('pages' in props)) {
      console.warn("<Layout> was created without expected prop 'pages'");
    }

    if (ctx.activePage === undefined && !('activePage' in props)) {
      console.warn("<Layout> was created without expected prop 'activePage'");
    }

    if (ctx.navigator === undefined && !('navigator' in props)) {
      console.warn("<Layout> was created without expected prop 'navigator'");
    }
  }

  get pages() {
    throw new Error("<Layout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set pages(value) {
    throw new Error("<Layout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  get activePage() {
    throw new Error("<Layout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set activePage(value) {
    throw new Error("<Layout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  get navigator() {
    throw new Error("<Layout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set navigator(value) {
    throw new Error("<Layout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

}

let navigatorInstance = undefined;
const setNavigator = navigator => navigatorInstance = navigator;
const backClick = () => navigatorInstance && navigatorInstance.back();

/* src\pages\Home.svelte generated by Svelte v3.12.1 */
const file$3 = "src\\pages\\Home.svelte";

function create_fragment$3(ctx) {
  var h1;
  const block = {
    c: function create() {
      h1 = element("h1");
      h1.textContent = "Home";
      add_location(h1, file$3, 0, 0, 0);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, h1, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(h1);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$3.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

class Home extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, null, create_fragment$3, safe_not_equal, []);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Home",
      options,
      id: create_fragment$3.name
    });
  }

}

function scope(request, navigator) {
  return {};
}

/* src\pages\Blog.svelte generated by Svelte v3.12.1 */
const file$4 = "src\\pages\\Blog.svelte";

function create_fragment$4(ctx) {
  var h1, t1, a0, t3, ul, li0, a1, t5, li1, a2, dispose;
  const block = {
    c: function create() {
      h1 = element("h1");
      h1.textContent = "Blog";
      t1 = space();
      a0 = element("a");
      a0.textContent = "New blog entry";
      t3 = space();
      ul = element("ul");
      li0 = element("li");
      a1 = element("a");
      a1.textContent = "Entry #1";
      t5 = space();
      li1 = element("li");
      a2 = element("a");
      a2.textContent = "Entry #2";
      add_location(h1, file$4, 0, 0, 0);
      attr_dev(a0, "href", "/blog/new");
      add_location(a0, file$4, 2, 0, 17);
      attr_dev(a1, "href", "/blog/entry/1");
      add_location(a1, file$4, 6, 8, 113);
      add_location(li0, file$4, 5, 4, 99);
      attr_dev(a2, "href", "/blog/entry/2");
      add_location(a2, file$4, 9, 8, 210);
      add_location(li1, file$4, 8, 4, 196);
      add_location(ul, file$4, 4, 0, 89);
      dispose = [listen_dev(a0, "click", ctx.navigator.navigate), listen_dev(a1, "click", ctx.navigator.navigate), listen_dev(a2, "click", ctx.navigator.navigate)];
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, h1, anchor);
      insert_dev(target, t1, anchor);
      insert_dev(target, a0, anchor);
      insert_dev(target, t3, anchor);
      insert_dev(target, ul, anchor);
      append_dev(ul, li0);
      append_dev(li0, a1);
      append_dev(ul, t5);
      append_dev(ul, li1);
      append_dev(li1, a2);
    },
    p: noop,
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(h1);
        detach_dev(t1);
        detach_dev(a0);
        detach_dev(t3);
        detach_dev(ul);
      }

      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$4.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

function instance$2($$self, $$props, $$invalidate) {
  let {
    navigator
  } = $$props;

  const writable_props = ['navigator'];
  Object.keys($$props).forEach(key => {
    if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Blog> was created with unknown prop '${key}'`);
  });

  $$self.$set = $$props => {
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  $$self.$capture_state = () => {
    return {
      navigator
    };
  };

  $$self.$inject_state = $$props => {
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  return {
    navigator
  };
}

class Blog extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance$2, create_fragment$4, safe_not_equal, ["navigator"]);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Blog",
      options,
      id: create_fragment$4.name
    });
    const {
      ctx
    } = this.$$;
    const props = options.props || {};

    if (ctx.navigator === undefined && !('navigator' in props)) {
      console.warn("<Blog> was created without expected prop 'navigator'");
    }
  }

  get navigator() {
    throw new Error("<Blog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set navigator(value) {
    throw new Error("<Blog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

}

const route = {
  name: "Blog",
  route: "/blog",
  level: 0,
  view: Blog,
  scope: scope$1
};
function getRoute() {
  return route;
}
function scope$1(request, navigator) {
  return {
    navigator
  };
}

/* src\pages\BlogEntry.svelte generated by Svelte v3.12.1 */
const file$5 = "src\\pages\\BlogEntry.svelte";

function create_fragment$5(ctx) {
  var h1, t0, t1;
  const block = {
    c: function create() {
      h1 = element("h1");
      t0 = text("Blog #");
      t1 = text(ctx.entryId);
      add_location(h1, file$5, 0, 0, 0);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, h1, anchor);
      append_dev(h1, t0);
      append_dev(h1, t1);
    },
    p: function update(changed, ctx) {
      if (changed.entryId) {
        set_data_dev(t1, ctx.entryId);
      }
    },
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(h1);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$5.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

function instance$3($$self, $$props, $$invalidate) {
  let {
    entryId,
    navigator
  } = $$props;
  const writable_props = ['entryId', 'navigator'];
  Object.keys($$props).forEach(key => {
    if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<BlogEntry> was created with unknown prop '${key}'`);
  });

  $$self.$set = $$props => {
    if ('entryId' in $$props) $$invalidate('entryId', entryId = $$props.entryId);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  $$self.$capture_state = () => {
    return {
      entryId,
      navigator
    };
  };

  $$self.$inject_state = $$props => {
    if ('entryId' in $$props) $$invalidate('entryId', entryId = $$props.entryId);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  return {
    entryId,
    navigator
  };
}

class BlogEntry extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance$3, create_fragment$5, safe_not_equal, ["entryId", "navigator"]);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "BlogEntry",
      options,
      id: create_fragment$5.name
    });
    const {
      ctx
    } = this.$$;
    const props = options.props || {};

    if (ctx.entryId === undefined && !('entryId' in props)) {
      console.warn("<BlogEntry> was created without expected prop 'entryId'");
    }

    if (ctx.navigator === undefined && !('navigator' in props)) {
      console.warn("<BlogEntry> was created without expected prop 'navigator'");
    }
  }

  get entryId() {
    throw new Error("<BlogEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set entryId(value) {
    throw new Error("<BlogEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  get navigator() {
    throw new Error("<BlogEntry>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

  set navigator(value) {
    throw new Error("<BlogEntry>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }

}

const route$1 = {
  name: "BlogEntry",
  route: "/blog/entry/:id",
  level: 1,
  view: BlogEntry,
  scope: scope$2
};
function getRoute$1() {
  return route$1;
}
function scope$2(request, navigator) {
  let entryId = request.params.id;
  return {
    navigator,
    entryId
  };
}

/* src\pages\shared\Back.svelte generated by Svelte v3.12.1 */
const file$6 = "src\\pages\\shared\\Back.svelte";

function create_fragment$6(ctx) {
  var nav, button, dispose;
  const block = {
    c: function create() {
      nav = element("nav");
      button = element("button");
      button.textContent = "< Tilbake";
      attr_dev(button, "type", "button");
      attr_dev(button, "class", "btn btn-secondary");
      add_location(button, file$6, 1, 4, 11);
      add_location(nav, file$6, 0, 0, 0);
      dispose = listen_dev(button, "click", backClick);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, nav, anchor);
      append_dev(nav, button);
    },
    p: noop,
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(nav);
      }

      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$6.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

class Back extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, null, create_fragment$6, safe_not_equal, []);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "Back",
      options,
      id: create_fragment$6.name
    });
  }

}

/* src\pages\BlogNewEntry.svelte generated by Svelte v3.12.1 */
const file$7 = "src\\pages\\BlogNewEntry.svelte";

function create_fragment$7(ctx) {
  var t, h1, current;
  var back = new Back({
    $$inline: true
  });
  const block = {
    c: function create() {
      back.$$.fragment.c();
      t = space();
      h1 = element("h1");
      h1.textContent = "New blog entry";
      add_location(h1, file$7, 1, 0, 10);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      mount_component(back, target, anchor);
      insert_dev(target, t, anchor);
      insert_dev(target, h1, anchor);
      current = true;
    },
    p: noop,
    i: function intro(local) {
      if (current) return;
      transition_in(back.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(back.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(back, detaching);

      if (detaching) {
        detach_dev(t);
        detach_dev(h1);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$7.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

class BlogNewEntry extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, null, create_fragment$7, safe_not_equal, []);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "BlogNewEntry",
      options,
      id: create_fragment$7.name
    });
  }

}

const route$2 = {
  name: "BlogNewEntry",
  route: "/blog/new",
  level: 1,
  view: BlogNewEntry,
  scope: scope$3
};
function getRoute$2() {
  return route$2;
}
function scope$3(request, navigator) {
  return {};
}

const routes = [{
  name: "Home",
  route: "/home",
  level: 0,
  view: Home,
  scope: scope
}, getRoute(), getRoute$1(), getRoute$2()];
const routesByLevel = level => routes.filter(route => route.level === level);

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(source, true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(source).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var dist = createCommonjsModule(function (module, exports) {
  !function (t, e) {
    module.exports = e();
  }(window, function () {
    return function (t) {
      var e = {};

      function n(s) {
        if (e[s]) return e[s].exports;
        var r = e[s] = {
          i: s,
          l: !1,
          exports: {}
        };
        return t[s].call(r.exports, r, r.exports, n), r.l = !0, r.exports;
      }

      return n.m = t, n.c = e, n.d = function (t, e, s) {
        n.o(t, e) || Object.defineProperty(t, e, {
          enumerable: !0,
          get: s
        });
      }, n.r = function (t) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
          value: "Module"
        }), Object.defineProperty(t, "__esModule", {
          value: !0
        });
      }, n.t = function (t, e) {
        if (1 & e && (t = n(t)), 8 & e) return t;
        if (4 & e && "object" == typeof t && t && t.__esModule) return t;
        var s = Object.create(null);
        if (n.r(s), Object.defineProperty(s, "default", {
          enumerable: !0,
          value: t
        }), 2 & e && "string" != typeof t) for (var r in t) n.d(s, r, function (e) {
          return t[e];
        }.bind(null, r));
        return s;
      }, n.n = function (t) {
        var e = t && t.__esModule ? function () {
          return t.default;
        } : function () {
          return t;
        };
        return n.d(e, "a", e), e;
      }, n.o = function (t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }, n.p = "", n(n.s = 1);
    }([function (t, e, n) {
      t.exports = function (t) {
        var e = {};

        function n(s) {
          if (e[s]) return e[s].exports;
          var r = e[s] = {
            i: s,
            l: !1,
            exports: {}
          };
          return t[s].call(r.exports, r, r.exports, n), r.l = !0, r.exports;
        }

        return n.m = t, n.c = e, n.d = function (t, e, s) {
          n.o(t, e) || Object.defineProperty(t, e, {
            enumerable: !0,
            get: s
          });
        }, n.r = function (t) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
            value: "Module"
          }), Object.defineProperty(t, "__esModule", {
            value: !0
          });
        }, n.t = function (t, e) {
          if (1 & e && (t = n(t)), 8 & e) return t;
          if (4 & e && "object" == typeof t && t && t.__esModule) return t;
          var s = Object.create(null);
          if (n.r(s), Object.defineProperty(s, "default", {
            enumerable: !0,
            value: t
          }), 2 & e && "string" != typeof t) for (var r in t) n.d(s, r, function (e) {
            return t[e];
          }.bind(null, r));
          return s;
        }, n.n = function (t) {
          var e = t && t.__esModule ? function () {
            return t.default;
          } : function () {
            return t;
          };
          return n.d(e, "a", e), e;
        }, n.o = function (t, e) {
          return Object.prototype.hasOwnProperty.call(t, e);
        }, n.p = "", n(n.s = 0);
      }([function (t, e, n) {

        n.r(e);
        const s = {
          ofLength: function (t) {
            for (var e = "", n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", s = n.length, r = 0; r < t; r++) e += n.charAt(Math.floor(Math.random() * s));

            return e;
          }
        };
        var r = s;

        const i = (t, e) => new Promise(n => {
          let s = 0;
          const r = t.subscribe(t => {
            ++s === e && (n(t), r.unsubscribe());
          });
        }),
              o = (t, e = () => !0) => new Promise(n => {
          const s = t.subscribe(t => {
            !0 === e(t) && (n(t), s.unsubscribe());
          });
        }),
              a = {
          Bundle: class {
            constructor() {
              this.subscriptions = [];
            }

            add(t) {
              this.subscriptions.push(t);
            }

            unsubscribe() {
              this.subscriptions.forEach(t => t.unsubscribe()), this.subscriptions = [];
            }

          },
          Beacon: class {
            constructor() {
              this.subscribers = {};
            }

            subscribe(t) {
              const e = s.ofLength(5);
              return this.subscribers[e] = t, {
                unsubscribe: () => delete this.subscribers[e]
              };
            }

            next(t) {
              for (const e in this.subscribers) this.subscribers[e](t);
            }

            first(t = () => !0) {
              return o(this, t);
            }

            nthEvent(t) {
              return i(this, t);
            }

          },
          nthEvent: i,
          first: o
        };

        var u = a;
        const c = {
          isArray: t => !!t && (Array.isArray ? Array.isArray(t) : t && "object" == typeof t && t.constructor === Array)
        };
        var h = c;

        const d = (t, e) => {
          for (const n in e) e.hasOwnProperty(n) && (t.style[n] = e[n]);
        },
              l = (t, e) => {
          for (const n in e) e.hasOwnProperty(n) || (t[n] = e[n]);
        },
              f = {
          create: (t = {}, ...e) => {
            const n = document.createElement(t.tag || "div");
            t.id && (n.id = t.id), t.className && (n.classList.value = t.className), t.cssText && (n.style.cssText = t.cssText), t.styles && d(n, t.styles), t.innerHTML && (n.innerHTML = t.innerHTML), t.innerText && (n.innerText = t.innerText), t.events && l(n, t.events);

            for (const t of e) n.appendChild(t);

            return n;
          },
          setStyles: d,
          setEvents: l,
          addClassNames: (t, e) => {
            for (const n of e) t.classList.add(n);
          },
          removeClassNames: (t, e) => {
            for (const n of e) t.classList.remove(n);
          },
          clearClassList: t => t && t.className && (t.className = ""),
          waitForElements: (...t) => t.forEach(t => t.getBoundingClientRect())
        };

        var p = f;
        const m = {
          exec: (t, e = 0) => new Promise(n => setTimeout(() => {
            const e = t();
            n(e);
          }, e)),
          duration: (t = 0) => new Promise(e => setTimeout(() => {
            e();
          }, t))
        };
        var v = m;

        const g = (t, e = !0) => t && "/" !== t ? (t.startsWith("/") || (t = "/" + t), t = y(t), e && (t = t.toLowerCase()), t) : "/",
              y = t => (w(t) && (t = t.substring(0, t.length - 1)), t),
              w = t => "/" == t.substring(t.length - 1),
              b = {
          normalise: g,
          removeTrailingSlash: y,
          hasTrailingSlash: w,
          matchPath: (t, e) => {
            e = g(e, !1).split("?")[0];
            const n = {},
                  s = (t = g(t)).split("/"),
                  r = e.split("/");

            if (s.length === r.length || t.includes("**")) {
              for (const t in s) if (s[t].startsWith(":") && "/" !== e) n[s[t].slice(1)] = r[t].toString();else {
                if (s[t].startsWith("**")) return n;
                if (s[t] !== r[t].toLowerCase()) return;
              }

              return n;
            }
          },
          deserializeQuery: (t = "") => {
            if (!t.startsWith("?")) return {};
            var e = t.slice(1).split("&"),
                n = {};

            for (const t of e) {
              const e = t.split("=");
              e[0] && (n[e[0]] = decodeURIComponent(e[1] || ""));
            }

            return n;
          }
        };

        var R = b;
        n.d(e, "eventStream", function () {
          return a;
        }), n.d(e, "checkType", function () {
          return c;
        }), n.d(e, "element", function () {
          return f;
        }), n.d(e, "genString", function () {
          return s;
        }), n.d(e, "sleep", function () {
          return m;
        }), n.d(e, "url", function () {
          return b;
        }), e.default = {
          eventStream: u,
          checkType: h,
          element: p,
          genString: r,
          sleep: v,
          url: R
        };
      }]);
    }, function (t, e, n) {

      n.r(e);

      class s {
        constructor(t) {
          this.base = t, this.middleware = [], this.routes = {};
        }

        path(t, ...e) {
          this.routes[t] = e;
        }

        use(t) {
          this.middleware.push(t);
        }

      }

      class r {
        constructor(t, e, n, s, r, i, o, a, u, c, h = {}, d = {}) {
          this.routePattern = t, this.hash = e, this.host = n, this.hostname = s, this.href = r, this.origin = i, this.pathname = o, this.port = a, this.protocol = u, this.search = c, this.params = h, this.query = d;
        }

      }

      class i {
        constructor() {
          this.ctx = {}, this.hasCompleted = !1, this.leaveActions = [];
        }

        runOnLeave() {
          this.leaveActions.forEach(t => t()), this.leaveActions = [];
        }

        onLeave(t) {
          this.leaveActions.push(t);
        }

        end() {
          this.hasCompleted = !0;
        }

        unmount(...t) {
          console.log("Unmount action is not set"), console.log(...t);
        }

        mount(...t) {
          console.log("Mount action is not set"), console.log(...t);
        }

        redirect(t) {
          console.log("Redirect action is not set"), console.log(t);
        }

      }

      var o,
          a = n(0);
      !function (t) {
        t.History = "HISTORY_EVENT", t.LoadTriggered = "ROUTER_LOAD_TRIGGERED", t.ProgressStart = "ROUTER_START", t.ProgressEnd = "ROUTER_END", t.RunningHanlders = "ROUTER_RUNNING_HANDLERS", t.NoHanlders = "ROUTER_NO_HANDLERS", t.SameRouteAbort = "ROUTER_SAME_ROUTE_ABORT", t.Redirected = "ROUTER_REDIRECTED", t.Destroyed = "ROUTER_DESTROYED", t.Registered = "ROUTER_REGISTERED", t.Unregistered = "ROUTER_UNREGISTERED";
      }(o || (o = {}));

      class u {
        constructor(t, e, n, s, r) {
          this.id = t, this.locator = e, this.routeMap = n, this.history = s, this.events = r, this.isLoading = !0, this.state = {}, this.$reqs = [], this.loads = 0, this.onHistoryEvent = t => {
            this.emitEvent(o.History, _objectSpread2({}, t)), this.digest();
          }, this.onRedirect = t => {
            this.isLoading = !1, this.emitEvent(o.Redirected), this.emitEvent(o.ProgressEnd), this.history.push(t);
          }, this.$history = this.history.onEvent.subscribe(this.onHistoryEvent);
        }

        destroy() {
          this.$history.unsubscribe(), this.$reqs.forEach(t => t.unsubscribe()), this.currentRes && (this.currentRes.runOnLeave(), this.currentRes.unmount()), this.emitEvent(o.Destroyed);
        }

        path(t, ...e) {
          this.routeMap.add(t, ...e);
        }

        use(t) {
          t instanceof s ? this.useGroup(t) : this.routeMap.addMiddleware(t);
        }

        async navigate(t) {
          this.isLoading || this.history.push(t);
        }

        async back() {
          this.isLoading || this.history.pop();
        }

        load() {
          return this.emitEvent(o.LoadTriggered), this.digest();
        }

        useGroup(t) {
          for (const e in t.routes) {
            const n = a.url.normalise(t.base + e),
                  s = [...t.middleware, ...t.routes[e]];
            this.routeMap.add(n, ...s);
          }
        }

        emitEvent(t, e) {
          e || (e = this.locator.getLocation().pathname), this.events.next({
            id: this.id,
            type: t,
            data: e
          });
        }

        async runHandlers(t, e, n) {
          for (const s of t) {
            if (n.hasCompleted) break;
            await s(e, n, this.state, this);
          }
        }

        async digest() {
          this.emitEvent(o.ProgressStart), this.isLoading = !0;
          const t = this.locator.getLocation(),
                e = new i();

          e.redirect = t => {
            e.hasCompleted = !0, this.onRedirect(t);
          };

          const n = this.routeMap.findWithPathname(t.pathname);
          if (!n) return this.emitEvent(o.NoHanlders), this.emitEvent(o.ProgressEnd), void (this.isLoading = !1);
          const {
            handlers: s,
            pattern: r,
            params: a
          } = n,
                u = this.locator.generateRequest(r, a);

          if (this.history.currentEvent && 0 !== this.loads) {
            const t = this.routeMap.findWithPathname(this.history.currentEvent.from);
            if (r === (t && t.pattern)) return void this.emitEvent(o.SameRouteAbort);
          }

          this.$reqs.push(this.onRequestUpdate(u, e, r)), this.emitEvent(o.RunningHanlders), await this.runHandlers(s, u, e), this.loads++, this.isLoading = !1, this.currentRes = e, this.emitEvent(o.ProgressEnd);
        }

        onRequestUpdate(t, e, n) {
          return this.history.onEvent.subscribe(s => {
            const r = this.routeMap.findWithPathname(s.to),
                  i = this.routeMap.findWithPathname(s.from);
            if ((r && r.pattern) !== (i && i.pattern)) return this.$reqs[0].unsubscribe(), this.$reqs.shift(), void e.runOnLeave();
            const u = a.url.matchPath(n, t.pathname),
                  c = this.locator.generateRequest(n, u);
            Object.assign(t, c), this.emitEvent(o.ProgressEnd, {
              path: c.pathname,
              note: "Router ended after same-route update",
              route: n
            }), this.isLoading = !1;
          });
        }

      }

      class c {
        constructor(t = "crayon") {
          this.base = t, this.isAnimating = "is-animating", this.noAnimation = "no-animation", this.hostView = "host-view", this.firstEnter = `${t}-enter-first`, this.enter = `${t}-enter`, this.enterDone = `${t}-enter-done`, this.exit = `${t}-exit`;
        }

      }

      const h = (t, e, n) => !(!e || !n || e === t || 0 === n),
            d = t => {
        const e = document.body.getElementsByClassName(t);
        return 1 === e.length ? {
          length: 1,
          entering: e[0],
          leaving: void 0
        } : {
          length: 2,
          leaving: e[0],
          entering: e[1]
        };
      },
            {
        addClassNames: l,
        removeClassNames: f,
        clearClassList: p,
        setStyles: m,
        waitForElements: v
      } = a.element,
            g = async (t, e, n, s, r) => {
        const i = n.target;
        await n.push(e);
        const {
          leaving: o,
          entering: u
        } = d(n.selector);
        if (l(u, [s]), l(i, [t.isAnimating]), m(u, {
          transitionDuration: "0ms"
        }), l(u, [t.base]), v(u, i), m(u, {
          transitionDuration: `${r}ms`
        }), void 0 === o) return l(u, [t.firstEnter]), l(u, [t.enter]), v(u), await a.sleep.duration(r), f(u, [t.firstEnter]), f(u, [t.enter]), l(u, [t.enterDone]), void f(i, [t.isAnimating]);
        p(o), m(o, {
          transitionDuration: `${r}ms`
        }), l(o, [n.selector]), v(o, u), l(o, [t.base]), l(o, [t.exit]), l(u, [t.enter]), v(o, u), await a.sleep.duration(r), f(u, [t.enter]), l(u, [t.enterDone]), f(i, [t.isAnimating]), await n.shift();
      },
            {
        addClassNames: y,
        removeClassNames: w,
        clearClassList: b,
        setStyles: R,
        waitForElements: E
      } = a.element,
            T = async (t, e, n, s) => {
        await n.push(e);
        const {
          leaving: r,
          entering: i
        } = d(n.selector);
        y(i, [s]), E(i), void 0 !== r ? await n.shift() : y(i, [t.enterDone]);
      },
            S = async (t, e, n, s) => {
        const r = new c(n);
        return h(r.noAnimation, n, s) ? g(r, t, e, n, s) : T(r, t, e, n);
      };

      var L;
      !function (t) {
        t.push = "PUSH", t.back = "BACK", t.forward = "FORWARD", t.replace = "REPLACE";
      }(L || (L = {}));

      class O {
        constructor(t = t) {
          this.window = t, this.entries = [], this.events = [], this.onEvent = new a.eventStream.Beacon(), this.onPop = () => {
            const t = this.window.location.pathname;

            if (t === this.lastRoute) {
              const t = {
                type: L.back,
                from: this.currentRoute,
                to: this.lastRoute
              };
              this.entries.pop(), this.events.push(t), this.onEvent.next(t);
            } else {
              const e = {
                type: L.forward,
                from: this.currentRoute,
                to: t
              };
              this.entries.push(t), this.events.push(e), this.onEvent.next(e);
            }
          }, this.document = this.window.document, this.entries.push(this.window.location.pathname), this.window.addEventListener("popstate", this.onPop);
        }

        get lastEvent() {
          return this.events[this.events.length - 2];
        }

        get currentEvent() {
          return this.events[this.events.length - 1];
        }

        get lastRoute() {
          return this.entries[this.entries.length - 2];
        }

        get currentRoute() {
          return this.entries[this.entries.length - 1];
        }

        destroy() {
          this.window.removeEventListener("popstate", this.onPop);
        }

        push(t) {
          t = a.url.normalise(t, !1), this.window.history.pushState(null, this.document.title, t);
          const e = {
            type: L.push,
            from: this.currentRoute,
            to: t
          };
          this.entries.push(t), this.events.push(e), this.onEvent.next(e);
        }

        pop() {
          this.window.history.back();
        }

        replace(t) {
          t = a.url.normalise(t, !1), this.window.history.replaceState(null, this.document.title, t), this.entries[this.entries.length - 1] = t, this.onEvent.next({
            type: L.replace,
            from: this.currentRoute,
            to: t
          });
        }

      }

      class P {
        constructor(t = t) {
          this.window = t;
        }

        getLocation() {
          return _objectSpread2({}, this.window.location);
        }

        generateRequest(t, e) {
          const n = a.url.deserializeQuery(this.window.location.search);
          return new r(t, this.window.location.hash, this.window.location.host, this.window.location.hostname, this.window.location.href, this.window.location.origin, this.window.location.pathname, this.window.location.port, this.window.location.protocol, this.window.location.search, _objectSpread2({}, e), n);
        }

      }

      class x {
        constructor() {
          this.middleware = [], this.routes = {};
        }

        add(t, ...e) {
          this.routes[a.url.normalise(t)] = e;
        }

        addMiddleware(...t) {
          for (const e of t) this.middleware.push(e);
        }

        findWithPathname(t) {
          let e = [];

          for (let n in this.routes) {
            const s = a.url.matchPath(n, t);
            void 0 !== s && e.push({
              key: n,
              params: s
            });
          }

          if (0 === e.length) return;
          const n = e.filter(t => t.key.includes("**")),
                s = e.filter(t => !t.key.includes("**"));
          let r, i;

          for (let e of s) if (r = e.key, i = e.params, e.key === t) break;

          if (!r || !i && n.length) {
            const t = n[0].key,
                  s = [...this.middleware, ...this.routes[t]];
            return {
              params: n[0].params,
              pattern: t,
              patterns: e,
              handlers: s
            };
          }

          if (!r || !i) return;
          return {
            params: i,
            pattern: r,
            patterns: e,
            handlers: [...this.middleware, ...this.routes[r]]
          };
        }

      }

      class A {
        constructor(t) {
          this.history = t, this.routers = {}, this.events = new a.eventStream.Beacon();
        }

        addRouter(t) {
          this.routers[t.id] = t, this.events.next({
            type: o.Registered,
            id: t.id
          });
        }

        removeRouter(t) {
          delete this.routers[t.id], 0 === Object.keys(this.routers).length && (this.events.next({
            type: o.Unregistered,
            id: t.id
          }), this.history.destroy());
        }

      }

      const M = (t = window) => {
        if (void 0 !== t.crayon) return t.crayon;
      },
            _ = (t, e = window) => {
        e.crayon = t;
      },
            C = (t = a.genString.ofLength(10), e = window, n) => {
        if (void 0 === n && (n = M(e)), void 0 === n) {
          const t = new O(e);
          n = new A(t), _(n);
        }

        const s = n.history,
              r = new x(),
              i = new P(e),
              o = new u(t, i, r, s, n.events);
        return n.addRouter(o), N(o, n), o;
      },
            N = async (t, e) => {
        await e.events.first(e => e.type === o.Destroyed && e.id === t.id), e.removeRouter(t);
      },
            D = (t, e) => {
        const n = new s(t);
        return e && e(n), n;
      };

      n.d(e, "crayon", function () {
        return j;
      }), n.d(e, "Group", function () {
        return s;
      }), n.d(e, "Request", function () {
        return r;
      }), n.d(e, "Response", function () {
        return i;
      }), n.d(e, "Router", function () {
        return u;
      }), n.d(e, "RouterEventType", function () {
        return o;
      }), n.d(e, "mount", function () {
        return S;
      }), n.d(e, "hasAnimation", function () {
        return h;
      }), n.d(e, "ClassNameStates", function () {
        return c;
      }), n.d(e, "animatedMount", function () {
        return g;
      }), n.d(e, "staticMount", function () {
        return T;
      }), n.d(e, "getRouteTargets", function () {
        return d;
      }), n.d(e, "HistoryType", function () {
        return L;
      }), n.d(e, "History", function () {
        return O;
      }), n.d(e, "Locator", function () {
        return P;
      }), n.d(e, "RouteMap", function () {
        return x;
      }), n.d(e, "SharedState", function () {
        return A;
      }), n.d(e, "getSharedState", function () {
        return M;
      }), n.d(e, "setSharedState", function () {
        return _;
      }), n.d(e, "Group", function () {
        return s;
      }), n.d(e, "Request", function () {
        return r;
      }), n.d(e, "Response", function () {
        return i;
      }), n.d(e, "Router", function () {
        return u;
      }), n.d(e, "RouterEventType", function () {
        return o;
      }), n.d(e, "create", function () {
        return C;
      }), n.d(e, "group", function () {
        return D;
      });
      const j = {
        create: C,
        group: D
      };
      e.default = j;
    }]);
  });
});
var crayon = unwrapExports(dist);

var dist$1 = createCommonjsModule(function (module, exports) {
  !function (e, t) {
    module.exports = t(dist);
  }(window, function (e) {
    return function (e) {
      var t = {};

      function n(r) {
        if (t[r]) return t[r].exports;
        var s = t[r] = {
          i: r,
          l: !1,
          exports: {}
        };
        return e[r].call(s.exports, s, s.exports, n), s.l = !0, s.exports;
      }

      return n.m = e, n.c = t, n.d = function (e, t, r) {
        n.o(e, t) || Object.defineProperty(e, t, {
          enumerable: !0,
          get: r
        });
      }, n.r = function (e) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
          value: "Module"
        }), Object.defineProperty(e, "__esModule", {
          value: !0
        });
      }, n.t = function (e, t) {
        if (1 & t && (e = n(e)), 8 & t) return e;
        if (4 & t && "object" == typeof e && e && e.__esModule) return e;
        var r = Object.create(null);
        if (n.r(r), Object.defineProperty(r, "default", {
          enumerable: !0,
          value: e
        }), 2 & t && "string" != typeof e) for (var s in e) n.d(r, s, function (t) {
          return e[t];
        }.bind(null, s));
        return r;
      }, n.n = function (e) {
        var t = e && e.__esModule ? function () {
          return e.default;
        } : function () {
          return e;
        };
        return n.d(t, "a", t), t;
      }, n.o = function (e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }, n.p = "", n(n.s = 2);
    }([function (e, t, n) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      });
      const r = n(1),
            s = n(3);

      t.router = e => (t, n, o) => {
        o.svelte || (o.svelte = {
          mounter: new s.SvelteMounter(e)
        }), n.mount = (e, t) => {
          const {
            createBuilder: s
          } = o.svelte.mounter,
                i = s(e, t);
          return r.mount(i, o.svelte.mounter, n.ctx.animation && n.ctx.animation.name, n.ctx.animation && n.ctx.animation.duration);
        };
      };
    }, function (t, n) {
      t.exports = e;
    }, function (e, t, n) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), function (e) {
        for (var n in e) t.hasOwnProperty(n) || (t[n] = e[n]);
      }(n(0));
      const r = n(0);
      t.default = {
        router: r.router
      };
    }, function (e, t, n) {

      var r = this && this.__awaiter || function (e, t, n, r) {
        return new (n || (n = Promise))(function (s, o) {
          function i(e) {
            try {
              u(r.next(e));
            } catch (e) {
              o(e);
            }
          }

          function c(e) {
            try {
              u(r.throw(e));
            } catch (e) {
              o(e);
            }
          }

          function u(e) {
            var t;
            e.done ? s(e.value) : (t = e.value, t instanceof n ? t : new n(function (e) {
              e(t);
            })).then(i, c);
          }

          u((r = r.apply(e, t || [])).next());
        });
      };

      Object.defineProperty(t, "__esModule", {
        value: !0
      });
      const s = n(1),
            o = n(4);
      t.SvelteMounter = class {
        constructor(e = document.body, t = "router-view", n = []) {
          this.target = e, this.selector = t, this.instances = n;
        }

        push(e) {
          return r(this, void 0, void 0, function* () {
            const t = document.createElement("div");
            o.element.addClassNames(t, [this.selector]), this.target.appendChild(t);
            const n = e(t);
            this.instances.push({
              instance: n,
              container: t
            });
          });
        }

        shift() {
          return r(this, void 0, void 0, function* () {
            const {
              leaving: e
            } = s.getRouteTargets(this.selector);
            if (!e) return;
            const {
              instance: t,
              container: n
            } = this.instances[0];
            t.$destroy(), this.target.removeChild(n), this.instances.shift();
          });
        }

        createBuilder(e, t = {}) {
          return n => new e({
            target: n,
            props: Object.assign({}, t)
          });
        }

      };
    }, function (e, t, n) {
      e.exports = function (e) {
        var t = {};

        function n(r) {
          if (t[r]) return t[r].exports;
          var s = t[r] = {
            i: r,
            l: !1,
            exports: {}
          };
          return e[r].call(s.exports, s, s.exports, n), s.l = !0, s.exports;
        }

        return n.m = e, n.c = t, n.d = function (e, t, r) {
          n.o(e, t) || Object.defineProperty(e, t, {
            enumerable: !0,
            get: r
          });
        }, n.r = function (e) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value: "Module"
          }), Object.defineProperty(e, "__esModule", {
            value: !0
          });
        }, n.t = function (e, t) {
          if (1 & t && (e = n(e)), 8 & t) return e;
          if (4 & t && "object" == typeof e && e && e.__esModule) return e;
          var r = Object.create(null);
          if (n.r(r), Object.defineProperty(r, "default", {
            enumerable: !0,
            value: e
          }), 2 & t && "string" != typeof e) for (var s in e) n.d(r, s, function (t) {
            return e[t];
          }.bind(null, s));
          return r;
        }, n.n = function (e) {
          var t = e && e.__esModule ? function () {
            return e.default;
          } : function () {
            return e;
          };
          return n.d(t, "a", t), t;
        }, n.o = function (e, t) {
          return Object.prototype.hasOwnProperty.call(e, t);
        }, n.p = "", n(n.s = 0);
      }([function (e, t, n) {

        n.r(t);
        const r = {
          ofLength: function (e) {
            for (var t = "", n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r = n.length, s = 0; s < e; s++) t += n.charAt(Math.floor(Math.random() * r));

            return t;
          }
        };
        var s = r;

        const o = (e, t) => new Promise(n => {
          let r = 0;
          const s = e.subscribe(e => {
            ++r === t && (n(e), s.unsubscribe());
          });
        }),
              i = (e, t = () => !0) => new Promise(n => {
          const r = e.subscribe(e => {
            !0 === t(e) && (n(e), r.unsubscribe());
          });
        }),
              c = {
          Bundle: class {
            constructor() {
              this.subscriptions = [];
            }

            add(e) {
              this.subscriptions.push(e);
            }

            unsubscribe() {
              this.subscriptions.forEach(e => e.unsubscribe()), this.subscriptions = [];
            }

          },
          Beacon: class {
            constructor() {
              this.subscribers = {};
            }

            subscribe(e) {
              const t = r.ofLength(5);
              return this.subscribers[t] = e, {
                unsubscribe: () => delete this.subscribers[t]
              };
            }

            next(e) {
              for (const t in this.subscribers) this.subscribers[t](e);
            }

            first(e = () => !0) {
              return i(this, e);
            }

            nthEvent(e) {
              return o(this, e);
            }

          },
          nthEvent: o,
          first: i
        };

        var u = c;
        const a = {
          isArray: e => !!e && (Array.isArray ? Array.isArray(e) : e && "object" == typeof e && e.constructor === Array)
        };
        var l = a;

        const f = (e, t) => {
          for (const n in t) t.hasOwnProperty(n) && (e.style[n] = t[n]);
        },
              d = (e, t) => {
          for (const n in t) t.hasOwnProperty(n) || (e[n] = t[n]);
        },
              p = {
          create: (e = {}, ...t) => {
            const n = document.createElement(e.tag || "div");
            e.id && (n.id = e.id), e.className && (n.classList.value = e.className), e.cssText && (n.style.cssText = e.cssText), e.styles && f(n, e.styles), e.innerHTML && (n.innerHTML = e.innerHTML), e.innerText && (n.innerText = e.innerText), e.events && d(n, e.events);

            for (const e of t) n.appendChild(e);

            return n;
          },
          setStyles: f,
          setEvents: d,
          addClassNames: (e, t) => {
            for (const n of t) e.classList.add(n);
          },
          removeClassNames: (e, t) => {
            for (const n of t) e.classList.remove(n);
          },
          clearClassList: e => e && e.className && (e.className = ""),
          waitForElements: (...e) => e.forEach(e => e.getBoundingClientRect())
        };

        var b = p;
        const h = {
          exec: (e, t = 0) => new Promise(n => setTimeout(() => {
            const t = e();
            n(t);
          }, t)),
          duration: (e = 0) => new Promise(t => setTimeout(() => {
            t();
          }, e))
        };
        var v = h;

        const y = (e, t = !0) => e && "/" !== e ? (e.startsWith("/") || (e = "/" + e), e = m(e), t && (e = e.toLowerCase()), e) : "/",
              m = e => (g(e) && (e = e.substring(0, e.length - 1)), e),
              g = e => "/" == e.substring(e.length - 1),
              x = {
          normalise: y,
          removeTrailingSlash: m,
          hasTrailingSlash: g,
          matchPath: (e, t) => {
            t = y(t, !1).split("?")[0];
            const n = {},
                  r = (e = y(e)).split("/"),
                  s = t.split("/");

            if (r.length === s.length || e.includes("**")) {
              for (const e in r) if (r[e].startsWith(":") && "/" !== t) n[r[e].slice(1)] = s[e].toString();else {
                if (r[e].startsWith("**")) return n;
                if (r[e] !== s[e].toLowerCase()) return;
              }

              return n;
            }
          },
          deserializeQuery: (e = "") => {
            if (!e.startsWith("?")) return {};
            var t = e.slice(1).split("&"),
                n = {};

            for (const e of t) {
              const t = e.split("=");
              t[0] && (n[t[0]] = decodeURIComponent(t[1] || ""));
            }

            return n;
          }
        };

        var j = x;
        n.d(t, "eventStream", function () {
          return c;
        }), n.d(t, "checkType", function () {
          return a;
        }), n.d(t, "element", function () {
          return p;
        }), n.d(t, "genString", function () {
          return r;
        }), n.d(t, "sleep", function () {
          return h;
        }), n.d(t, "url", function () {
          return x;
        }), t.default = {
          eventStream: u,
          checkType: l,
          element: b,
          genString: s,
          sleep: v,
          url: j
        };
      }]);
    }]);
  });
});
var svelte = unwrapExports(dist$1);

var dist$2 = createCommonjsModule(function (module, exports) {
  !function (t, e) {
    module.exports = e();
  }(window, function () {
    return function (t) {
      var e = {};

      function n(r) {
        if (e[r]) return e[r].exports;
        var o = e[r] = {
          i: r,
          l: !1,
          exports: {}
        };
        return t[r].call(o.exports, o, o.exports, n), o.l = !0, o.exports;
      }

      return n.m = t, n.c = e, n.d = function (t, e, r) {
        n.o(t, e) || Object.defineProperty(t, e, {
          enumerable: !0,
          get: r
        });
      }, n.r = function (t) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
          value: "Module"
        }), Object.defineProperty(t, "__esModule", {
          value: !0
        });
      }, n.t = function (t, e) {
        if (1 & e && (t = n(t)), 8 & e) return t;
        if (4 & e && "object" == typeof t && t && t.__esModule) return t;
        var r = Object.create(null);
        if (n.r(r), Object.defineProperty(r, "default", {
          enumerable: !0,
          value: t
        }), 2 & e && "string" != typeof t) for (var o in t) n.d(r, o, function (e) {
          return t[e];
        }.bind(null, o));
        return r;
      }, n.n = function (t) {
        var e = t && t.__esModule ? function () {
          return t.default;
        } : function () {
          return t;
        };
        return n.d(e, "a", e), e;
      }, n.o = function (t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }, n.p = "", n(n.s = 1);
    }([function (t, e, n) {
      t.exports = function (t) {
        var e = {};

        function n(r) {
          if (e[r]) return e[r].exports;
          var o = e[r] = {
            i: r,
            l: !1,
            exports: {}
          };
          return t[r].call(o.exports, o, o.exports, n), o.l = !0, o.exports;
        }

        return n.m = t, n.c = e, n.d = function (t, e, r) {
          n.o(t, e) || Object.defineProperty(t, e, {
            enumerable: !0,
            get: r
          });
        }, n.r = function (t) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
            value: "Module"
          }), Object.defineProperty(t, "__esModule", {
            value: !0
          });
        }, n.t = function (t, e) {
          if (1 & e && (t = n(t)), 8 & e) return t;
          if (4 & e && "object" == typeof t && t && t.__esModule) return t;
          var r = Object.create(null);
          if (n.r(r), Object.defineProperty(r, "default", {
            enumerable: !0,
            value: t
          }), 2 & e && "string" != typeof t) for (var o in t) n.d(r, o, function (e) {
            return t[e];
          }.bind(null, o));
          return r;
        }, n.n = function (t) {
          var e = t && t.__esModule ? function () {
            return t.default;
          } : function () {
            return t;
          };
          return n.d(e, "a", e), e;
        }, n.o = function (t, e) {
          return Object.prototype.hasOwnProperty.call(t, e);
        }, n.p = "", n(n.s = 0);
      }([function (t, e, n) {

        n.r(e);
        const r = {
          ofLength: function (t) {
            for (var e = "", n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r = n.length, o = 0; o < t; o++) e += n.charAt(Math.floor(Math.random() * r));

            return e;
          }
        };
        var o = r;

        const s = (t, e) => new Promise(n => {
          let r = 0;
          const o = t.subscribe(t => {
            ++r === e && (n(t), o.unsubscribe());
          });
        }),
              i = (t, e = () => !0) => new Promise(n => {
          const r = t.subscribe(t => {
            !0 === e(t) && (n(t), r.unsubscribe());
          });
        }),
              u = {
          Bundle: class {
            constructor() {
              this.subscriptions = [];
            }

            add(t) {
              this.subscriptions.push(t);
            }

            unsubscribe() {
              this.subscriptions.forEach(t => t.unsubscribe()), this.subscriptions = [];
            }

          },
          Beacon: class {
            constructor() {
              this.subscribers = {};
            }

            subscribe(t) {
              const e = r.ofLength(5);
              return this.subscribers[e] = t, {
                unsubscribe: () => delete this.subscribers[e]
              };
            }

            next(t) {
              for (const e in this.subscribers) this.subscribers[e](t);
            }

            first(t = () => !0) {
              return i(this, t);
            }

            nthEvent(t) {
              return s(this, t);
            }

          },
          nthEvent: s,
          first: i
        };

        var a = u;
        const c = {
          isArray: t => !!t && (Array.isArray ? Array.isArray(t) : t && "object" == typeof t && t.constructor === Array)
        };
        var f = c;

        const l = (t, e) => {
          for (const n in e) e.hasOwnProperty(n) && (t.style[n] = e[n]);
        },
              d = (t, e) => {
          for (const n in e) e.hasOwnProperty(n) || (t[n] = e[n]);
        },
              m = {
          create: (t = {}, ...e) => {
            const n = document.createElement(t.tag || "div");
            t.id && (n.id = t.id), t.className && (n.classList.value = t.className), t.cssText && (n.style.cssText = t.cssText), t.styles && l(n, t.styles), t.innerHTML && (n.innerHTML = t.innerHTML), t.innerText && (n.innerText = t.innerText), t.events && d(n, t.events);

            for (const t of e) n.appendChild(t);

            return n;
          },
          setStyles: l,
          setEvents: d,
          addClassNames: (t, e) => {
            for (const n of e) t.classList.add(n);
          },
          removeClassNames: (t, e) => {
            for (const n of e) t.classList.remove(n);
          },
          clearClassList: t => t && t.className && (t.className = ""),
          waitForElements: (...t) => t.forEach(t => t.getBoundingClientRect())
        };

        var p = m;
        const h = {
          exec: (t, e = 0) => new Promise(n => setTimeout(() => {
            const e = t();
            n(e);
          }, e)),
          duration: (t = 0) => new Promise(e => setTimeout(() => {
            e();
          }, t))
        };
        var b = h;

        const v = (t, e = !0) => t && "/" !== t ? (t.startsWith("/") || (t = "/" + t), t = y(t), e && (t = t.toLowerCase()), t) : "/",
              y = t => (g(t) && (t = t.substring(0, t.length - 1)), t),
              g = t => "/" == t.substring(t.length - 1),
              x = {
          normalise: v,
          removeTrailingSlash: y,
          hasTrailingSlash: g,
          matchPath: (t, e) => {
            e = v(e, !1).split("?")[0];
            const n = {},
                  r = (t = v(t)).split("/"),
                  o = e.split("/");

            if (r.length === o.length || t.includes("**")) {
              for (const t in r) if (r[t].startsWith(":") && "/" !== e) n[r[t].slice(1)] = o[t].toString();else {
                if (r[t].startsWith("**")) return n;
                if (r[t] !== o[t].toLowerCase()) return;
              }

              return n;
            }
          },
          deserializeQuery: (t = "") => {
            if (!t.startsWith("?")) return {};
            var e = t.slice(1).split("&"),
                n = {};

            for (const t of e) {
              const e = t.split("=");
              e[0] && (n[e[0]] = decodeURIComponent(e[1] || ""));
            }

            return n;
          }
        };

        var O = x;
        n.d(e, "eventStream", function () {
          return u;
        }), n.d(e, "checkType", function () {
          return c;
        }), n.d(e, "element", function () {
          return m;
        }), n.d(e, "genString", function () {
          return r;
        }), n.d(e, "sleep", function () {
          return h;
        }), n.d(e, "url", function () {
          return x;
        }), e.default = {
          eventStream: a,
          checkType: f,
          element: p,
          genString: o,
          sleep: b,
          url: O
        };
      }]);
    }, function (t, e, n) {

      n.r(e);
      var r = n(0);

      class o {
        constructor(t = "no-animation", e = 0, n = !1, r = !0) {
          if (this.name = t, this.duration = e, this.overrideDuration = n, this.animationOnFirst = r, this.routes = [], "" === t) throw new Error("Invalid animation name");
        }

        putRoute(t) {
          t.from && (t.from = r.url.normalise(t.from)), t.to && (t.to = r.url.normalise(t.to));

          for (const e in this.routes) if (this.routes[e].to == t.to && this.routes[e].from == t.from) return void (this.routes[e] = t);

          this.routes.push(t);
        }

        putRoutes(t) {
          for (const e of t) this.putRoute(e);
        }

        calculate(t, e) {
          let n = this.name,
              r = this.duration;

          for (const o of this.routes) {
            const s = o.from,
                  i = o.to;
            "/**" === s && "/**" === i && (o.name && (n = o.name), o.duration && (r = o.duration)), "/**" === s && i === e && (o.name && (n = o.name), o.duration && (r = o.duration)), "/**" === i && s === t && (o.name && (n = o.name), o.duration && (r = o.duration));
          }

          for (const o of this.routes) {
            const s = o.from,
                  i = o.to;
            s === t && i === e && (o.name && (n = o.name), o.duration && (r = o.duration));
          }

          return {
            name: n,
            duration: r
          };
        }

      }

      const s = t => (t.animation || (t.animation = new o()), t.animation),
            i = t => (e, n, r, o) => {
        const i = s(r);
        void 0 !== t.name && (i.name = t.name), void 0 !== t.duration && (i.duration = t.duration), void 0 !== t.overrideDuration && (i.overrideDuration = t.overrideDuration), void 0 !== t.animationOnFirst && (i.animationOnFirst = t.animationOnFirst);
        const u = o.history.currentEvent;
        void 0 !== u && (n.ctx.animation = i.calculate(u.from, u.to));
      },
            u = t => (e, n, r, o) => {
        const i = s(r);

        for (const n of t) n.from || (n.from = e.routePattern), n.to || (n.to = e.routePattern);

        i.putRoutes(t);
        const u = o.history.currentEvent;
        void 0 !== u && (n.ctx.animation = i.calculate(u.from, u.to));
      },
            a = u;

      class c {
        constructor() {
          this.from = "", this.to = "";
        }

      }

      n.d(e, "defaults", function () {
        return i;
      }), n.d(e, "routes", function () {
        return u;
      }), n.d(e, "route", function () {
        return a;
      }), n.d(e, "AnimationState", function () {
        return o;
      }), n.d(e, "getAnimationState", function () {
        return s;
      }), n.d(e, "AnimationRoute", function () {
        return c;
      });
      e.default = {
        defaults: i,
        routes: u,
        route: a
      };
    }]);
  });
});
var animate = unwrapExports(dist$2);

var dist$3 = createCommonjsModule(function (module, exports) {
  !function (n, t) {
    module.exports = t();
  }(window, function () {
    return function (n) {
      var t = {};

      function e(o) {
        if (t[o]) return t[o].exports;
        var r = t[o] = {
          i: o,
          l: !1,
          exports: {}
        };
        return n[o].call(r.exports, r, r.exports, e), r.l = !0, r.exports;
      }

      return e.m = n, e.c = t, e.d = function (n, t, o) {
        e.o(n, t) || Object.defineProperty(n, t, {
          enumerable: !0,
          get: o
        });
      }, e.r = function (n) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(n, Symbol.toStringTag, {
          value: "Module"
        }), Object.defineProperty(n, "__esModule", {
          value: !0
        });
      }, e.t = function (n, t) {
        if (1 & t && (n = e(n)), 8 & t) return n;
        if (4 & t && "object" == typeof n && n && n.__esModule) return n;
        var o = Object.create(null);
        if (e.r(o), Object.defineProperty(o, "default", {
          enumerable: !0,
          value: n
        }), 2 & t && "string" != typeof n) for (var r in n) e.d(o, r, function (t) {
          return n[t];
        }.bind(null, r));
        return o;
      }, e.n = function (n) {
        var t = n && n.__esModule ? function () {
          return n.default;
        } : function () {
          return n;
        };
        return e.d(t, "a", t), t;
      }, e.o = function (n, t) {
        return Object.prototype.hasOwnProperty.call(n, t);
      }, e.p = "", e(e.s = 1);
    }([function (n, t, e) {

      var o = this && this.__importStar || function (n) {
        if (n && n.__esModule) return n;
        var t = {};
        if (null != n) for (var e in n) Object.hasOwnProperty.call(n, e) && (t[e] = n[e]);
        return t.default = n, t;
      };

      Object.defineProperty(t, "__esModule", {
        value: !0
      });
      const r = o(e(2)),
            i = o(e(3)),
            s = o(e(4)),
            p = o(e(5)),
            d = e(6);
      t.loader = (n = ".router-view") => {
        const t = document.createElement("style");
        return t.innerHTML += d.root(n), t.innerHTML += s.pop(n), t.innerHTML += p.push(n), t.innerHTML += r.slide(n), t.innerHTML += i.fade(n), document.head.appendChild(t), (n, t, e) => null;
      }, t.slideUp = "slide-up", t.slideDown = "slide-down", t.slideLeft = "slide-left", t.slideRight = "slide-right", t.pushUp = "push-up", t.pushDown = "push-down", t.pushLeft = "push-left", t.pushRight = "push-right", t.popUp = "pop-up", t.popDown = "pop-down", t.popLeft = "pop-left", t.popRight = "pop-right", t.fade = "fade";
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), function (n) {
        for (var e in n) t.hasOwnProperty(e) || (t[e] = n[e]);
      }(e(0));
      const o = e(0);
      t.default = {
        loader: o.loader,
        slideUp: o.slideUp,
        slideDown: o.slideDown,
        slideLeft: o.slideLeft,
        slideRight: o.slideRight,
        pushUp: o.pushUp,
        pushDown: o.pushDown,
        pushLeft: o.pushLeft,
        pushRight: o.pushRight,
        popUp: o.popUp,
        popDown: o.popDown,
        popLeft: o.popLeft,
        popRight: o.popRight,
        fade: o.fade
      };
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), t.slide = n => `\n${n}.slide-up.slide-up-enter {\n    top: 100%;\n    bottom: auto;\n    transform: translate3d(0,-100%,0);\n}\n${n}.slide-up.slide-up-exit {\n    transform: translate3d(0,-100%,0);\n    top: 0%;\n    bottom: auto;\n}\n\n${n}.slide-down.slide-down-enter {\n    top: auto;\n    bottom: 100%;\n    transform: translate3d(0,100%,0);\n}\n${n}.slide-down.slide-down-exit {\n    top: auto;\n    transform: translate3d(0,100%,0);\n    bottom: 0%;\n}\n\n${n}.slide-left.slide-left {\n    left: 100%;\n    right: auto;\n}\n${n}.slide-left.slide-left-enter {\n    transform: translate3d(-100%,0,0);\n}\n${n}.slide-left.slide-left-exit {\n    transform: translate3d(-100%,0,0);\n    left: 0%;\n    right: auto;\n}\n\n${n}.slide-right.slide-right {\n    right: 100%;\n    left: auto;\n}\n${n}.slide-right.slide-right-enter {\n    transform: translate3d(100%,0,0);\n}\n${n}.slide-right.slide-right-exit {\n    transform: translate3d(100%,0,0);\n    right: 0%;\n    left: auto;\n}\n\n${n}.slide-up-enter-first,\n${n}.slide-down-enter-first,\n${n}.slide-left-enter-first,\n${n}.slide-right-enter-first {\n    position: static;\n    transition-duration: 0s !important;\n}\n\n${n}.slide-up,\n${n}.slide-down,\n${n}.slide-left,\n${n}.slide-right {\n    transition: transform .5s ease-in-out;\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    width: 100vw;\n    height: 100vh;\n}\n\n${n}.slide-up-enter-done,\n${n}.slide-down-enter-done,\n${n}.slide-left-enter-done,\n${n}.slide-right-enter-done {\n    position: static;\n    transition: none;\n    transform: none;\n    height: auto;\n    width: auto;\n}\n`;
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), t.fade = n => `\n${n}.fade {\n    opacity: 0;\n    transition: opacity .5s;\n}\n\n${n}.fade-enter-first {\n    position: static;\n    transition-duration: 0s !important;\n}\n\n${n}.fade-enter {\n    opacity: 1;\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n}\n\n${n}.fade-enter-done {\n    opacity: 1;\n}\n\n${n}.fade-exit {\n    opacity: 0;\n}\n`;
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), t.pop = n => `\n${n}.push-up {\n    transform: translate3d(0, 100%, 0);\n}\n${n}.push-up-enter {\n    transform: translate3d(0, 0%, 0);\n}\n\n${n}.push-down {\n    transform: translate3d(0, -100%, 0);\n}\n${n}.push-down-enter {\n    transform: translate3d(0, 0%, 0);\n}\n\n${n}.push-left {\n    transform: translate3d(100%, 0, 0);\n}\n${n}.push-left-enter {\n    transform: translate3d(0, 0, 0);\n}\n\n${n}.push-right {\n    transform: translate3d(-100%, 0, 0);\n}\n${n}.push-right-enter {\n    transform: translate3d(0, 0, 0);\n}\n\n${n}.push-up,\n${n}.push-down,\n${n}.push-left,\n${n}.push-right {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n}\n\n${n}.push-up-enter-first,\n${n}.push-down-enter-first,\n${n}.push-left-enter-first,\n${n}.push-right-enter-first {\n    position: static;\n    transition-duration: 0s !important;\n}\n\n${n}.push-up-enter-done,\n${n}.push-down-enter-done,\n${n}.push-left-enter-done,\n${n}.push-right-enter-done {\n    transform: none;\n}\n\n${n}.push-up-exit,\n${n}.push-down-exit,\n${n}.push-left-exit,\n${n}.push-right-exit {\n    z-index: 1000;\n    transform: none\n}\n\n${n}.push-up-enter,\n${n}.push-down-enter,\n${n}.push-left-enter,\n${n}.push-right-enter {\n    z-index: 10000;\n    transition: transform .5s;\n}`;
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), t.push = n => `\n${n}.pop-up {\n    transform: translate3d(0, 0%, 0);\n}\n${n}.pop-up-exit {\n    transform: translate3d(0, -100%, 0);\n}\n\n${n}.pop-down {\n    transform: translate3d(0,  0, 0);\n}\n${n}.pop-down-exit {\n    transform: translate3d(0, 100%, 0);\n}\n\n${n}.pop-left {\n    transform: translate3d(0, 0, 0);\n}\n${n}.pop-left-exit {\n    transform: translate3d(-100%, 0, 0);\n}\n\n${n}.pop-right {\n    transform: translate3d(0, 0, 0);\n}\n${n}.pop-right-exit {\n    transform: translate3d(100%, 0, 0);\n}\n\n${n}.pop-up,\n${n}.pop-left,\n${n}.pop-right,\n${n}.pop-down {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n}\n\n${n}.pop-up-enter-first,\n${n}.pop-left-enter-first,\n${n}.pop-right-enter-first,\n${n}.pop-down-enter-first {\n    position: static;\n    transition-duration: 0s !important;\n}\n\n${n}.pop-up-enter-done,\n${n}.pop-down-enter-done,\n${n}.pop-left-enter-done,\n${n}.pop-right-enter-done {\n    transform: none;\n}\n\n${n}.pop-up-enter,\n${n}.pop-down-enter,\n${n}.pop-left-enter,\n${n}.pop-right-enter {\n    transform: none;\n    z-index: 1000;\n}\n\n${n}.pop-up-exit,\n${n}.pop-down-exit,\n${n}.pop-left-exit,\n${n}.pop-right-exit {\n    transition: transform .5s;\n    z-index: 10000;\n}`;
    }, function (n, t, e) {

      Object.defineProperty(t, "__esModule", {
        value: !0
      }), t.root = n => "\n.is-animating {\n    overflow: hidden;\n    position: fixed;\n    width: 100%;\n    height: 100%;\n}\n";
    }]);
  });
});
var transition = unwrapExports(dist$3);

class AppNavigation {
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
      } else if (typeof arguments[0] === "string") {
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
    this.routes.map(route => this.app.path(route.route, (req, res) => res.mount(route.view, route.scope(req, this.app))));
    this.app.load();
  }

  disable() {
    this.app.destroy();
  }

}

/* src\App.svelte generated by Svelte v3.12.1 */
const file$8 = "src\\App.svelte"; // (1:0) <Layout {activePage} pages={routesByLevel(0)} {navigator}>

function create_default_slot(ctx) {
  var div;
  const block = {
    c: function create() {
      div = element("div");
      attr_dev(div, "class", "page");
      add_location(div, file$8, 1, 4, 64);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      ctx.div_binding(div);
    },
    p: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }

      ctx.div_binding(null);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_default_slot.name,
    type: "slot",
    source: "(1:0) <Layout {activePage} pages={routesByLevel(0)} {navigator}>",
    ctx
  });
  return block;
}

function create_fragment$8(ctx) {
  var current;
  var layout = new Layout({
    props: {
      activePage: ctx.activePage,
      pages: routesByLevel(0),
      navigator: ctx.navigator,
      $$slots: {
        default: [create_default_slot]
      },
      $$scope: {
        ctx
      }
    },
    $$inline: true
  });
  const block = {
    c: function create() {
      layout.$$.fragment.c();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      mount_component(layout, target, anchor);
      current = true;
    },
    p: function update(changed, ctx) {
      var layout_changes = {};
      if (changed.activePage) layout_changes.activePage = ctx.activePage;
      if (changed.navigator) layout_changes.navigator = ctx.navigator;
      if (changed.$$scope || changed.routerTargetElement) layout_changes.$$scope = {
        changed,
        ctx
      };
      layout.$set(layout_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(layout.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(layout.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(layout, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment$8.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}

function instance$4($$self, $$props, $$invalidate) {
  let activePage;

  const activePageChange = event => $$invalidate('activePage', activePage = event.target.location.pathname || "/home");

  addEventListener('pushstate', activePageChange);
  addEventListener('popstate', activePageChange);
  let routerTargetElement;
  let navigator;
  const navigation = new AppNavigation(routes);
  setNavigator(navigation.getInstance());
  onMount(() => {
    console.log("App onMount()");
    $$invalidate('navigator', navigator = navigation.getInstance());
    navigation.enable(routerTargetElement);
    navigator.navigate(window.location.pathname);
  });
  onDestroy(() => {
    console.log("App onDestroy()");
    navigation.disable();
  });

  function div_binding($$value) {
    binding_callbacks[$$value ? 'unshift' : 'push'](() => {
      $$invalidate('routerTargetElement', routerTargetElement = $$value);
    });
  }

  $$self.$capture_state = () => {
    return {};
  };

  $$self.$inject_state = $$props => {
    if ('activePage' in $$props) $$invalidate('activePage', activePage = $$props.activePage);
    if ('routerTargetElement' in $$props) $$invalidate('routerTargetElement', routerTargetElement = $$props.routerTargetElement);
    if ('navigator' in $$props) $$invalidate('navigator', navigator = $$props.navigator);
  };

  return {
    activePage,
    routerTargetElement,
    navigator,
    div_binding
  };
}

class App extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance$4, create_fragment$8, safe_not_equal, []);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "App",
      options,
      id: create_fragment$8.name
    });
  }

}

var app = new App({
  target: document.body
});

export default app;
//# sourceMappingURL=main.js.map
