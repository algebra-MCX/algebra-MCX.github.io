(() => {
  "use strict";
  const languageButton = document.querySelector(".language-toggle");
  const translations = [...document.querySelectorAll("[data-zh]")].map(node => ({
    node, en: node.textContent, zh: node.dataset.zh,
  }));
  const translatedAttributes = [
    ["[data-zh-label]", "aria-label", "zhLabel"],
    ["[data-zh-alt]", "alt", "zhAlt"],
    ["[data-zh-title]", "title", "zhTitle"],
    ["[data-zh-content]", "content", "zhContent"],
    ["[data-zh-href]", "href", "zhHref"],
  ].flatMap(([selector, attribute, key]) => [...document.querySelectorAll(selector)].map(node => ({
    node, attribute, en: node.getAttribute(attribute), zh: node.dataset[key],
  })));
  let language = "en";
  function applyLanguage(nextLanguage) {
    language = nextLanguage === "zh" ? "zh" : "en";
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    translations.forEach(item => { item.node.textContent = item[language]; });
    translatedAttributes.forEach(item => {
      if (item.node.hasAttribute(item.attribute)) item.node.setAttribute(item.attribute, item[language]);
    });
    document.querySelectorAll("[data-blog-link][href], [data-learning-link][href]").forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set("lang", language);
      link.href = url.href;
    });
    languageButton.textContent = language === "en" ? "中文" : "English";
    languageButton.lang = language === "en" ? "zh-CN" : "en";
    languageButton.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "切换至英文");
  }
  applyLanguage(new URLSearchParams(location.search).get("lang"));
  languageButton.hidden = false;
  languageButton.addEventListener("click", () => {
    applyLanguage(language === "en" ? "zh" : "en");
  });
  function configuredUrl(value) {
    try {
      const configured = value?.trim();
      if (!configured) return;
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch { /* Keep an unconfigured link unavailable. */ }
  }
  for (const [selector, value] of [
    ["[data-blog-link]", window.HOME_CONFIG?.blogUrl],
    ["[data-learning-link]", window.HOME_CONFIG?.learningUrl],
  ]) {
    const url = configuredUrl(value);
    if (!url) continue;
    document.querySelectorAll(selector).forEach(link => {
      link.href = link.dataset.blogPath ? new URL(link.dataset.blogPath, url).href : url;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("title");
      link.removeAttribute("role");
    });
  }
  applyLanguage(language);
  document.querySelectorAll("[data-profile-link]").forEach(link => {
    const url = configuredUrl(window.HOME_CONFIG?.[`${link.dataset.profileLink}Url`]);
    if (!url) return;
    link.href = url;
    link.removeAttribute("aria-disabled");
    link.removeAttribute("title");
    link.removeAttribute("role");
  });
  const contributionLinks = [...document.querySelectorAll(".contribution-nav a")];
  function updateContributionNavigation() {
    const selected = contributionLinks.find(link => link.hash === location.hash) ?? contributionLinks[0];
    contributionLinks.forEach(link => {
      const active = link === selected;
      const group = document.getElementById(link.hash.slice(1))?.closest(".contribution-group");
      if (group) group.hidden = !active;
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  contributionLinks.forEach(link => {
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (link.hash === location.hash) return;
      history.pushState(null, "", link.hash);
      // Update both navigation bars without triggering a scroll to the old anchor.
      window.dispatchEvent(new Event("hashchange"));
    });
  });
  updateContributionNavigation();
  window.addEventListener("hashchange", updateContributionNavigation);

  const portrait = document.querySelector(".portrait");
  if (portrait) {
    portrait.addEventListener("error", () => { portrait.hidden = true; });
    if (portrait.complete && portrait.naturalWidth === 0) portrait.hidden = true;
  }
  document.querySelector("#year").textContent = String(new Date().getFullYear());
})();
