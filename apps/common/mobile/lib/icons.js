// This bundle's shape (copy/cut/paste, each exposing .id) exists to satisfy the icon-id
// resolution contract Euro-Office/web-apps#155 (n-goncalves) established in ContextMenu.jsx
// (icons.copy.id / icons.cut.id / icons.paste.id) -- written independently from that current,
// non-tainted usage contract and the repo's existing @common-icons import convention, not
// copied from #155's own diff (which lived in the tainted grab-bag file this replaces).
import IconCopy from '@common-icons/icon-copy.svg';
import IconCut from '@common-icons/icon-cut.svg';
import IconPaste from '@common-icons/icon-paste.svg';

export const icons = {
    copy: IconCopy,
    cut: IconCut,
    paste: IconPaste,
};
