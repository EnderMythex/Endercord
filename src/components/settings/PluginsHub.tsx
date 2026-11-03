/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./PluginsHub.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { PluginsIcon } from "@components/Icons";
import PluginsTab from "@components/settings/tabs/plugins";
import UserPluginsTab from "@components/settings/tabs/userPlugins";
import { classNameFactory } from "@utils/css";
import { Clickable, Modal, openModal, TabBar, useState } from "@webpack/common";

const cl = classNameFactory("vc-plugins-hub-");

function PluginsHub() {
    const [tab, setTab] = useState("all");

    return (
        <div className={cl("content")}>
            <TabBar type="top" look="brand" className="vc-settings-tab-bar" selectedItem={tab} onItemSelect={setTab}>
                <TabBar.Item className="vc-settings-tab-bar-item" id="all">All Plugins</TabBar.Item>
                <TabBar.Item className="vc-settings-tab-bar-item" id="mine">My Plugins</TabBar.Item>
            </TabBar>
            {tab === "all" ? <PluginsTab /> : <UserPluginsTab />}
        </div>
    );
}

export function openPluginsHub() {
    openModal(props => (
        <Modal {...props} size="xl" title="Plugins">
            <PluginsHub />
        </Modal>
    ));
}

/** Sits in the list above your DMs, next to Friends, Shop and Quests. */
export const PluginsNavButton = ErrorBoundary.wrap(function PluginsNavButton() {
    return (
        <Clickable className={cl("nav")} onClick={openPluginsHub}>
            <PluginsIcon width={20} height={20} />
            <span>Plugins</span>
        </Clickable>
    );
}, { noop: true });
