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

// Runs inside Discord's splash window, which is plain HTML without React. Kept as a string so the bundler leaves it alone.
const RENDER_PROGRESS = `(text, progress) => {
    let root = document.getElementById("endercord-update");
    if (!root) {
        root = document.createElement("div");
        root.id = "endercord-update";
        root.style.cssText = "position:fixed;left:15%;right:15%;bottom:18px;z-index:99999;font:12px sans-serif;color:#ecebff;text-align:center";
        root.innerHTML = '<div></div><div style="margin-top:6px;height:4px;border-radius:2px;background:#151a33;overflow:hidden"><div id="endercord-update-bar" style="height:100%;width:0;background:linear-gradient(90deg,#b7a6e6,#e2b48f);transition:width .2s"></div></div>';
        document.body.appendChild(root);
    }
    root.firstChild.textContent = text;
    document.getElementById("endercord-update-bar").style.width = Math.round(progress * 100) + "%";
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
 * Downloads EnderCord updates while Discord's splash screen is up, shows a progress bar on it,
 * then restarts Discord on the new version before the main window ever loads the old one.
 */
export function initSplashUpdater() {
    const release = fetchJson<Release>(`https://api.github.com/repos/${gitRemote}/releases/latest`, { headers }).catch(() => null);
    let started = false;

    app.on("browser-window-created", (_, win) => {
        win.webContents.on("did-finish-load", async () => {
            if (started || !/splash/i.test(win.webContents.getURL())) return;
            started = true;

            const show = (text: string, progress: number) => {
                if (win.isDestroyed()) return;
                win.webContents.executeJavaScript(`(${RENDER_PROGRESS})(${JSON.stringify(text)}, ${progress})`).catch(err => console.error("[EnderCord] Failed to update the splash screen", err));
            };

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
