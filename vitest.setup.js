// Minimal stubs for SDK globals that mobile code accesses without imports.
// Values match the real SDK — extend as tests require more constants.

globalThis.Asc = {
  c_oAscTypeSelectElement: {
    Paragraph: 0,
    Table: 1,
    Image: 2,
    Header: 3,
    Hyperlink: 4,
    SpellCheck: 5,
  },
  c_oAscEDocProtect: {
    TrackedChanges: 0,
  },
};

globalThis.Common = {
  EditorApi: {
    get: () => null,
  },
  Utils: {
    ThemeColor: {
      setColors: () => {},
    },
  },
};

globalThis.window.editorType = 'word';
