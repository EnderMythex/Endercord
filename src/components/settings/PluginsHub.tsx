/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./PluginsHub.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { PluginsIcon } from "@components/Icons";
import AddonsTab from "@components/settings/tabs/addons";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { Clickable, Modal, openModal } from "@webpack/common";

const cl = classNameFactory("vc-plugins-hub-");

export function openPluginsHub() {
    openModal(props => (
        <Modal {...props} size="xl" title="Plugins">
            <div className={cl("content")}>
                <AddonsTab />
            </div>
        </Modal>
    ));
}

const ChannelClasses = findCssClassesLazy("channel", "linkButton", "avatarWithText", "link", "interactive");
const InteractiveClasses = findCssClassesLazy("interactive", "interactiveSelected");
const LayoutClasses = findCssClassesLazy("layout", "avatar", "content", "nameAndDecorators");

/** Sits in the list above your DMs, next to Friends, Shop and Quests, using the same classes as those rows. */
export const PluginsNavButton = ErrorBoundary.wrap(function PluginsNavButton() {
    return (
        <li className={ChannelClasses.channel} role="listitem">
            <div className={classes(InteractiveClasses.interactive, ChannelClasses.interactive, ChannelClasses.linkButton)}>
                <Clickable className={ChannelClasses.link} onClick={openPluginsHub}>
                    <div className={classes(LayoutClasses.layout ?? cl("layout"), ChannelClasses.avatarWithText)}>
                        <div className={LayoutClasses.avatar}>
                            <PluginsIcon width={20} height={20} />
                        </div>
                        <div className={LayoutClasses.content}>Plugins</div>
                    </div>
                </Clickable>
            </div>
        </li>
    );
}, { noop: true });
