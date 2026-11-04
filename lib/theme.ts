export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "x-farm-theme";

// Runs before the page paints so a saved dark theme never flashes light first.
// Without a saved choice, it follows the device setting.
export const themeInitScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t})()`;
