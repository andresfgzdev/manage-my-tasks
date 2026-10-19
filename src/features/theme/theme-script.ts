// No "use client": the root layout (a server component) inlines the script itself.

export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint: the server always renders dark, and a
 * stored "light" is applied here so the page never flashes the wrong theme.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;
