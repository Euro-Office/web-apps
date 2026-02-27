// Stub for framework7-react — provides minimal exports used by mobile code.
// Add exports here as tests require them.
//
// Each component renders a <div> (or semantic element) with its children,
// forwarding data-testid, className, and key props so tests can query the DOM.

import React from 'react';

export const f7 = {
  device: { ios: false, android: true },
  sheet: { close: () => {} },
  views: { current: { router: { back: () => {} } } },
  dialog: { create: () => ({ open: () => {} }) },
};

// Simple passthrough wrapper factory
const stub = (tag, displayName) => {
  const C = ({ children, className, title, checked, radio, ...rest }) => {
    const props = {};
    if (className) props.className = className;
    if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
    if (rest.id) props.id = rest.id;

    // For ListItem: render title and checked state as data attributes for querying
    if (title !== undefined) props['data-title'] = String(title);
    if (checked !== undefined) props['data-checked'] = String(checked);
    if (radio !== undefined) props['data-radio'] = 'true';

    return React.createElement(tag, props, title != null ? String(title) : null, children);
  };
  C.displayName = displayName;
  return C;
};

export const List = stub('div', 'List');
export const ListItem = ({ children, className, title, checked, radio, onClick, onChange, ...rest }) => {
  const props = { onClick: onClick || onChange };
  if (className) props.className = className;
  if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
  if (rest.id) props.id = rest.id;
  if (title !== undefined) props['data-title'] = String(title);
  if (checked !== undefined) props['data-checked'] = String(checked);
  if (radio !== undefined) props['data-radio'] = 'true';

  return React.createElement('div', props, title != null ? String(title) : null, children);
};
ListItem.displayName = 'ListItem';

export const ListButton = stub('div', 'ListButton');
export const ListInput = stub('div', 'ListInput');
export const Page = stub('div', 'Page');
export const Navbar = stub('nav', 'Navbar');
export const NavLeft = stub('div', 'NavLeft');
export const NavRight = stub('div', 'NavRight');
export const NavTitle = stub('div', 'NavTitle');
export const Link = ({ children, className, onClick, iconOnly, text, href, ...rest }) => {
  const props = { onClick };
  if (className) props.className = className;
  if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
  if (rest.id) props.id = rest.id;
  return React.createElement('a', props, text || null, children);
};
Link.displayName = 'Link';
export const Button = stub('button', 'Button');
export const Segmented = stub('div', 'Segmented');
export const BlockTitle = stub('div', 'BlockTitle');
export const View = stub('div', 'View');
export const Icon = stub('i', 'Icon');
export const Toggle = stub('div', 'Toggle');
export const Fragment = React.Fragment;
