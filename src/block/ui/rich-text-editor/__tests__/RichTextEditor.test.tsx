import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import RichTextEditor from '../RichTextEditor';

describe('RichTextEditor isolation', () => {
    beforeAll(() => {
        // JSDOM does not provide the range geometry used by ProseMirror scrolling.
        Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
        Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
        // JSDOM has no native popover API; browser checks cover positioning and dismissal.
        for (const [method, open] of [['showPopover', true], ['hidePopover', false], ['togglePopover', null]] as const) {
            Object.defineProperty(HTMLElement.prototype, method, {
                configurable: true,
                value: function (this: HTMLElement) {
                    const nextOpen = open ?? this.getAttribute('aria-hidden') === 'true';
                    this.style.display = nextOpen ? 'grid' : 'none';
                    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: nextOpen ? 'open' : 'closed' }));
                    return nextOpen;
                },
            });
        }
    });

    afterAll(() => {
        Reflect.deleteProperty(Range.prototype, 'getClientRects');
        Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
        for (const method of ['showPopover', 'hidePopover', 'togglePopover']) {
            Reflect.deleteProperty(HTMLElement.prototype, method);
        }
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("disables editing and toolbar actions while preserving its document", async () => {
        const changed = vi.fn();
        const { rerender } = render(<RichTextEditor initialContent="<p>Keep this content</p>" onChange={changed} />);
        const content = screen.getByRole("textbox", { name: "Content" });
        await waitFor(() => expect(content).toHaveAttribute("contenteditable", "true"));
        rerender(<RichTextEditor initialContent="<p>Keep this content</p>" onChange={changed} disabled />);
        await waitFor(() => expect(content).toHaveAttribute("contenteditable", "false"));
        expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
        expect(content).toHaveTextContent("Keep this content");
        rerender(<RichTextEditor initialContent="<p>Keep this content</p>" onChange={changed} />);
        await waitFor(() => expect(content).toHaveAttribute("contenteditable", "true"));
        expect(changed).not.toHaveBeenCalled();
    });

    test('opens image options as a toolbar popover without changing editor content', async () => {
        const changed = vi.fn();
        render(<RichTextEditor initialContent="<p>Keep this content</p>" onChange={changed} />);
        const toolbar = within(screen.getByRole('group', { name: 'Text formatting' }));
        const trigger = toolbar.getByRole('button', { name: 'Insert image' });
        await waitFor(() => expect(trigger).toBeEnabled());
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('dialog', { name: 'Image options' })).not.toBeInTheDocument();
        fireEvent.click(trigger);
        const popover = toolbar.getByRole('dialog', { name: 'Image options' });
        expect(popover).toHaveAttribute('popover', 'auto');
        expect(popover.id).toBe(trigger.getAttribute('aria-controls'));
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(within(popover).getByLabelText('Upload from computer')).toBeInTheDocument();
        expect(within(popover).getByLabelText('Image URL')).toBeInTheDocument();
        fireEvent.click(trigger);
        expect(screen.queryByRole('dialog', { name: 'Image options' })).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Content' })).toHaveTextContent('Keep this content');
        expect(changed).not.toHaveBeenCalled();
    });

    test('keeps formatting, content, history and updates inside the targeted instance', async () => {
        const firstChanged = vi.fn();
        const secondChanged = vi.fn();
        render(
            <>
                <input aria-label="Outside input" defaultValue="Outside text" />
                <RichTextEditor label="First editor" initialContent="<p>First text</p>" onChange={firstChanged} />
                <RichTextEditor label="Second editor" initialContent="<p>Second text</p>" onChange={secondChanged} />
            </>
        );
        const first = within(screen.getByRole('group', { name: 'First editor' }));
        const second = within(screen.getByRole('group', { name: 'Second editor' }));
        await waitFor(() => expect(first.getByRole('combobox')).toBeEnabled());
        await waitFor(() => expect(second.getByRole('combobox')).toBeEnabled());

        fireEvent.change(first.getByRole('combobox'), { target: { value: '2' } });
        await waitFor(() => expect(first.getByRole('textbox').querySelector('h2')).toHaveTextContent('First text'));
        expect(second.getByRole('combobox')).toHaveValue('paragraph');
        expect(second.getByRole('textbox').innerHTML).toBe('<p>Second text</p>');
        expect(second.getByRole('button', { name: 'Undo' })).toBeDisabled();
        expect(firstChanged).toHaveBeenLastCalledWith('<h2>First text</h2><p></p>');
        expect(secondChanged).not.toHaveBeenCalled();

        // Keep focus in the other editor to catch commands targeting the wrong instance.
        fireEvent.focus(second.getByRole('textbox'));
        fireEvent.click(first.getByRole('button', { name: 'Clear content' }));
        await waitFor(() => expect(first.getByRole('textbox').textContent).toBe(''));
        fireEvent.click(first.getByRole('button', { name: 'Undo' }));
        await waitFor(() => expect(first.getByRole('textbox')).toHaveTextContent('First text'));
        await waitFor(() => expect(first.getByRole('button', { name: 'Redo' })).toBeEnabled());
        fireEvent.click(first.getByRole('button', { name: 'Redo' }));
        await waitFor(() => expect(first.getByRole('textbox')).not.toHaveTextContent('First text'));

        fireEvent.click(first.getByRole('button', { name: 'Bold' }));
        await waitFor(() => expect(first.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true'));
        expect(second.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
        expect(second.getByRole('textbox').innerHTML).toBe('<p>Second text</p>');
        expect(secondChanged).not.toHaveBeenCalled();
        expect(screen.getByRole('textbox', { name: 'Outside input' })).toHaveValue('Outside text');
    });

    test('inserts and edits tables only within the targeted editor, with undo and redo', async () => {
        const firstChanged = vi.fn();
        const secondChanged = vi.fn();
        const submit = vi.fn(event => event.preventDefault());
        render(
            <form onSubmit={submit}>
                <RichTextEditor label="First editor" onChange={firstChanged} />
                <RichTextEditor label="Second editor" onChange={secondChanged} />
            </form>
        );
        const first = within(screen.getByRole('group', { name: 'First editor' }));
        const second = within(screen.getByRole('group', { name: 'Second editor' }));
        const insert = first.getByRole('button', { name: 'Insert table' });
        await waitFor(() => expect(insert).toBeEnabled());
        expect(first.queryByRole('combobox', { name: 'Table actions' })).not.toBeInTheDocument();
        fireEvent.mouseDown(insert);
        fireEvent.click(insert);
        await waitFor(() => expect(first.getByRole('table')).toBeInTheDocument());
        expect(within(first.getByRole('table')).getAllByRole('row')).toHaveLength(3);
        expect(first.getAllByRole('columnheader')).toHaveLength(3);
        expect(first.getAllByRole('cell')).toHaveLength(6);
        expect(firstChanged).toHaveBeenLastCalledWith(expect.stringContaining('<table'));
        expect(insert).toBeDisabled();
        expect(second.queryByRole('table')).not.toBeInTheDocument();
        expect(second.queryByRole('combobox', { name: 'Table actions' })).not.toBeInTheDocument();

        fireEvent.click(first.getByRole('button', { name: 'Undo' }));
        await waitFor(() => expect(first.queryByRole('table')).not.toBeInTheDocument());
        await waitFor(() => expect(first.getByRole('button', { name: 'Redo' })).toBeEnabled());
        fireEvent.click(first.getByRole('button', { name: 'Redo' }));
        await waitFor(() => expect(first.getByRole('table')).toBeInTheDocument());

        const tableAction = (action: string) => {
            const dropdown = first.getByRole('combobox', { name: 'Table actions' });
            expect(within(dropdown).getByRole('option', { name: action })).toBeEnabled();
            fireEvent.change(dropdown, { target: { value: action } });
        };
        tableAction('Add row above');
        expect(first.getAllByRole('row')).toHaveLength(4);
        tableAction('Add row below');
        expect(first.getAllByRole('row')).toHaveLength(5);
        tableAction('Delete row');
        expect(first.getAllByRole('row')).toHaveLength(4);
        tableAction('Add column left');
        expect(first.getAllByRole('row')[0].children).toHaveLength(4);
        tableAction('Add column right');
        expect(first.getAllByRole('row')[0].children).toHaveLength(5);
        tableAction('Delete column');
        expect(first.getAllByRole('row')[0].children).toHaveLength(4);
        const headers = first.queryAllByRole('columnheader').length;
        tableAction('Toggle header row');
        expect(first.queryAllByRole('columnheader')).not.toHaveLength(headers);
        tableAction('Delete table');
        await waitFor(() => expect(first.queryByRole('table')).not.toBeInTheDocument());
        expect(first.queryByRole('combobox', { name: 'Table actions' })).not.toBeInTheDocument();
        expect(second.queryByRole('table')).not.toBeInTheDocument();
        expect(secondChanged).not.toHaveBeenCalled();
        expect(submit).not.toHaveBeenCalled();
    });

    test('inserts a URL image with alt text only into the targeted editor without submitting its form', async () => {
        const changed = vi.fn();
        const submit = vi.fn(event => event.preventDefault());
        render(
            <form onSubmit={submit}>
                <RichTextEditor label="First editor" onChange={changed} />
                <RichTextEditor label="Second editor" />
            </form>
        );
        const first = within(screen.getByRole('group', { name: 'First editor' }));
        const second = within(screen.getByRole('group', { name: 'Second editor' }));
        await waitFor(() => expect(first.getByRole('button', { name: 'Insert image' })).toBeEnabled());
        fireEvent.click(first.getByRole('button', { name: 'Insert image' }));
        fireEvent.change(first.getByLabelText('Image description (optional)'), { target: { value: 'A landscape' } });
        const url = first.getByLabelText('Image URL');
        fireEvent.change(url, { target: { value: 'https://example.com/photo.png' } });
        fireEvent.keyDown(url, { key: 'Enter' });
        await waitFor(() => expect(first.getByRole('img', { name: 'A landscape' })).toHaveAttribute('src', 'https://example.com/photo.png'));
        expect(second.queryByRole('img')).not.toBeInTheDocument();
        expect(first.queryByRole('dialog', { name: 'Image options' })).not.toBeInTheDocument();
        expect(changed).toHaveBeenLastCalledWith(expect.stringContaining('<img src="https://example.com/photo.png" alt="A landscape">'));
        expect(submit).not.toHaveBeenCalled();
        fireEvent.click(first.getByRole('button', { name: 'Undo' }));
        await waitFor(() => expect(first.queryByRole('img')).not.toBeInTheDocument());
        await waitFor(() => expect(first.getByRole('button', { name: 'Redo' })).toBeEnabled());
        fireEvent.click(first.getByRole('button', { name: 'Redo' }));
        await waitFor(() => expect(first.getByRole('img', { name: 'A landscape' })).toBeInTheDocument());
    });

    test.each(['', 'not-a-url', 'javascript:alert(1)', 'data:image/png;base64,abc', 'ftp://example.com/photo.png'])(
        'rejects invalid or unsupported image URL %j',
        async url => {
            render(<RichTextEditor />);
            await waitFor(() => expect(screen.getByRole('button', { name: 'Insert image' })).toBeEnabled());
            fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
            fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: url } });
            fireEvent.click(screen.getByRole('button', { name: 'Insert image URL' }));
            expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid HTTP or HTTPS image URL.');
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        }
    );

    test('uploads a computer image through the existing API and inserts its persistent URL only in its editor', async () => {
        const uploadingChanged = vi.fn();
        let finishUpload: ((response: Response) => void) | undefined;
        const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>(resolve => { finishUpload = resolve; }));
        vi.stubGlobal('fetch', fetchMock);
        render(
            <>
                <RichTextEditor label="First editor" onUploadingChange={uploadingChanged} />
                <RichTextEditor label="Second editor" />
            </>
        );
        const first = within(screen.getByRole('group', { name: 'First editor' }));
        const second = within(screen.getByRole('group', { name: 'Second editor' }));
        await waitFor(() => expect(first.getByRole('button', { name: 'Insert image' })).toBeEnabled());
        fireEvent.click(first.getByRole('button', { name: 'Insert image' }));
        const file = new File(['image data'], 'photo.png', { type: 'image/png' });
        const input = first.getByLabelText('Upload from computer');
        fireEvent.change(input, { target: { files: [file] } });
        expect(first.getByRole('status')).toHaveTextContent('Uploading image...');
        expect(uploadingChanged).toHaveBeenLastCalledWith(true);
        expect(input).toBeDisabled();
        expect(first.getByRole('button', { name: 'Insert image URL' })).toBeDisabled();
        expect(fetchMock).toHaveBeenCalledWith('/api/upload', { method: 'POST', body: expect.any(FormData) });
        const body = fetchMock.mock.calls[0][1]?.body;
        expect(body).toBeInstanceOf(FormData);
        if (body instanceof FormData) expect(body.get('file')).toBe(file);
        finishUpload?.(new Response(JSON.stringify({ fileUrl: 'https://storage.example.com/uploads/photo.png' })));
        await waitFor(() => expect(first.getByRole('img', { name: 'photo.png' })).toHaveAttribute('src', 'https://storage.example.com/uploads/photo.png'));
        expect(second.queryByRole('img')).not.toBeInTheDocument();
        expect(first.queryByRole('status')).not.toBeInTheDocument();
        expect(uploadingChanged).toHaveBeenLastCalledWith(false);
        expect(input).toHaveValue('');
    });

    test.each(['HTTP', 'network', 'JSON', 'missing URL', 'unsafe URL'])('surfaces upload %s errors without inserting an image', async kind => {
        const fetchMock = vi.fn();
        if (kind === 'network') fetchMock.mockRejectedValue(new Error('Network unavailable'));
        else if (kind === 'HTTP') fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Storage unavailable' }), { status: 500 }));
        else if (kind === 'JSON') fetchMock.mockResolvedValue(new Response('invalid json'));
        else fetchMock.mockResolvedValue(new Response(JSON.stringify(kind === 'missing URL' ? {} : { fileUrl: 'javascript:alert(1)' })));
        vi.stubGlobal('fetch', fetchMock);
        render(<RichTextEditor />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Insert image' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
        const input = screen.getByLabelText('Upload from computer');
        fireEvent.change(input, { target: { files: [new File(['image data'], 'photo.png', { type: 'image/png' })] } });
        await waitFor(() => expect(screen.getByRole('alert')).not.toBeEmptyDOMElement());
        if (kind === 'HTTP') expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(input).toBeEnabled();
        expect(input).toHaveValue('');
    });

    test('rejects unsupported files before uploading and handles cancellation', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        render(<RichTextEditor />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Insert image' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
        const input = screen.getByLabelText('Upload from computer');
        fireEvent.change(input, { target: { files: [] } });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        fireEvent.change(input, { target: { files: [new File(['not an image'], 'file.txt', { type: 'text/plain' })] } });
        expect(await screen.findByRole('alert')).toHaveTextContent('Choose an SVG, PNG, JPG, or WebP image.');
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
