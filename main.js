(() => {
  "use strict";
  const languageButton = document.querySelector(".language-toggle");
  const resumeLinks = document.querySelectorAll("[data-resume-link]");
  const resumeFiles = {
    en: "assets/chenxi-ma-resume-en.pdf",
    zh: "assets/chenxi-ma-resume-zh.pdf",
  };
  const translations = [...document.querySelectorAll("[data-zh]")].map(node => ({
    node, en: node.textContent, zh: node.dataset.zh,
  }));
  const translatedAttributes = [
    ["[data-zh-label]", "aria-label", "zhLabel"],
    ["[data-zh-alt]", "alt", "zhAlt"],
    ["[data-zh-title]", "title", "zhTitle"],
    ["[data-zh-content]", "content", "zhContent"],
  ].flatMap(([selector, attribute, key]) => [...document.querySelectorAll(selector)].map(node => ({
    node, attribute, en: node.getAttribute(attribute), zh: node.dataset[key],
  })));
  let language = "en";
  let savedLanguage;
  try { savedLanguage = localStorage.getItem("mcx-home-language"); } catch { /* Storage is optional. */ }
  function applyLanguage(nextLanguage) {
    language = nextLanguage === "zh" ? "zh" : "en";
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    translations.forEach(item => { item.node.textContent = item[language]; });
    translatedAttributes.forEach(item => {
      if (item.node.hasAttribute(item.attribute)) item.node.setAttribute(item.attribute, item[language]);
    });
    resumeLinks.forEach(link => { link.href = resumeFiles[language]; });
    languageButton.textContent = language === "en" ? "中文" : "English";
    languageButton.lang = language === "en" ? "zh-CN" : "en";
    languageButton.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "切换至英文");
  }
  applyLanguage(savedLanguage);
  languageButton.hidden = false;
  languageButton.addEventListener("click", () => {
    applyLanguage(language === "en" ? "zh" : "en");
    try { localStorage.setItem("mcx-home-language", language); } catch { /* Storage is optional. */ }
  });
  function configuredUrl(value) {
    try {
      const configured = value?.trim();
      if (!configured) return;
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch { /* Keep an unconfigured link unavailable. */ }
  }
  const blogUrl = configuredUrl(window.HOME_CONFIG?.blogUrl);
  if (blogUrl) {
    document.querySelectorAll("[data-blog-link]").forEach(link => {
      link.href = blogUrl;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("title");
      link.removeAttribute("role");
    });
  }
  document.querySelectorAll("[data-profile-link]").forEach(link => {
    const url = configuredUrl(window.HOME_CONFIG?.[`${link.dataset.profileLink}Url`]);
    if (!url) return;
    link.href = url;
    link.removeAttribute("aria-disabled");
    link.removeAttribute("title");
    link.removeAttribute("role");
  });
  const portrait = document.querySelector(".portrait");
  if (portrait) {
    portrait.addEventListener("error", () => { portrait.hidden = true; });
    if (portrait.complete && portrait.naturalWidth === 0) portrait.hidden = true;
  }
  document.querySelector("#year").textContent = String(new Date().getFullYear());
})();
