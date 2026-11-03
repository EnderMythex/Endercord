/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { app } from "electron";
import { appendFileSync, writeFileSync } from "original-fs";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { ASAR_FILE } from "./updater/common";
import { DATA_DIR } from "./utils/constants";
import { checkedFetch, fetchJson } from "./utils/http";

const headers = { "User-Agent": VENCORD_USER_AGENT };

// Discord's main process logs are hard to reach, so the splash steps also go to a small file in EnderCord's data folder.
const LOG_FILE = join(DATA_DIR, "endercord-main.log");
function log(...parts: unknown[]) {
    const line = `${new Date().toISOString()} ${parts.join(" ")}\n`;
    try {
        appendFileSync(LOG_FILE, line);
    } catch (err) {
        console.error("[EnderCord] Failed to write", LOG_FILE, err);
    }
}

interface Release {
    name: string;
    assets: { name: string; browser_download_url: string; }[];
}

// Runs inside Discord's splash window, which is plain HTML without React. Kept as strings so the bundler leaves them alone.
const SPLASH_CSS = `
#ec-splash {
    position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at center, #131416 0%, #060607 70%);
    font-family: -apple-system, "SF Pro Display", "Inter", "Segoe UI", sans-serif; color: #fff;
    opacity: 0; animation: ec-in 1s cubic-bezier(.2, .8, .2, 1) forwards; -webkit-app-region: drag;
}
#ec-splash canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#ec-splash .text { position: relative; text-align: center; }
#ec-splash .title {
    font-size: 11px; font-weight: 500; letter-spacing: .5em; margin-right: -.5em;
    animation: ec-track 1.8s cubic-bezier(.2, .8, .2, 1) forwards;
}
#ec-splash .status {
    margin-top: 10px; min-height: 11px; font-size: 8px; font-weight: 500; letter-spacing: .22em; margin-right: -.22em;
    text-transform: uppercase; color: #ffffff59; transition: opacity .4s;
}
#ec-progress {
    position: fixed; left: 50%; bottom: 30px; width: 140px; transform: translateX(-50%); z-index: 2147483647; text-align: center; white-space: nowrap;
    font: 500 8px -apple-system, "Segoe UI", sans-serif; letter-spacing: .3em; text-transform: uppercase; color: #ffffff80;
}
#ec-progress .label { margin-bottom: 9px; }
#ec-progress .track { height: 1px; background: #ffffff1f; border-radius: 1px; overflow: hidden; }
#ec-progress .fill { height: 100%; width: 0; background: #fff; box-shadow: 0 0 6px #fff; transition: width .3s cubic-bezier(.2, .8, .2, 1); }
@keyframes ec-in { to { opacity: 1; } }
@keyframes ec-track { from { letter-spacing: .15em; opacity: 0; } to { letter-spacing: .5em; opacity: 1; } }
`;

// The splash page's CSP can block inline styles, so all styling goes through webContents.insertCSS and these only add classes.
const APPLY_THEME = `() => {
    if (document.getElementById("ec-splash")) return;

    const root = document.createElement("div");
    root.id = "ec-splash";
    root.innerHTML = '<canvas></canvas><div class="text"><div class="title">ENDERCORD</div><div class="status"></div></div>';
    document.body.appendChild(root);

    // Mirror Discord's own status line ("Checking for updates...") in our style
    const status = root.querySelector(".status");
    const readStatus = () => {
        const texts = [...document.body.querySelectorAll("*")]
            .filter(el => !root.contains(el) && el.children.length === 0 && el.textContent.trim())
            .map(el => el.textContent.trim());
        const text = texts[texts.length - 1] || "";
        if (status.textContent !== text) status.textContent = text;
    };
    readStatus();
    new MutationObserver(readStatus).observe(document.body, { subtree: true, childList: true, characterData: true });

    // Particle ring: a crisp core line plus drifting dust, with a bright arc sweeping around it
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const particles = Array.from({ length: 1600 }, (_, i) => {
        const core = i % 3 === 0;
        const a = Math.random() * Math.PI * 2;
        const dust = .5 + .5 * Math.sin(a + 1.2);
        return {
            a, core,
            dr: core ? gauss() * 1.2 : Math.abs(gauss()) * (3 + 22 * dust) * (Math.random() < .5 ? -.6 : 1),
            size: core ? 1.1 : .5 + Math.random() * .8,
            speed: .7 + Math.random() * .6,
            phase: Math.random() * 6.28,
        };
    });
    const draw = t => {
        const dpr = devicePixelRatio || 1;
        const w = innerWidth, h = innerHeight;
        // Check both sides: Discord resizes the splash window after it loads, and a stale height stretches the ring
        const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
        if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3;
        const sweep = t * .0005;
        for (const p of particles) {
            const ang = p.a + t * .00012 * p.speed;
            const r = R + p.dr + Math.sin(t * .001 + p.phase) * (p.core ? .3 : 1.5);
            const light = Math.pow(.5 + .5 * Math.cos(ang - sweep), p.core ? 8 : 3);
            const fade = p.core ? 1 : Math.max(0, 1 - Math.abs(p.dr) / 26);
            const alpha = (p.core ? .06 + light : (.04 + .6 * light) * fade) * (.85 + .15 * Math.sin(t * .004 + p.phase));
            ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
            ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, p.size, p.size);
        }
        requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
}`;

const RENDER_PROGRESS = `(text, progress) => {
    let bar = document.getElementById("ec-progress");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "ec-progress";
        bar.innerHTML = '<div class="label"></div><div class="track"><div class="fill"></div></div>';
        (document.getElementById("ec-splash") || document.body).appendChild(bar);
    }
    bar.querySelector(".label").textContent = text + "  " + Math.round(progress * 100) + "%";
    bar.querySelector(".fill").style.width = Math.round(progress * 100) + "%";
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

    try {
        writeFileSync(LOG_FILE, "");
    } catch (err) {
        console.error("[EnderCord] Failed to reset", LOG_FILE, err);
    }
    log("initSplash theme:", theme, "update:", update);
    let windows = 0;

    app.on("browser-window-created", (_, win) => {
        const index = windows++;
        win.webContents.on("did-finish-load", async () => {
            const url = win.webContents.getURL();
            log("window", index, "loaded", url);
            // Discord opens its startup screen first, from a local file rather than discord.com
            if (started || !(/splash/i.test(url) || (index === 0 && !url.startsWith("http")))) return;
            started = true;

            const run = (code: string) => {
                if (win.isDestroyed()) return;
                win.webContents.executeJavaScript(code).then(() => log("splash script ran"), err => log("splash script failed:", err));
            };
            const show = (text: string, progress: number) => run(`(${RENDER_PROGRESS})(${JSON.stringify(text)}, ${progress})`);

            log("theming splash screen", url);
            win.webContents.insertCSS(SPLASH_CSS).then(() => log("splash css inserted"), err => log("insertCSS failed:", err));
            if (theme) {
                run(`(${APPLY_THEME})()`);
                // What is actually on screen, in case something still covers the theme
                setTimeout(() => {
                    if (win.isDestroyed()) return;
                    win.webContents.executeJavaScript(`(() => {
                        const el = document.getElementById("ec-splash");
                        const cs = el && getComputedStyle(el);
                        const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
                        return JSON.stringify({ exists: !!el, rect: el && el.getBoundingClientRect(), opacity: cs && cs.opacity, zIndex: cs && cs.zIndex, display: cs && cs.display, topElement: top && top.outerHTML.slice(0, 160) });
                    })()`).then(info => log("splash state", info), err => log("splash state failed:", err));
                }, 1500);
            }

            try {
                const data = await release;
                log("running", gitHash, "latest release", data?.name ?? "none");
                if (!data) return;
                const asset = data.assets.find(a => a.name === ASAR_FILE);
                if (data.name.slice(data.name.lastIndexOf(" ") + 1) === gitHash || !asset) return;

                show("Updating", 0);
                const asar = await download(asset.browser_download_url, p => show("Updating", p));

                // Once the main window is up it reads from the asar, so leave it to the in app updater.
                if (win.isDestroyed()) return;

                writeFileSync(__dirname, asar, { flush: true });
                show("Restarting", 1);
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
