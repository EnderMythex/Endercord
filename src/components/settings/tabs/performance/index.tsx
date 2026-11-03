/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { isPluginEnabled, pluginRequiresRestart } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { getUserSetting } from "@api/UserSettings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { useAwaiter, useForceUpdater } from "@utils/react";
import { showToast, useEffect, useState } from "@webpack/common";

import Plugins from "~plugins";

const cl = classNameFactory("vc-perf-");

const BACKUP_KEY = "EnderCord_lightModeBackup";

/** Discord settings that cost memory or CPU, with the value Light Mode sets. */
const LIGHT_SETTINGS = [
    { group: "textAndImages", name: "animateEmoji", value: false, label: "Animated emojis" },
    { group: "textAndImages", name: "gifAutoPlay", value: false, label: "GIF autoplay" },
    { group: "textAndImages", name: "animateStickers", value: 2, label: "Animated stickers" },
    { group: "voiceAndVideo", name: "disableStreamPreviews", value: true, label: "Stream previews" },
] as const;

type Metric = Awaited<ReturnType<typeof VencordNative.native.getProcessMetrics>>[number];

const mb = (kb: number) => `${Math.round(kb / 1024)} MB`;

function MemoryMeter() {
    const [metrics, setMetrics] = useState<Metric[]>([]);

    useEffect(() => {
        const refresh = () => VencordNative.native.getProcessMetrics().then(setMetrics);
        refresh();
        const id = setInterval(refresh, 2000);
        return () => clearInterval(id);
    }, []);

    if (!metrics.length) return <Paragraph className={Margins.bottom20}>Memory usage is only available in the desktop app.</Paragraph>;

    const total = metrics.reduce((sum, m) => sum + m.memoryKb, 0);
    const sorted = [...metrics].sort((a, b) => b.memoryKb - a.memoryKb);

    return (
        <div className={Margins.bottom20}>
            <div className={cl("total")}>{mb(total)}</div>
            <Paragraph color="text-subtle" className={Margins.bottom8}>Total used by Discord right now, across {metrics.length} processes.</Paragraph>
            {sorted.map(m => (
                <div key={m.pid} className={cl("row")}>
                    <span className={cl("name")}>{m.name}</span>
                    <div className={cl("bar")}>
                        <div className={cl("fill")} style={{ width: `${(m.memoryKb / sorted[0].memoryKb) * 100}%` }} />
                    </div>
                    <span className={cl("value")}>{mb(m.memoryKb)}</span>
                    <span className={cl("cpu")}>{m.cpu.toFixed(1)}% CPU</span>
                </div>
            ))}
        </div>
    );
}

function LightMode() {
    const [backup, , loading] = useAwaiter(() => DataStore.get<Record<string, unknown>>(BACKUP_KEY), { fallbackValue: undefined });
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const on = enabled ?? backup != null;

    async function toggle() {
        if (on) {
            const saved = await DataStore.get<Record<string, unknown>>(BACKUP_KEY) ?? {};
            for (const { group, name } of LIGHT_SETTINGS) {
                const key = `${group}.${name}`;
                if (key in saved) await getUserSetting(group, name)?.updateSetting(saved[key]);
            }
            await DataStore.del(BACKUP_KEY);
            setEnabled(false);
            showToast({ text: "Light Mode is off, your previous settings are back.", variant: "success" });
            return;
        }

        const saved: Record<string, unknown> = {};
        for (const { group, name, value } of LIGHT_SETTINGS) {
            const setting = getUserSetting(group, name);
            if (!setting) continue;
            saved[`${group}.${name}`] = setting.getSetting();
            await setting.updateSetting(value);
        }
        await DataStore.set(BACKUP_KEY, saved);
        setEnabled(true);
        showToast({ text: "Light Mode is on.", variant: "success" });
    }

    return (
        <div className={Margins.bottom20}>
            <Paragraph className={Margins.bottom8}>
                Turns off {LIGHT_SETTINGS.map(s => s.label.toLowerCase()).join(", ")}. Turning it off again restores what you had before.
            </Paragraph>
            <Button disabled={loading} variant={on ? "secondary" : "primary"} onClick={toggle}>
                {on ? "Turn Off Light Mode" : "Turn On Light Mode"}
            </Button>
            <Paragraph color="text-subtle" className={Margins.top8}>
                Also worth trying in Discord's own settings: turn off Clips (its recording buffer stays in memory), Hardware Acceleration
                (lighter GPU process, but less smooth scrolling) and Krisp noise suppression, and turn on Reduced Motion.
            </Paragraph>
        </div>
    );
}

function HeavyPlugins() {
    const forceUpdate = useForceUpdater();
    const plugins = Object.values(Plugins)
        .filter(p => isPluginEnabled(p.name) && !p.required && !p.isDependency && p.patches?.length)
        .sort((a, b) => (b.patches?.length ?? 0) - (a.patches?.length ?? 0));
    const totalPatches = plugins.reduce((sum, p) => sum + (p.patches?.length ?? 0), 0);

    function disable(name: string, needsRestart: boolean) {
        Settings.plugins[name].enabled = false;
        forceUpdate();
        showToast({ text: needsRestart ? `${name} is off. Restart Discord to free its memory.` : `${name} is off.` });
    }

    return (
        <>
            <Paragraph className={Margins.bottom8}>
                {plugins.length} enabled plugins change Discord's code with {totalPatches} patches. Each patched part of Discord stays in memory
                twice, so turning off plugins you don't use helps.
            </Paragraph>
            {plugins.map(p => (
                <div key={p.name} className={cl("row")}>
                    <span className={cl("name")}>{p.name}</span>
                    <span className={cl("value")}>{p.patches?.length} patches</span>
                    <Button size="small" variant="secondary" onClick={() => disable(p.name, pluginRequiresRestart(p))}>Turn Off</Button>
                </div>
            ))}
        </>
    );
}

function PerformanceTab() {
    return (
        <SettingsTab>
            <Heading className={Margins.bottom8}>Memory</Heading>
            <MemoryMeter />
            <Divider className={Margins.bottom20} />

            <Heading className={Margins.bottom8}>Light Mode</Heading>
            <LightMode />
            <Divider className={Margins.bottom20} />

            <Heading className={Margins.bottom8}>Hibernation & Engine</Heading>
            <Paragraph className={Margins.bottom8}>
                Hibernation frees memory once Discord has been in the background for a while, never during a voice call. Light keeps
                notifications and calls: it leaves the open channel to free its images and videos, then brings you back when you open
                Discord. Full unloads Discord completely and frees the most, but you get no notifications until you open it again.
            </Paragraph>
            <Paragraph className={Margins.bottom8}>
                Optimize for size makes the JavaScript engine favor memory over speed. Both need a restart.
            </Paragraph>
            <Button className={Margins.bottom20} onClick={() => openPluginModal(Plugins.Settings)}>Open Hibernation Settings</Button>
            <Divider className={Margins.bottom20} />

            <Heading className={Margins.bottom8}>Plugins With The Most Patches</Heading>
            <HeavyPlugins />
        </SettingsTab>
    );
}

export default wrapTab(PerformanceTab, "Performance");
