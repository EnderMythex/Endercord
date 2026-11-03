/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain, IpcMainInvokeEvent, shell } from "electron";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";

import { serializeErrors } from "./updater/common";
import { DATA_DIR } from "./utils/constants";

export const RUNTIME_PLUGINS_DIR = join(DATA_DIR, "plugins");

const template = (name: string) => `// ${name}, an EnderCord plugin. Edit this file, then press Ctrl+R in Discord to reload it.
//
// You get two globals:
//   definePlugin(...)     wraps your plugin, like in the EnderCord source
//   EnderCord.Api         settings, commands, notifications, context menus...
//   EnderCord.Common      Discord's React, stores and components (use them inside functions)
//   EnderCord.Webpack     find Discord modules (findByProps, findByCode...)
//   EnderCord.Util        helpers like sleep, Logger, classNameFactory
//   EnderCord.Components  EnderCord's own React components

module.exports = definePlugin({
    name: "${name}",
    description: "My own EnderCord plugin.",
    authors: [{ name: "Me", id: 0n }],

    commands: [{
        name: "${name.toLowerCase()}",
        description: "Shows that ${name} works.",
        execute: (_, ctx) => {
            EnderCord.Api.Commands.sendBotMessage(ctx.channel.id, { content: "Hello from ${name}!" });
        }
    }],

    start() {
        EnderCord.Common.showToast({ text: "${name} started!", variant: "success" });
    },

    stop() { }
});
`;

ipcMain.on(IpcEvents.GET_RUNTIME_PLUGINS, e => {
    mkdirSync(RUNTIME_PLUGINS_DIR, { recursive: true });
    e.returnValue = readdirSync(RUNTIME_PLUGINS_DIR)
        .filter(f => f.endsWith(".js"))
        .map(file => ({ file, code: readFileSync(join(RUNTIME_PLUGINS_DIR, file), "utf-8") }));
});

ipcMain.handle(IpcEvents.OPEN_RUNTIME_PLUGINS_FOLDER, () => shell.openPath(RUNTIME_PLUGINS_DIR));

ipcMain.handle(IpcEvents.CREATE_RUNTIME_PLUGIN, serializeErrors(async (_: IpcMainInvokeEvent, name: unknown) => {
    if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9]{1,63}$/.test(name))
        throw "Plugin names must start with a letter and only contain letters and numbers.";

    const file = join(RUNTIME_PLUGINS_DIR, `${name}.js`);
    if (existsSync(file)) throw `A plugin named ${name} already exists.`;

    mkdirSync(RUNTIME_PLUGINS_DIR, { recursive: true });
    await writeFile(file, template(name));
    shell.showItemInFolder(file);
}));
