/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { app } from "electron";
import { writeFileSync } from "original-fs";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { ASAR_FILE } from "./updater/common";
import { checkedFetch, fetchJson } from "./utils/http";

const headers = { "User-Agent": VENCORD_USER_AGENT };

interface Release {
    name: string;
    assets: { name: string; browser_download_url: string; }[];
}

// Runs inside Discord's splash window, which is plain HTML without React. Kept as strings so the bundler leaves them alone.
const SPLASH_CSS = `
html {
    background:
        radial-gradient(1px 1px at 20% 30%, #fff8, transparent),
        radial-gradient(1px 1px at 70% 15%, #fff6, transparent),
        radial-gradient(1px 1px at 85% 60%, #fff5, transparent),
        radial-gradient(1px 1px at 35% 80%, #fff4, transparent),
        radial-gradient(1.5px 1.5px at 55% 45%, #fff3, transparent),
        radial-gradient(ellipse at 30% 10%, #2e3a6e, #151a33 45%, #07080f 85%) !important;
}
body { background: transparent !important; color: #ecebff !important; }
#ec-bh { position: fixed; width: var(--s); height: var(--s); transform: translate(-50%, -50%); pointer-events: none; z-index: 9; }
#ec-bh .core {
    position: absolute; inset: 24%; border-radius: 50%; background: #000; z-index: 2;
    box-shadow: 0 0 0 1.5px #c8bdf0d0, 0 0 calc(var(--s) * .14) calc(var(--s) * .05) #b7a6e699, 0 0 calc(var(--s) * .4) calc(var(--s) * .12) #5b5fb055;
    animation: ec-pulse 2.6s ease-in-out infinite;
}
#ec-bh .ring { position: absolute; inset: 0 -45%; transform: rotate(-14deg); }
#ec-bh .ring > div {
    position: absolute; left: 6%; right: 6%; top: 40%; height: 20%; border-radius: 50%;
    border: calc(var(--s) * .035) solid; filter: drop-shadow(0 0 3px #e2b48f99);
    animation: ec-spin 1.6s linear infinite;
}
#ec-bh .back { clip-path: inset(0 0 50% 0); opacity: .65; z-index: 1; }
#ec-bh .front { clip-path: inset(50% 0 0 0); z-index: 3; }
@keyframes ec-pulse {
    50% { box-shadow: 0 0 0 1.5px #e0d8ff, 0 0 calc(var(--s) * .2) calc(var(--s) * .07) #b7a6e6bb, 0 0 calc(var(--s) * .5) calc(var(--s) * .16) #5b5fb077; }
}
@keyframes ec-spin {
    0%, 100% { border-color: #c9c3e8 #e2b48f #f1c39c #f4f4fb; }
    25% { border-color: #f4f4fb #c9c3e8 #e2b48f #f1c39c; }
    50% { border-color: #f1c39c #f4f4fb #c9c3e8 #e2b48f; }
    75% { border-color: #e2b48f #f1c39c #f4f4fb #c9c3e8; }
}
#ec-brand { position: fixed; bottom: 10px; left: 0; right: 0; text-align: center; font: 600 9px sans-serif; letter-spacing: .3em; color: #b7a6e6; opacity: .55; z-index: 9; }
#ec-update { position: fixed; left: 16%; right: 16%; bottom: 30px; z-index: 9; font: 600 10px sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #ecebff; }
#ec-update .label { display: flex; justify-content: space-between; margin-bottom: 6px; }
#ec-update .track { height: 3px; border-radius: 3px; background: #ffffff1a; overflow: hidden; }
#ec-update .fill { height: 100%; width: 0; border-radius: 3px; background: linear-gradient(90deg, #b7a6e6, #e2b48f); box-shadow: 0 0 8px #e2b48f; transition: width .2s; }
`;

const APPLY_THEME = `(css) => {
    if (document.getElementById("ec-style")) return;
    const style = document.createElement("style");
    style.id = "ec-style";
    style.textContent = css;
    document.head.appendChild(style);

    const area = el => { const r = el.getBoundingClientRect(); return r.width * r.height; };
    const full = innerWidth * innerHeight * .8;
    for (const el of document.body.querySelectorAll("*"))
        if (area(el) >= full && getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)") el.style.background = "transparent";

    const logo = [...document.querySelectorAll("video, img, canvas, svg")].filter(el => area(el) > 0).sort((a, b) => area(b) - area(a))[0];
    const hole = document.createElement("div");
    hole.id = "ec-bh";
    hole.innerHTML = '<div class="ring back"><div></div></div><div class="core"></div><div class="ring front"><div></div></div>';
    document.body.appendChild(hole);
    const place = () => {
        const r = logo && logo.getBoundingClientRect();
        const size = r && r.width ? Math.max(r.width, r.height) * .9 : 110;
        hole.style.setProperty("--s", size + "px");
        hole.style.left = (r && r.width ? r.left + r.width / 2 : innerWidth / 2) + "px";
        hole.style.top = (r && r.width ? r.top + r.height / 2 : innerHeight * .4) + "px";
    };
    if (logo) logo.style.opacity = "0";
    place();
    addEventListener("resize", place);

    const brand = document.createElement("div");
    brand.id = "ec-brand";
    brand.textContent = "ENDERCORD";
    document.body.appendChild(brand);
}`;

const RENDER_PROGRESS = `(text, progress) => {
    let root = document.getElementById("ec-update");
    if (!root) {
        root = document.createElement("div");
        root.id = "ec-update";
        root.innerHTML = '<div class="label"><span></span><span></span></div><div class="track"><div class="fill"></div></div>';
        document.body.appendChild(root);
    }
    const [label, percent] = root.querySelectorAll(".label span");
    label.textContent = text;
    percent.textContent = Math.round(progress * 100) + "%";
    root.querySelector(".fill").style.width = Math.round(progress * 100) + "%";
}`;

async function download(url: string, onProgress: (progress: number) => void) {
    const res = await checkedFetch(url, { headers });
    if (!res.body) throw new Error("Empty response");

    const total = Number(res.headers.get("content-length")) || 0;
    const chunks: Uint8Array[] = [];
    let received = 0;

    const reader = res.body.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
        chunks.push(r.value);
        received += r.value.length;
        if (total) onProgress(received / total);
    }
    return Buffer.concat(chunks);
}

/**
 * Themes Discord's splash screen, and when `update` is set, downloads EnderCord updates while it's up with a progress
 * bar on it, then restarts Discord on the new version before the main window ever loads the old one.
 */
export function initSplash(theme: boolean, update: boolean) {
    if (!theme && !update) return;

    const release = update
        ? fetchJson<Release>(`https://api.github.com/repos/${gitRemote}/releases/latest`, { headers }).catch(() => null)
        : Promise.resolve(null);
    let started = false;

    app.on("browser-window-created", (_, win) => {
        win.webContents.on("did-finish-load", async () => {
            if (started || !/splash/i.test(win.webContents.getURL())) return;
            started = true;

            const run = (code: string) => {
                if (win.isDestroyed()) return;
                win.webContents.executeJavaScript(code).catch(err => console.error("[EnderCord] Failed to update the splash screen", err));
            };
            const show = (text: string, progress: number) => run(`(${RENDER_PROGRESS})(${JSON.stringify(text)}, ${progress})`);

            if (theme) run(`(${APPLY_THEME})(${JSON.stringify(SPLASH_CSS)})`);

            try {
                const data = await release;
                if (!data) return;
                const asset = data.assets.find(a => a.name === ASAR_FILE);
                if (data.name.slice(data.name.lastIndexOf(" ") + 1) === gitHash || !asset) return;

                show("Updating EnderCord...", 0);
                const asar = await download(asset.browser_download_url, p => show("Updating EnderCord...", p));

                // Once the main window is up it reads from the asar, so leave it to the in app updater.
                if (win.isDestroyed()) return;

                writeFileSync(__dirname, asar, { flush: true });
                show("EnderCord updated, restarting...", 1);
                // Quit gracefully: Discord only saves your login token back when its window closes normally,
                // so a hard exit here would log you out.
                setTimeout(() => {
                    app.relaunch();
                    app.quit();
                }, 800);
            } catch (err) {
                console.error("[EnderCord] Splash update failed", err);
            }
        });
    });
}
