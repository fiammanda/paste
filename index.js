export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/") {
      const { keys } = await env.KV.list();
      keys.sort((a, b) => b.metadata.update - a.metadata.update);

      const head = `<span>ls</span>`;
      const link = `<a href="/new" class="button">new</a>`;
      const main = `<ul>` + keys
        .map(({ name, expiration, metadata }) => `<li>
          <a href="/${name}">
            <time datetime="${metadata.update}"></time>
            <span>${escape(metadata.title)}</span>
            <span data-expiration="${expiration || 0}"></span>
          </a>
        </li>`)
        .join("")
        + `<li> ${keys.length} in total</li></ul>`;
      const script = `
        document.querySelectorAll("li a").forEach(el => {
          el.firstElementChild.textContent = new Date(+el.firstElementChild.dateTime).toLocaleString("sv-se");

          const span = el.lastElementChild;
          const time = +span.dataset.expiration;
          if (!time) {
            span.className = "u0";
            span.textContent = "永久保存";
            return;
          }
          const diff = time - Math.floor(Date.now() / 1000);
          if (diff < 3600) {
            span.className = "u4";
            span.textContent = Math.floor(diff / 60) + " 分钟后过期";
          } else if (diff < 86400) {
            span.className = "u3";
            span.textContent = Math.floor(diff / 3600) + " 小时后过期";
          } else if (diff < 2592000) {
            span.className = "u2";
            span.textContent = Math.floor(diff / 86400) + " 天后过期";
          } else {
            span.className = "u1";
            span.textContent = new Date(time * 1000).toLocaleDateString("sv-se") + " 过期";
          }
        });
      `;

      return new Response(renderHTML(head, link, main, script), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=60"
        }
      });
    }

    if (path === "/new" || /^\/\d+$/.test(path)) {
      const key = path === "/new" ? "" : path.slice(1);
      const info = path === "/new"
        ? { value: "", metadata: { title: "" }}
        : await env.KV.getWithMetadata(key);

      if (info.value === null) {
        return new Response("Not Found", { status: 404 });
      }

      const head = `<span data-key="${key}" data-update="${key ? info.metadata.update : ""}"></span>`;
      const link =  `<a href="/" class="button">back</a>`;
      const main = `<form autocomplete="off" spellcheck="false">
        <fieldset>
          <input name="key" type="hidden" value="${key}" />
          <label aria-label="title">
            <span>title</span>
            <input name="title" type="text" value="${escape(info.metadata.title)}" />
          </label>
          <div aria-label="expires" class="select" tabindex="0">
            <label>
              <span>expires</span>
              <button name="expires" type="button" role="combobox" value="" tabindex="-1">never</button>
            </label>
            <ul role="listbox">
              <li role="option" aria-selected="true" data-index="0" data-value="" class="active">never</li>
              <li role="option" aria-selected="false" data-index="1" data-value="86400">in 1 day</li>
              <li role="option" aria-selected="false" data-index="2" data-value="604800">in 1 week</li>
              <li role="option" aria-selected="false" data-index="3" data-value="2592000">in 1 month</li>
            </ul>
          </div>
          <div aria-label="content">
            <label>
              <span>content</span>
              <textarea name="content" required>${escape(info.value)}</textarea>
            </label>
            <div>
              <button type="button" class="button" name="replace">replace</button>
              <button type="button" class="button" name="copy">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                copy
              </button>
            </div>
          </div>
        </fieldset>
        <footer>
          <button type="submit" class="button">submit</button>
          <button type="submit" class="button" formnovalidate>delete</button>
        </footer>
      </form>`;
      const script = `${renderScript.toString().slice(25, -1)}`;

      return new Response(renderHTML(head, link, main, script), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=60"
        }
      });
    }

    if (path === "/api") {
      if (req.method === "POST") {
        const { key, value, options } = await req.json();
        await env.KV.put(key, value, options);
        return new Response(null, { status: 204 });
      }
      if (req.method === "DELETE") {
        const { key } = await req.json();
        await env.KV.delete(key);
        return new Response(null, { status: 204 });
      }
    }

    return new Response("Not Found", {status: 404});
  }
};


function escape(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[c]);
}

function renderHTML (head, link, main, script) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path fill='url(%23a)' d='M8.5 4A3.5 3.5 0 0 0 5 7.5v19A3.5 3.5 0 0 0 8.5 30h8.974c.146-.328.353-.634.621-.903l8.505-8.505a3 3 0 0 1 .4-.336V7.5A3.5 3.5 0 0 0 23.5 4z'/><path fill='url(%23b)' fill-opacity='.8' d='M10 13a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2h-8a1 1 0 0 1-1-1m0 5a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1m1 4a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2z'/><path fill='url(%23c)' fill-opacity='.4' d='M8.5 4A3.5 3.5 0 0 0 5 7.5v19A3.5 3.5 0 0 0 8.5 30h8.974c.146-.328.353-.634.621-.903l8.505-8.505a3 3 0 0 1 .4-.336V7.5A3.5 3.5 0 0 0 23.5 4z'/><path fill='url(%23d)' fill-opacity='.2' d='M8.5 4A3.5 3.5 0 0 0 5 7.5v19A3.5 3.5 0 0 0 8.5 30h8.974c.146-.328.353-.634.621-.903l8.505-8.505a3 3 0 0 1 .4-.336V7.5A3.5 3.5 0 0 0 23.5 4z'/><path fill='url(%23e)' d='M10 5a3 3 0 0 1 3-3h6a3 3 0 1 1 0 6h-6a3 3 0 0 1-3-3'/><path fill='url(%23f)' d='M27.16 16a2.88 2.88 0 0 0-2.084.852l-1 1-.217.218-1.021 1.024.004.004-6.084 6.144-.248.25a2.66 2.66 0 0 0-.688 1.205l-.789 3.051a1 1 0 0 0 1.217 1.22l3.02-.777a2.8 2.8 0 0 0 1.27-.722l.222-.223 6.168-6.113.008.008 2.21-2.215a2.88 2.88 0 0 0 .073-4.018A2.88 2.88 0 0 0 27.16 16'/><defs><linearGradient id='a' x1='5' x2='25.632' y1='6.6' y2='31.15' gradientUnits='userSpaceOnUse'><stop stop-color='%23ad4'/><stop offset='1' stop-color='%239c6'/></linearGradient><linearGradient id='b' x1='17.5' x2='8.622' y1='24' y2='13.125' gradientUnits='userSpaceOnUse'><stop stop-color='%23efe'/><stop offset='1' stop-color='%23fff'/></linearGradient><linearGradient id='e' x1='16' x2='16' y1='2' y2='8' gradientUnits='userSpaceOnUse'><stop stop-color='%23476'/><stop offset='1' stop-color='%23254'/></linearGradient><linearGradient id='f' x1='30' x2='16' y1='16' y2='30' gradientUnits='userSpaceOnUse'><stop stop-color='%23699'/><stop offset='1' stop-color='%23366'/></linearGradient><radialGradient id='c' cx='0' cy='0' r='1' gradientTransform='matrix(8.9375 0 0 7.86963 16 2.556)' gradientUnits='userSpaceOnUse'><stop stop-color='%23042'/><stop offset='1' stop-color='%23042' stop-opacity='0'/></radialGradient><radialGradient id='d' cx='0' cy='0' r='1' gradientTransform='rotate(135.565 7.13 16.2)scale(14.4424 6.48727)' gradientUnits='userSpaceOnUse'><stop stop-color='%23042'/><stop offset='1' stop-color='%23042' stop-opacity='0'/></radialGradient></defs></svg>">
    <title>PASTE!</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        border: none;
        outline: none;
        box-sizing: border-box;
      }
      ::selection {
        background: hsl(80 60 30);
      }
      :root {
        font-size: 16px;
        cursor: crosshair;
        scrollbar-width: thin;
        scrollbar-color: #fff8 transparent;
        --padding: max(1.5rem, calc(50% - 20rem));
        --font-mono: "Punctuation", "Iosevka", -apple-system, "MiSans", "HarmonyOS Sans", "Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", monospace;
      }
      body {
        font: .9375rem / 1.75 var(--font-mono);
        color: #fff;
        background: hsl(240 8 20);
      }
      svg {
        display: block;
        width: 1em;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
      }
      a {
        color: inherit;
        text-decoration: none;
        transition: background .2s ease-in-out;
        user-select: none;
        &:hover, &:focus {
          background: hsl(240 40 80 / .1);
        }
      }
      button, input, textarea {
        font: inherit;
        color: inherit;
        background: none;
      }
      button {
        cursor: pointer;
        transition: .2s ease-in-out;
        transition-property: color, background;
        &:disabled {
          pointer-events: none;
        }
      }
      label {
        display: block;
        padding: .5em 0;
      }
      ul {
        list-style: none;
      }
      main {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 0 auto;
        padding: 1.5em;
        height: 100dvh;
        max-width: 45em;
        > div {
          display: flex;
          align-items: center;
        }
        > ul li {
          display: flex;
          gap: .25em;
          white-space: nowrap;
          &::before {
            content: "├";
            color: hsl(80 80 60);
          }
          &:last-child::before {
            content: "└";
          }
          &:last-child {
            gap: .5em;
            color: hsl(240 8 80);
          }
          a {
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1em;
            padding: 0 .25em;
            &:hover {
              background: hsl(240 20 80 / .2);
            }
          }
          time {
            color: hsl(240 8 80);
            @media (max-width: 360px) {
              width: 5em;
              overflow: clip;
            }
          }
          span:last-of-type {
            margin: 0 0 0 auto;
            font-size: .75rem;
            color: hsl(240 8 80);
          }
        }
      }
      h1 {
        font: inherit;
        &::before {
          content: "~";
          margin: 0 .5em 0 0;
          color: hsl(80 80 60);
        }
      }
      h2 {
        flex: 1;
        font: inherit;
        &::before {
          content: "$";
          color: hsl(80 80 60);
        }
        span:first-child {
          margin: 0 .5em;
        }
        span:last-child {
          color: hsl(240 8 60);
        }
        span[data-key] {
          &::after {
            content: attr(data-update);
            font-size: .625rem;
          }
          &::before {
            content: attr(data-key) " ";
          }
          &[data-key=""]::before {
            content: "new ";
          }
        }
      }
      form {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: hsl(240 8 90);
        &::before {
          content: attr(data-notice);
          position: absolute;
          inset: -1em;
          display: grid;
          place-items: center;
          background: hsl(240 8 20 / .8);
          backdrop-filter: blur(.25rem);
          opacity: 0;
          z-index: 2;
          pointer-events: none;
          transition: opacity .2s ease-in-out;
        }
        &.disabled::before {
          opacity: 1;
          pointer-events: auto;
        }
      }
      fieldset {
        display: grid;
        grid-template-columns: 1fr 7em;
        grid-template-rows: max-content 1fr;
        gap: 1rem;
        height: 100%;
      }
      footer {
        padding: .5em 0;
        text-align: center;
        user-select: none;
        button {
          margin: 0 .5em;
          form:has(textarea:invalid) &:first-child,
          form:has([name="key"][value=""]) &:last-child {
            color: hsl(240 8 60);
            pointer-events: none;
          }
        }
      }
      [aria-label] {
        cursor: text;
        border-top: 1px solid hsl(240 8 40);
        border-bottom: 1px solid hsl(240 8 40);
        transition: border .2s ease-in-out;
        &:focus-within {
          border-color: hsl(240 8 80);
        }
        span {
          color: hsl(240 8 60);
          &::before {
            content: ">";
            margin: 0 .5em 0 0;
            color: hsl(80 80 60);
          }
        }
        input, textarea {
          padding: 0 0 0 1em;
          width: 100%;
        }
        textarea {
          flex: 1;
          resize: none;
          overflow: clip auto;
        }
      }
      [aria-label="expires"] {
        cursor: pointer;
        label {
          pointer-events: none;
        }
        button {
          display: block;
          margin: 0 0 0 1em;
        }
      }
      [aria-label="content"] {
        position: relative;
        grid-column: 1 / -1;
        &:has(textarea:invalid) button:last-child {
          color: hsl(240 8 60);
          pointer-events: none;
        }
        div {
          position: absolute;
          inset: .5em 0 auto auto;
          user-select: none;
        }
        button {
          display: inline-grid;
          place-items: center;
          margin: 0 0 0 .5em;
          svg {
            position: absolute;
            stroke: transparent;
            transition: stroke .2s ease-in-out;
          }
          &:disabled  {
            color: transparent;
          }
          &:disabled svg {
            stroke: #fff;
          }
        }
        label {
          display: flex;
          flex-direction: column;
          height: 100%;
          cursor: text;
        }
        textarea {
          flex: 1;
        }
      }
      .button {
        position: relative;
        padding: 0 .75em;
        line-height: 1.5;
        color: #fff;
        &::before, &::after {
          content: "";
          position: absolute;
          width: .25em;
          border: 1px solid hsl(240 8 80 / .5);
        }
        &::before {
          inset: 0 auto 0 0;
          border-right: none;
        }
        &::after {
          inset: 0 0 0 auto;
          border-left: none;
        }
        &:hover, &:focus {
          background: hsl(240 40 80 / .2);
        }
      }
      .select {
        position: relative;
        user-select: none;
        &:focus-within ul {
          opacity: 1;
          pointer-events: auto;
          transform: translate(0, 1em);
        }
        ul {
          position: absolute;
          left: 0;
          right: 0;
          padding: 0 0 .5em;
          background: hsl(240 8 20 / .8);
          border-bottom: 1px solid hsl(240 8 80);
          backdrop-filter: blur(.25rem);
          opacity: 0;
          z-index: 1;
          pointer-events: none;
          transition: .2s ease-in-out;
          transition-property: opacity, transform, pointer-events;
          transition-behavior: allow-discrete;
        }
        li {
          padding: 0 1em;
          cursor: pointer;
          transition: .2s ease-in-out;
          transition-property: color, background;
          &:hover, &.active {
            background: #fff2;
          }
          &[aria-selected="true"] {
            color: hsl(80 80 60);
          }
        }
      }
      @font-face {
        font-family: "Punctuation";
        src: local("PingFang SC"), local("MiSans"), local("HarmonyOS Sans"), local("Source Han Sans SC"), local("Noto Sans CJK SC"), local("Noto Sans SC"), local("思源黑体");
        unicode-range: U+2018-201D;
      }
      @font-face {
        font-family:"Iosevka";
        src: local("Iosevka Term"), local("Sarasa Term SC"), url("https://fontsapi.zeoseven.com/es/main.woff2") format("woff2");
        font-weight: 100 900;
        font-display: swap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>PASTE!</h1>
      <div>
        <h2>
          <span>paste</span>
          ${head}
        </h2>
        ${link}
      </div>
      ${main}
    </main>
    <script>${script}</script>
  </body>
</html>`.replace(/\n(\s)*/g, "");
}

function renderScript() {
  const span = document.querySelector("h2 span:last-child");
  const form = document.forms[0];

  if (span.dataset.update) {
    span.dataset.update = new Date(+span.dataset.update).toLocaleString("sv-se");
  }

  form.copy.addEventListener("click", async e => {
    try {
      await navigator.clipboard.writeText(form.content.value);
      form.copy.disabled = true;
      setTimeout(() => {
        form.copy.disabled = false;
      }, 2000);
    } catch (e) {
      console.error(e);
    }
  });

  form.replace.addEventListener("click", async e => {
    try {
      form.content.value = await navigator.clipboard.readText();
    } catch (e) {
      console.error(e);
    }
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (e.submitter.textContent === "submit") {
      const action = form.key.value ? "更新" : "创建";
      const time = Date.now();
      const body = {
        key: form.key.value || Math.floor(time / 1000),
        value: form.content.value,
        options: {
          metadata: {
            title: form.title.value,
            update: time
          }
        }
      };
      if (form.expires.value) body.options.expirationTtl = Number(form.expires.value);
      form.dataset.notice = `正在${action}`;
      form.className = "disabled";
      const resp = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (resp.status === 204) {
        if (!form.key.value) {
          form.key.value = body.key;
          span.dataset.key = body.key;
        }
        span.dataset.update = new Date(time).toLocaleString("sv-se");
        form.dataset.notice = `${action}成功`;
        setTimeout(() => {
          form.removeAttribute("class");
        }, 1000);
      }
    } else {
      form.dataset.notice = "正在删除";
      form.className = "disabled";
      const resp = await fetch("/api", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: form.key.value })
      });
      if (resp.status === 204) {
        span.dataset.key = "";
        span.dataset.update = "";
        form.querySelectorAll("input, textarea").forEach(el => el.value = "");
        form.expires.change(0);
        form.dataset.notice = "删除成功";
        history.replaceState(null, "", "/new");
        setTimeout(() => {
          form.removeAttribute("class");
        }, 1000);
      }
    }
  });

  const Select = function (el) {
    this.el = {
      select: el,
      button: el.querySelector("[role=combobox]"),
      list:   el.querySelector("[role=listbox]"),
    };
    this.active = 0;
    this.length = this.el.list.children.length;
    this.init();
  };

  Select.prototype.init = function () {
    this.el.button.change = this.change.bind(this);
    this.el.select.addEventListener("focus", e => {
      this.el.list.children[this.active].removeAttribute("class");
      this.active = +this.el.list.querySelector("[aria-selected=true]").dataset.index;
      this.el.list.children[this.active].className = "active";
    });
    this.el.select.addEventListener("mousedown", e => {
      if (e.target === document.activeElement) {
        e.preventDefault();
        e.target.blur();
      }
    });
    this.el.select.addEventListener("keydown", e => {
      const { key } = e;
      if (key === "Escape" && e.target === document.activeElement) {
        e.target.blur();
        return;
      }
      if (key === "Enter") {
        this.change(this.active);
        return;
      }
      if (key === "Delete") {
        this.change(0);
        return;
      }
      if (key === "ArrowUp") {
        this.el.list.children[this.active].removeAttribute("class");
        this.active = this.active === 0
          ? this.length - 1
          : this.active - 1;
        this.el.list.children[this.active].className = "active";
        return;
      }
      if (key === "ArrowDown") {
        this.el.list.children[this.active].removeAttribute("class");
        this.active = this.active === this.length - 1
          ? 0
          : this.active + 1;
        this.el.list.children[this.active].className = "active";
        return;
      }
    });
    this.el.list.addEventListener("mouseenter", e => {
      this.el.list.querySelector(".active")?.removeAttribute("class");
    });
    this.el.list.addEventListener("mouseout", e => {
      this.active = e.target.dataset?.index ?? this.length - 1;
    });
    this.el.list.addEventListener("mouseleave", e => {
      this.el.list.children[this.active].className = "active";
    });
    this.el.list.addEventListener("click", e => {
      if (!e.target.matches("li")) return;
      this.change(e.target.dataset.index);
    });
  };

  Select.prototype.change = function (index) {
    const option = this.el.list.children[index];
    this.active = +index;
    this.el.button.value = option.dataset.value;
    this.el.button.textContent = option.textContent;
    this.el.list.querySelector(".active")?.removeAttribute("class");
    this.el.list.querySelector("[aria-selected=true]")?.setAttribute("aria-selected", "false");
    this.el.select.blur();
    option.ariaSelected = "true";
  };

  new Select(document.querySelector(".select"));
}