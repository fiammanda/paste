const doc = {
  head: document.querySelector("main div"),
  main: document.querySelector("main"),
};

Object.defineProperties(DATA, {
  each: {
    get() {
      const arr = Object.values(this).sort((a, b) => b.updated - a.updated);
      return arr.forEach.bind(arr);
    }
  },
  length: {
    get() {
      return Object.keys(this).length;
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
    if (key === "ArrowUp" || key === "ArrowDown") {
      this.el.list.children[this.active].removeAttribute("class");
      do {
        this.active += key === "ArrowUp" ? -1 : 1;
        if (this.active < 0) this.active = this.length - 1;
        if (this.active >= this.length) this.active = 0;
      } while (this.el.list.children[this.active].hidden);
      this.el.list.children[this.active].className = "active";
      return;
    }
  });
  this.el.list.addEventListener("mouseenter", e => {
    this.el.list.querySelector(".active")?.removeAttribute("class");
  });
  this.el.list.addEventListener("mouseleave", e => {
    this.el.list.children[this.active].className = "active";
  });
  this.el.list.addEventListener("mouseout", e => {
    this.active = +e.target.dataset.index;
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

navigate();

window.addEventListener("popstate", () => navigate());

doc.main.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", a.href);
  navigate();
});

function navigate(path = location.pathname) {

  if (path === "/") {
    doc.head.innerHTML = `
      <h2><span>paste</span> <span>ls</span></h2>
      <a href="/new" class="button">new</a>
      <p>共 ${DATA.length} 条</p>
    `;

    const ul = document.createElement("ul");
    DATA.each(({ key, title, content, updated, expires }) => {
      const li = document.createElement("li");
      const el = [ document.createElement("a"), document.createElement("button"), document.createElement("button"), document.createElement("p") ];
      el[0].href = "/" + key;
      el[0].textContent = title;
      el[1].className = "button";
      el[1].innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg><span>copy</span>`;
      el[1].addEventListener("click", async e => {
        try {
          await navigator.clipboard.writeText(content);
          el[1].disabled = true;
          setTimeout(() => el[1].disabled = false, 2000);
        } catch (err) {
          console.error(err);
        }
      });
      el[2].className = "button";
      el[2].innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 9c0-1.811 1.533-4 4-4s4 2.128 4 4c0 2.9-4 2.745-4 6" /><circle cx="12" cy="20" r=".5" /></svg><span>del</span>`;
      el[2].addEventListener("click", async e => {
        if (el[2].value) {
          el[2].value = "";
          li.ariaDisabled = "true";
          const resp = await fetch("/api", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key })
          });
          if (resp.status === 204) {
            li.ariaHidden = "true";
            delete DATA[key];
            setTimeout(() => li.remove(), 200);
          } else {
            li.removeAttribute("aria-disabled");
          }
        } else {
          el[2].value = "confirm";
          setTimeout(() => el[2].value = "", 2000);
        }
      });
      el[3].innerHTML = render(updated, expires);
      li.append(...el);
      ul.append(li);
    });
    doc.main.replaceChild(ul, doc.main.lastChild);

  } else if (path === "/new" || /^\/\d+$/.test(path)) {
    const key = path === "/new" ? "" : path.slice(1);
    let item = key ? DATA[key] : { key: "", title: "", content: "", updated: "" };
    if (!item) {
      history.replaceState(null, "", "/");
      navigate();
      return;
    }

    doc.head.innerHTML = render(item.updated, item.expires, path);

    const form = document.createElement("form");
    form.autocomplete = "off";
    form.spellcheck = "false";
    form.innerHTML = `
      <fieldset>
        <input name="key" type="hidden" />
        <input name="updated" type="hidden" />
        <label aria-label="title">
          <span>title</span>
          <input name="title" type="text" />
        </label>
        <div aria-label="expires" class="select" tabindex="0">
          <label>
            <span>expires</span>
            <button name="expires" type="button" role="combobox" value="0" tabindex="-1"></button>
          </label>
          <ul role="listbox">
            <li role="option" aria-selected="true" data-index="0" data-value="" class="active"></li>
            <li role="option" aria-selected="false" data-index="1" data-value="0" hidden>never</li>
            <li role="option" aria-selected="false" data-index="2" data-value="86400">in 1 day</li>
            <li role="option" aria-selected="false" data-index="3" data-value="604800">in 1 week</li>
            <li role="option" aria-selected="false" data-index="4" data-value="2592000">in 1 month</li>
          </ul>
        </div>
        <div aria-label="content">
          <label>
            <span>content</span>
            <textarea name="content" required></textarea>
          </label>
          <div>
            <button type="button" class="button" name="replace">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 9c0-1.811 1.533-4 4-4s4 2.128 4 4c0 2.9-4 2.745-4 6" /><circle cx="12" cy="20" r=".5" /></svg>
              <span>replace</span>
            </button>
            <button type="button" class="button" name="copy">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
              <span>copy</span>
            </button>
          </div>
        </div>
      </fieldset>
      <footer>
        <button type="submit" name="submit" class="button">submit</button>
        <button type="submit" name="delete" class="button" formnovalidate>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 9c0-1.811 1.533-4 4-4s4 2.128 4 4c0 2.9-4 2.745-4 6" /><circle cx="12" cy="20" r=".5" /></svg>
          <span>delete</span>
        </button>
      </footer>
    `;

    new Select(form.querySelector(".select"));

    const option = form.querySelector("[hidden]");

    for (const key in item) {
      if (key === "expires") {
        option.hidden = !(item.expires > 0);
      } else {
        form.elements[key].value = item[key];
      }
    }

    form.elements.copy.addEventListener("click", async e => {
      try {
        await navigator.clipboard.writeText(form.content.value);
        form.elements.copy.disabled = true;
        setTimeout(() => form.elements.copy.disabled = false, 2000);
      } catch (err) {
        console.error(err);
      }
    });

    form.elements.replace.addEventListener("click", async e => {
      if (form.elements.replace.value) {
        try {
          form.elements.content.select();
          document.execCommand("insertText", false, await navigator.clipboard.readText());
        } catch (err) {
          console.error(err);
        }
      } else {
        form.elements.replace.value = "confirm";
        setTimeout(() => form.elements.replace.value = "", 2000);
      }
    });

    form.elements.content.addEventListener("keydown", async e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        form.requestSubmit(form.elements.submit);
      }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (e.submitter.textContent === "submit") {
        const action = form.elements.key.value ? "更新" : "创建";
        const time = Date.now();
        form.dataset.notice = `正在${action}`;
        form.className = "disabled";
        form.elements.key.value ||= Math.floor(time / 1000);
        form.elements.updated.value = time;
        item = Object.fromEntries(new FormData(form));
        if (form.elements.expires.value) item.expires = +form.elements.expires.value;
        const resp = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        if (resp.status === 204) {
          DATA[item.key] = item;
          if (location.pathname === "/new") {
            history.pushState(null, "", "/" + item.key);
          }
          doc.head.innerHTML = render(item.updated, item.expires, location.pathname);
          form.elements.expires.change(0);
          form.dataset.notice = `${action}成功`;
          option.hidden = !(item.expires > 0);
          setTimeout(() => form.removeAttribute("class"), 1000);
        }
      } else {
        if (e.submitter.value) {
          form.dataset.notice = "正在删除";
          form.className = "disabled";
          const resp = await fetch("/api", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: form.key.value })
          });
          if (resp.status === 204) {
            delete DATA[key];
            item = { key: "", title: "", content: "", updated: "" };
            history.replaceState(null, "", "/new");
            doc.head.innerHTML = render(item.updated, item.expires, location.pathname);
            form.elements.expires.change(0);
            form.dataset.notice = "删除成功";
            form.reset();
            option.hidden = !(item.expires > 0);
            setTimeout(() => form.removeAttribute("class"), 1000);
          }

        } else {
          e.submitter.value = "confirm";
          setTimeout(() => e.submitter.value = "", 2000);
        }
      }
    });

    doc.main.replaceChild(form, doc.main.lastChild);

  } else {
    history.replaceState(null, "", "/");
    navigate();
  }
}

function render(updated, expires, path) {
  let exp = [];
  if (!expires) {
    exp = ["u0", "永久保存"];
  } else if (expires < 3600) {
    exp = ["u4", Math.floor(expires / 60) + " 分钟后过期"];
  } else if (expires < 86400) {
    exp = ["u3", Math.floor(expires / 3600) + " 小时后过期"];
  } else if (expires < 2592000) {
    exp = ["u2", Math.floor(expires / 86400) + " 天后过期"];
  } else {
    exp = ["u1", new Date(Date.now() + expires * 1000).toLocaleDateString("sv-se") + " 过期"];
  }

  return path
    ? `
      <h2><span>paste</span> <span>${path}</span></h2>
      <a href="/" class="button">back</a>
      <p>${updated
        ? `<span>最后更新 ${new Date(+updated).toLocaleString("sv-se")}</span> <span class="${exp[0]}">${exp[1]}</span>`
        : `创建条目`}</p>
    `
    : `<span>最后更新 ${new Date(+updated).toLocaleString("sv-se")}</span> <span class="${exp[0]}">${exp[1]}</span>`;
}
