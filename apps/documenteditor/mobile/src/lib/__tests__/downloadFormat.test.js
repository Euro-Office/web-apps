import { describe, it, expect } from 'vitest';
import { resolveDownloadAs } from '../downloadFormat.js';

// Subset of Asc.c_oAscFileType used by the function
const FileType = {
    TXT: 65,
    RTF: 66,
    ODT: 67,
    DOCX: 68,
    HTML: 69,
    DOTX: 70,
    OTT: 71,
    FB2: 72,
    EPUB: 73,
    DOCM: 74,
    JPG: 75,
    PNG: 76,
    PDF: 513,
    PDFA: 521,
    DOCXF: 86,
};

const defaultOpts = { isForm: false, canFeatureForms: false };

describe('resolveDownloadAs', () => {
    describe('regular documents (docx, etc.)', () => {
        it('returns convert with DOCX default when no format specified', () => {
            const result = resolveDownloadAs(null, 'docx', defaultOpts, FileType);
            expect(result.action).toBe('convert');
            expect(result.format).toBe(FileType.DOCX);
            expect(result.needsTextParams).toBe(false);
        });

        it('returns requested format when supported', () => {
            const result = resolveDownloadAs('pdf', 'docx', defaultOpts, FileType);
            expect(result.format).toBe(FileType.PDF);
        });

        it('falls back to DOCX for unsupported format', () => {
            const result = resolveDownloadAs('xyz', 'docx', defaultOpts, FileType);
            expect(result.format).toBe(FileType.DOCX);
        });

        it('includes PDF and PDFA in supported list', () => {
            const result = resolveDownloadAs(null, 'docx', defaultOpts, FileType);
            expect(result.supported).toContain(FileType.PDF);
            expect(result.supported).toContain(FileType.PDFA);
        });

        it('includes DOCXF when canFeatureForms', () => {
            const result = resolveDownloadAs(null, 'docx', { isForm: false, canFeatureForms: true }, FileType);
            expect(result.supported).toContain(FileType.DOCXF);
        });

        it('excludes DOCXF when !canFeatureForms', () => {
            const result = resolveDownloadAs(null, 'docx', defaultOpts, FileType);
            expect(result.supported).not.toContain(FileType.DOCXF);
        });
    });

    describe('cross-platform documents (pdf, djvu, xps)', () => {
        it('returns origin when no format specified for PDF', () => {
            const result = resolveDownloadAs(null, 'pdf', defaultOpts, FileType);
            expect(result.action).toBe('origin');
        });

        it('returns origin when format matches document type', () => {
            const result = resolveDownloadAs('pdf', 'pdf', defaultOpts, FileType);
            expect(result.action).toBe('origin');
        });

        it('returns convert with textParams for PDF requesting DOCX', () => {
            const result = resolveDownloadAs('docx', 'pdf', defaultOpts, FileType);
            expect(result.action).toBe('convert');
            expect(result.format).toBe(FileType.DOCX);
            expect(result.needsTextParams).toBe(true);
        });

        it('adds PDF/PDFA to supported for xps documents', () => {
            const result = resolveDownloadAs('docx', 'xps', defaultOpts, FileType);
            expect(result.supported).toContain(FileType.PDF);
            expect(result.supported).toContain(FileType.PDFA);
        });

        it('limits supported to only PDF for djvu documents', () => {
            const result = resolveDownloadAs('pdf', 'djvu', defaultOpts, FileType);
            expect(result.supported).toEqual([FileType.PDF]);
            expect(result.format).toBe(FileType.PDF);
        });

        it('returns null format for unsupported format on cross-platform doc', () => {
            const result = resolveDownloadAs('xyz', 'djvu', defaultOpts, FileType);
            expect(result.format).toBeNull();
        });

        it('treats as regular document when isForm even for PDF fileType', () => {
            const result = resolveDownloadAs(null, 'pdf', { isForm: true, canFeatureForms: false }, FileType);
            expect(result.action).toBe('convert');
            expect(result.format).toBe(FileType.DOCX);
        });
    });
});
