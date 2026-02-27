import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the comments controller — it pulls in the full collaboration module
vi.mock('../../../../../common/mobile/lib/controller/collaboration/Comments', () => ({
  CommentsController: () => null,
  ViewCommentsController: () => null,
}));

import { ContextMenu } from '../editor';

const { c_oAscTypeSelectElement, c_oAscEDocProtect } = Asc;

// Helper: build a mock stack item
const makeStackItem = (type, value) => ({
  get_ObjectType: () => type,
  get_ObjectValue: () => value,
});

// Helper: build a controller with defaults that can be overridden
const makeController = (overrides = {}) => {
  const { props: propsOverrides, ...restOverrides } = overrides;
  return {
    isComments: false,
    ...restOverrides,
    props: {
      t: (key, opts) => opts?.returnObjects ? { menuViewComment: 'View Comment', menuAddComment: 'Add Comment', menuOpenLink: 'Open Link' } : key,
      isDisconnected: false,
      canViewComments: true,
      canCoAuthoring: true,
      canComments: true,
      isProtected: false,
      typeProtection: undefined,
      ...propsOverrides,
    },
  };
};

// Helper: set up the mock API for each test
const setupApi = ({ stack = [], canCopy = true, canAddQuotedComment = true } = {}) => {
  const api = {
    getSelectedElements: () => stack,
    can_CopyCut: () => canCopy,
    can_AddQuotedComment: () => canAddQuotedComment,
  };
  Common.EditorApi.get = () => api;
  return api;
};

describe('ContextMenu.mapMenuItems', () => {
  beforeEach(() => {
    // Reset to default mock API
    setupApi();
  });

  it('returns copy, cut, paste for editable text selection', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false })],
      canCopy: true,
    });
    const items = ContextMenu.mapMenuItems(makeController());
    const events = items.map((i) => i.event);

    expect(events).toContain('copy');
    expect(events).toContain('cut');
    expect(events).toContain('paste');
  });

  it('shows only copy when disconnected', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false })],
      canCopy: true,
    });
    const items = ContextMenu.mapMenuItems(makeController({
      props: { isDisconnected: true },
    }));
    const events = items.map((i) => i.event);

    expect(events).toContain('copy');
    expect(events).not.toContain('cut');
    expect(events).not.toContain('paste');
  });

  it('omits cut when object is locked', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => true })],
      canCopy: true,
    });
    const items = ContextMenu.mapMenuItems(makeController());
    const events = items.map((i) => i.event);

    expect(events).toContain('copy');
    expect(events).not.toContain('cut');
    expect(events).not.toContain('paste');
  });

  it('includes openlink and editlink for hyperlink selection', () => {
    setupApi({
      stack: [
        makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeStackItem(c_oAscTypeSelectElement.Hyperlink, {}),
      ],
    });
    const items = ContextMenu.mapMenuItems(makeController());
    const events = items.map((i) => i.event);

    expect(events).toContain('openlink');
    expect(events).toContain('editlink');
  });

  it('shows openlink but not editlink when document is protected', () => {
    setupApi({
      stack: [
        makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false }),
        makeStackItem(c_oAscTypeSelectElement.Hyperlink, {}),
      ],
    });
    const items = ContextMenu.mapMenuItems(makeController({
      props: { isProtected: true, typeProtection: 999 },
    }));
    const events = items.map((i) => i.event);

    expect(events).toContain('openlink');
    expect(events).not.toContain('editlink');
  });

  it('allows editing when protected with TrackedChanges', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false })],
      canCopy: true,
    });
    const items = ContextMenu.mapMenuItems(makeController({
      props: { isProtected: true, typeProtection: c_oAscEDocProtect.TrackedChanges },
    }));
    const events = items.map((i) => i.event);

    expect(events).toContain('cut');
    expect(events).toContain('paste');
  });

  it('includes viewcomment when comments exist and user can view', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false })],
    });
    const items = ContextMenu.mapMenuItems(makeController({
      isComments: true,
      props: { canViewComments: true },
    }));
    const events = items.map((i) => i.event);

    expect(events).toContain('viewcomment');
  });

  it('excludes viewcomment when user cannot view comments', () => {
    setupApi({
      stack: [makeStackItem(c_oAscTypeSelectElement.Paragraph, { get_Locked: () => false })],
    });
    const items = ContextMenu.mapMenuItems(makeController({
      isComments: true,
      props: { canViewComments: false },
    }));
    const events = items.map((i) => i.event);

    expect(events).not.toContain('viewcomment');
  });

  it('still shows paste when nothing is selected but connected', () => {
    setupApi({ stack: [], canCopy: false });
    const items = ContextMenu.mapMenuItems(makeController());
    const events = items.map((i) => i.event);

    expect(events).not.toContain('copy');
    expect(events).not.toContain('cut');
    expect(events).toContain('paste');
  });

  it('returns empty array when disconnected and cannot copy', () => {
    setupApi({ stack: [], canCopy: false });
    const items = ContextMenu.mapMenuItems(makeController({
      props: { isDisconnected: true },
    }));

    expect(items).toEqual([]);
  });
});

describe('ContextMenu.handleMenuItemClick', () => {
  it('returns false for any action', () => {
    expect(ContextMenu.handleMenuItemClick({}, 'copy')).toBe(false);
    expect(ContextMenu.handleMenuItemClick({}, 'paste')).toBe(false);
  });
});
