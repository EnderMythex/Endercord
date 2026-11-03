/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as Components from "@components/index";
import * as Util from "@utils/index";
import { Logger } from "@utils/Logger";
import definePlugin, { Plugin } from "@utils/types";
import * as Webpack from "@webpack";
import * as Common from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

import * as Api from "./index";

/** Folder name prefix that marks plugins loaded from the plugins folder at runtime. */
export const RUNTIME_PREFIX = "plugins/";

export const runtimePluginErrors: { file: string; error: string; }[] = [];

function isPlugin(v: unknown): v is Plugin {
    return typeof v === "object" && v !== null
        && typeof (v as Record<string, unknown>).name === "string"
        && typeof (v as Record<string, unknown>).description === "string";
}

/**
 * Loads plain JS plugins from the plugins folder in the data directory, so plugins work without
 * rebuilding EnderCord. Runs before the plugin manager starts, which lets these plugins use patches too.
 */
export function loadRuntimePlugins() {
    const logger = new Logger("RuntimePlugins", "#b7a6e6");
    const EnderCord = { Api, Components, Util, Webpack, Common };

    for (const { file, code } of VencordNative.runtimePlugins.get()) {
        try {
            const module: { exports: unknown; } = { exports: {} };
            const factory = new Function("module", "exports", "definePlugin", "EnderCord", `${code}\n//# sourceURL=endercord-plugins/${file}`);
            factory(module, module.exports, definePlugin, EnderCord);

            const { exports } = module;
            const plugin = isPlugin(exports) ? exports : (exports as { default?: unknown; } | null)?.default;
            if (!isPlugin(plugin)) throw "It must set module.exports = definePlugin({ name, description, ... }).";
            if (plugin.name in Plugins) throw `A plugin named ${plugin.name} already exists.`;

            plugin.authors ??= [];
            Plugins[plugin.name] = plugin;
            PluginMeta[plugin.name] = { folderName: RUNTIME_PREFIX + file, userPlugin: true };
            logger.info(`Loaded ${plugin.name} from ${file}`);
        } catch (err) {
            logger.error(`Failed to load ${file}`, err);
            runtimePluginErrors.push({ file, error: String(err) });
        }
    }
}
