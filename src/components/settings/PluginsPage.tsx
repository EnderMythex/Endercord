/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./PluginsPage.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { PluginsIcon } from "@components/Icons";
import { addonTabs } from "@components/settings/tabs/addons";
import { classNameFactory } from "@utils/css";
import { ScrollerThin, TabBar, useState } from "@webpack/common";
import type { ComponentType, ReactNode } from "react";

const cl = classNameFactory("vc-plugins-page-");

export const PLUGINS_ROUTE = "/endercord-plugins";

const ICON_SIZES: Record<string, number> = { xs: 12, sm: 16, md: 24, lg: 32 };

/** Plugins icon taking Discord's icon props, for its nav rows and title bar. */
export function NavIcon({ size, className }: { size?: string; className?: string; }) {
    const px = ICON_SIZES[size ?? ""] ?? 20;
    return <PluginsIcon className={className} width={px} height={px} />;
}

interface LinkButtonProps {
    selected: boolean;
    route: string;
    icon: ComponentType<{ size?: string; className?: string; }>;
    text: ReactNode;
}

// Discord's own row component (Friends, Shop, Quests), grabbed by a patch when the Friends row renders.
let LinkButton: ComponentType<LinkButtonProps> | null = null;

export function setLinkButton(component: ComponentType<LinkButtonProps>) {
    LinkButton = component;
    return component;
}

/** Sits under Quests in the list above your DMs. */
export const PluginsNavButton = ErrorBoundary.wrap(function PluginsNavButton({ path }: { path: string; }) {
    if (!LinkButton) return null;
    return <LinkButton selected={path.startsWith(PLUGINS_ROUTE)} route={PLUGINS_ROUTE} icon={NavIcon} text="Plugins" />;
}, { noop: true });

/** Full page in the main area, like Quests, with its tabs in the header. */
export const PluginsPage = ErrorBoundary.wrap(function PluginsPage() {
    const [selected, setSelected] = useState(addonTabs[0].id);
    const { Component } = addonTabs.find(t => t.id === selected) ?? addonTabs[0];

    return (
        <div className={cl("root")}>
            <div className={cl("header")}>
                <NavIcon size="md" className={cl("icon")} />
                <TabBar type="top" look="brand" className={cl("tabs")} selectedItem={selected} onItemSelect={setSelected}>
                    {addonTabs.map(t => <TabBar.Item key={t.id} className={cl("tab")} id={t.id}>{t.label}</TabBar.Item>)}
                </TabBar>
            </div>
            <ScrollerThin className={cl("scroller")}>
                <div className={cl("body")}>
                    <Component />
                </div>
            </ScrollerThin>
        </div>
    );
});
