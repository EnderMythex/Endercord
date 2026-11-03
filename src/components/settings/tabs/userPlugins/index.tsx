/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RUNTIME_PREFIX, runtimePluginErrors } from "@api/RuntimePlugins";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { IpcRes, Plugin } from "@utils/types";
import { showToast, TextInput, useState } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

function errorText(res: IpcRes) {
    return res.ok ? "" : typeof res.error === "string" ? res.error : String(res.error?.message ?? res.error);
}

function CreateRow({ create, hint }: { create(name: string): Promise<IpcRes<void>>; hint: string; }) {
    const [name, setName] = useState("");

    async function onCreate() {
        const res = await create(name);
        if (!res.ok) return showToast({ text: errorText(res), variant: "critical" });

        setName("");
        showToast({ text: `${name} was created. ${hint}`, variant: "success" });
    }

    return (
        <Flex className={Margins.bottom20} gap="0.5em">
            <div className="vc-userplugins-input">
                <TextInput placeholder="MyCoolPlugin" value={name} onChange={setName} />
            </div>
            <Button disabled={!name} onClick={onCreate}>Create</Button>
        </Flex>
    );
}

function PluginList({ plugins, empty }: { plugins: Plugin[]; empty: string; }) {
    if (!plugins.length) return <Paragraph className={Margins.bottom20}>{empty}</Paragraph>;

    return (
        <div className={classes("vc-plugins-grid", Margins.bottom20)}>
            {plugins.map(p => (
                <PluginCard key={p.name} plugin={p} disabled={false} onRestartNeeded={() => showToast({ text: "Reload Discord to apply this change." })} />
            ))}
        </div>
    );
}

function UserPluginsTab() {
    const [building, setBuilding] = useState(false);
    const all = Object.values(Plugins).filter(p => PluginMeta[p.name].userPlugin);
    const runtime = all.filter(p => PluginMeta[p.name].folderName.startsWith(RUNTIME_PREFIX));
    const compiled = all.filter(p => !runtime.includes(p));

    async function build() {
        setBuilding(true);
        const res = await VencordNative.userPlugins.build();
        setBuilding(false);
        if (!res.ok) return showToast({ text: errorText(res), variant: "critical" });

        relaunch();
    }

    return (
        <SettingsTab>
            <Heading className={Margins.bottom8}>Quick Plugins</Heading>
            <Paragraph className={Margins.bottom16}>
                Plain JavaScript files in your plugins folder load when Discord starts, no rebuild needed. This works with
                the installer too. Create one below, edit it in any text editor, then reload Discord to see your changes.
            </Paragraph>

            <Flex className={Margins.bottom16} gap="0.5em">
                <Button variant="secondary" onClick={() => VencordNative.runtimePlugins.openFolder()}>
                    Open Plugins Folder
                </Button>
                <Button onClick={() => location.reload()}>Reload Discord</Button>
            </Flex>

            <CreateRow create={VencordNative.runtimePlugins.create} hint="Reload Discord to load it." />

            {runtimePluginErrors.map(({ file, error }) => (
                <ErrorCard key={file} className={Margins.bottom16}>
                    <Paragraph>{file} failed to load: {error}</Paragraph>
                </ErrorCard>
            ))}

            <PluginList plugins={runtime} empty="No quick plugins yet. Create one above, then reload Discord." />

            <Divider className={Margins.bottom20} />

            <Heading className={Margins.bottom8}>Compiled Plugins</Heading>
            {IS_STANDALONE
                ? (
                    <>
                        <Paragraph className={Margins.bottom16}>
                            TypeScript plugins in <code>src/userplugins</code> get compiled together with EnderCord, which needs the
                            source version. Quick plugins above can do almost everything, so you only need this for big plugins.
                        </Paragraph>
                        <Button variant="secondary" onClick={() => VencordNative.native.openExternal("https://github.com/EnderMythex/Endercord#installing-the-endercord-devbuild")}>
                            Get the Source Version
                        </Button>
                    </>
                )
                : (
                    <>
                        <Paragraph className={Margins.bottom16}>
                            TypeScript plugins in <code>src/userplugins</code> are built together with EnderCord. Edit their{" "}
                            <code>index.tsx</code>, then rebuild and restart to see your changes.
                        </Paragraph>
                        <Flex className={Margins.bottom16} gap="0.5em">
                            <Button variant="secondary" onClick={() => VencordNative.userPlugins.openFolder()}>
                                Open Source Folder
                            </Button>
                            <Button disabled={building} onClick={build}>
                                {building ? "Building..." : "Rebuild and Restart"}
                            </Button>
                        </Flex>
                        <CreateRow create={VencordNative.userPlugins.create} hint="Rebuild to load it." />
                        <PluginList plugins={compiled} empty="No compiled plugins yet." />
                    </>
                )
            }
        </SettingsTab>
    );
}

export default wrapTab(UserPluginsTab, "My Plugins");
