/**
 * Pure helpers for download-format resolution.
 *
 * Extracted from controller/Main.jsx `onDownloadAs()`.
 */

/**
 * Resolve a gateway download-as request into an action descriptor.
 *
 * @param {string|null|undefined} formatStr  Format string from the gateway (e.g. "pdf", "docx")
 * @param {string} docFileType               The document's current file type (e.g. "pdf", "djvu", "docx")
 * @param {object} opts                      Document capability flags
 * @param {boolean} opts.isForm
 * @param {boolean} opts.canFeatureForms
 * @param {object}  fileTypeEnum             Asc.c_oAscFileType enum object
 * @returns {{ action: 'origin'|'convert', format: number|null, supported: number[], needsTextParams: boolean }}
 *   - action='origin': download the original file (no conversion)
 *   - action='convert': convert to `format` (null means use DownloadOrigin with isSaveAs)
 */
export function resolveDownloadAs(formatStr, docFileType, opts, fileTypeEnum) {
    const requestedFormat = (formatStr && typeof formatStr === 'string')
        ? fileTypeEnum[formatStr.toUpperCase()] ?? null
        : null;

    const baseSupportedFormats = [
        fileTypeEnum.TXT,
        fileTypeEnum.RTF,
        fileTypeEnum.ODT,
        fileTypeEnum.DOCX,
        fileTypeEnum.HTML,
        fileTypeEnum.DOTX,
        fileTypeEnum.OTT,
        fileTypeEnum.FB2,
        fileTypeEnum.EPUB,
        fileTypeEnum.DOCM,
        fileTypeEnum.JPG,
        fileTypeEnum.PNG,
    ];

    const crossPlatformType = /^(?:(pdf|djvu|xps|oxps))$/.exec(docFileType);

    if (crossPlatformType && typeof crossPlatformType[1] === 'string' && !opts.isForm) {
        // Document is a cross-platform format (PDF, DJVU, XPS)
        if (!requestedFormat || crossPlatformType[1] === formatStr.toLowerCase()) {
            return { action: 'origin', format: null, supported: [], needsTextParams: false };
        }

        let supported = [...baseSupportedFormats];
        let needsTextParams = false;

        if (/^xps|oxps$/.test(docFileType)) {
            supported.push(fileTypeEnum.PDF, fileTypeEnum.PDFA);
        } else if (/^djvu$/.test(docFileType)) {
            supported = [fileTypeEnum.PDF];
        }

        needsTextParams = true;

        if (opts.canFeatureForms && !/^djvu$/.test(docFileType)) {
            supported.push(fileTypeEnum.DOCXF);
        }

        const finalFormat = (requestedFormat != null && supported.includes(requestedFormat))
            ? requestedFormat : null;

        return { action: 'convert', format: finalFormat, supported, needsTextParams };
    }

    // Regular document
    let supported = [...baseSupportedFormats, fileTypeEnum.PDF, fileTypeEnum.PDFA];
    const defaultFormat = fileTypeEnum.DOCX;

    if (opts.canFeatureForms && !/^djvu$/.test(docFileType)) {
        supported.push(fileTypeEnum.DOCXF);
    }

    const finalFormat = (requestedFormat != null && supported.includes(requestedFormat))
        ? requestedFormat : defaultFormat;

    return { action: 'convert', format: finalFormat, supported, needsTextParams: false };
}
