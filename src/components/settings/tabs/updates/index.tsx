/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { wrapTab } from "@components/settings/tabs/BaseTab";
import ChangelogTab from "@components/settings/tabs/changelog";
import UpdaterTab from "@components/settings/tabs/updater";
import { TabBar, useState } from "@webpack/common";

function UpdatesTab() {
    const [tab, setTab] = useState(UpdaterTab ? "updater" : "changelog");

    return (
        <>
            <TabBar type="top" look="brand" className="vc-settings-tab-bar" selectedItem={tab} onItemSelect={setTab}>
                {UpdaterTab && <TabBar.Item className="vc-settings-tab-bar-item" id="updater">Updater</TabBar.Item>}
                <TabBar.Item className="vc-settings-tab-bar-item" id="changelog">Changelog</TabBar.Item>
            </TabBar>
            {tab === "updater" && UpdaterTab ? <UpdaterTab /> : <ChangelogTab />}
        </>
    );
}

export default wrapTab(UpdatesTab, "Updates");
