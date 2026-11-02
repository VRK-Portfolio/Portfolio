'use client';

import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { ChainedCommands } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { imageMimeTypes, uploadImageFile } from "@/libs/upload-image";
import {
    Bold, Code, CodeXml, CornerDownLeft, ImagePlus, Italic, List, ListOrdered,
    Minus, Pilcrow, Quote, Redo2, Strikethrough, Table2, Trash2, Underline, Undo2,
} from "lucide-react";
import './rich-text-editor.css';

const headings = [1, 2, 3, 4, 5, 6] as const;
const tableActions: { label: string; command: (chain: ChainedCommands) => ChainedCommands }[] = [
    { label: 'Add row above', command: chain => chain.addRowBefore() },
    { label: 'Add row below', command: chain => chain.addRowAfter() },
    { label: 'Add column left', command: chain => chain.addColumnBefore() },
    { label: 'Add column right', command: chain => chain.addColumnAfter() },
    { label: 'Delete row', command: chain => chain.deleteRow() },
    { label: 'Delete column', command: chain => chain.deleteColumn() },
    { label: 'Toggle header row', command: chain => chain.toggleHeaderRow() },
    { label: 'Delete table', command: chain => chain.deleteTable() },
];

const imageSource = (value: string) => {
    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        throw new Error('Enter a valid HTTP or HTTPS image URL.');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Enter a valid HTTP or HTTPS image URL.');
    }
    return url.href;
};

const tools: {
    label: string;
    icon: typeof Bold;
    active?: string;
    command: (chain: ChainedCommands) => ChainedCommands;
}[][] = [
    [
        { label: 'Undo', icon: Undo2, command: chain => chain.undo() },
        { label: 'Redo', icon: Redo2, command: chain => chain.redo() },
    ],
    [
        { label: 'Bold', icon: Bold, active: 'bold', command: chain => chain.toggleBold() },
        { label: 'Italic', icon: Italic, active: 'italic', command: chain => chain.toggleItalic() },
        { label: 'Underline', icon: Underline, active: 'underline', command: chain => chain.toggleUnderline() },
        { label: 'Strikethrough', icon: Strikethrough, active: 'strike', command: chain => chain.toggleStrike() },
        { label: 'Inline code', icon: Code, active: 'code', command: chain => chain.toggleCode() },
    ],
    [
        { label: 'Bullet list', icon: List, active: 'bulletList', command: chain => chain.toggleBulletList() },
        { label: 'Numbered list', icon: ListOrdered, active: 'orderedList', command: chain => chain.toggleOrderedList() },
        { label: 'Blockquote', icon: Quote, active: 'blockquote', command: chain => chain.toggleBlockquote() },
        { label: 'Code block', icon: CodeXml, active: 'codeBlock', command: chain => chain.toggleCodeBlock() },
    ],
    [
        { label: 'Horizontal rule', icon: Minus, command: chain => chain.setHorizontalRule() },
        { label: 'Line break', icon: CornerDownLeft, command: chain => chain.setHardBreak() },
        { label: 'Reset block formatting', icon: Pilcrow, command: chain => chain.clearNodes() },
        { label: 'Clear content', icon: Trash2, command: chain => chain.clearContent() },
    ],
];

interface RichTextEditorProps {
    label?: string;
    initialContent?: string;
    onChange?: (html: string) => void;
    disabled?: boolean;
    onUploadingChange?: (uploading: boolean) => void;
}

const RichTextEditor = ({ label = 'Content', initialContent = '', onChange, disabled = false, onUploadingChange }: RichTextEditorProps) => {
    const imagePanelId = useId();
    const imageAnchor = `--rte-image-${imagePanelId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const imagePopover = useRef<HTMLDivElement>(null);
    const imageUrlInput = useRef<HTMLInputElement>(null);
    const [imageOpen, setImageOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');
    const [imageError, setImageError] = useState('');
    const [uploading, setUploading] = useState(false);
    const editor = useEditor({
        extensions: [StarterKit, Image, TableKit.configure({ table: { renderWrapper: true } })],
        editable: !disabled,
        editorProps: {
            attributes: {
                class: "rich-text-editor__content",
                role: "textbox",
                "aria-label": label,
                "aria-multiline": "true",
            }
        },
        content: initialContent,
        onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
        immediatelyRender: false
    });
    useEffect(() => {
        editor?.setEditable(!disabled, false);
    }, [editor, disabled]);
    useEffect(() => {
        onUploadingChange?.(uploading);
    }, [onUploadingChange, uploading]);
    const toolbar = useEditorState({
        editor,
        selector: ({ editor }) => ({
            block: headings.find(level => editor?.isActive('heading', { level }))?.toString() ?? 'paragraph',
            inTable: editor?.isActive('table') ?? false,
            tableActions: tableActions.map(action => !!editor?.isActive('table') && action.command(editor.can().chain()).run()),
            groups: tools.map(group => group.map(tool => ({
                active: tool.active ? editor?.isActive(tool.active) ?? false : undefined,
                disabled: tool.label === 'Undo' ? !editor?.can().undo() : tool.label === 'Redo' ? !editor?.can().redo() : false,
            }))),
        }),
    });

    const insertImage = (src: string, alt: string) => {
        if (!editor || editor.isDestroyed) throw new Error('The editor is no longer available.');
        const source = imageSource(src);
        if (!editor.chain().focus().setImage({ src: source, alt }).run()) {
            throw new Error('Cannot insert an image here. Select a paragraph and try again.');
        }
        imagePopover.current?.hidePopover();
        setImageUrl('');
        setImageAlt('');
        setImageError('');
    };

    const insertFromUrl = () => {
        try {
            insertImage(imageUrl, imageAlt.trim());
        } catch (error) {
            setImageError(error instanceof Error ? error.message : 'Could not insert the image.');
        }
    };

    const uploadImage = async (file: File) => {
        setImageError('');
        setUploading(true);
        try {
            insertImage(await uploadImageFile(file), imageAlt.trim() || file.name);
        } catch (error) {
            setImageError(error instanceof Error ? error.message : 'Image upload failed. Please try again.');
            imagePopover.current?.showPopover();
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="rich-text-editor" role="group" aria-label={label} aria-disabled={disabled}>
            <div className="rich-text-editor__toolbar" role="group" aria-label="Text formatting">
                <select
                    aria-label="Text style"
                    value={toolbar?.block ?? 'paragraph'}
                    disabled={!editor || disabled}
                    onChange={event => {
                        const level = headings.find(level => String(level) === event.target.value);
                        const chain = editor?.chain().focus();
                        if (level) chain?.setHeading({ level }).run();
                        else chain?.setParagraph().run();
                    }}
                >
                    <option value="paragraph">Paragraph</option>
                    {headings.map(level => <option key={level} value={level}>Heading {level}</option>)}
                </select>
                {tools.map((group, groupIndex) => (
                    <div className="rich-text-editor__group" key={groupIndex}>
                        {group.map(({ label, icon: Icon, command }, index) => (
                            <button
                                key={label}
                                type="button"
                                aria-label={label}
                                title={label}
                                aria-pressed={toolbar?.groups[groupIndex][index].active}
                                disabled={!editor || disabled || (toolbar?.groups[groupIndex][index].disabled ?? true)}
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => editor && command(editor.chain().focus()).run()}
                            >
                                <Icon size={18} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                ))}
                <div className="rich-text-editor__group">
                    <button
                        type="button"
                        aria-label="Insert table"
                        title="Insert table"
                        disabled={!editor || disabled || toolbar?.inTable}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    >
                        <Table2 size={18} aria-hidden="true" />
                    </button>
                    {toolbar?.inTable && (
                        <select
                            aria-label="Table actions"
                            disabled={disabled}
                            value=""
                            onChange={event => {
                                const action = tableActions.find(action => action.label === event.target.value);
                                if (editor && action) action.command(editor.chain().focus()).run();
                            }}
                        >
                            <option value="" disabled>Table actions</option>
                            {tableActions.map((action, index) => (
                                <option key={action.label} value={action.label} disabled={!toolbar.tableActions[index]}>
                                    {action.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        aria-label="Insert image"
                        title="Insert image"
                        aria-haspopup="dialog"
                        aria-expanded={imageOpen}
                        aria-controls={imagePanelId}
                        style={{ anchorName: imageAnchor }}
                        disabled={!editor || disabled}
                        onClick={() => {
                            imagePopover.current?.togglePopover();
                            setImageError('');
                        }}
                    >
                        <ImagePlus size={18} aria-hidden="true" />
                    </button>
                </div>
                <div
                    ref={imagePopover}
                    id={imagePanelId}
                    className="rich-text-editor__images"
                    popover="auto"
                    style={{ positionAnchor: imageAnchor }}
                    role="dialog"
                    aria-label="Image options"
                    aria-hidden={!imageOpen}
                    aria-busy={uploading}
                    onToggle={event => {
                        const open = event.newState === 'open';
                        setImageOpen(open);
                        if (open) imageUrlInput.current?.focus();
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'file') {
                            event.preventDefault();
                            if (!uploading && !disabled) insertFromUrl();
                        }
                    }}
                >
                    <label>
                        Image description (optional)
                        <input type="text" value={imageAlt} disabled={uploading || disabled} onChange={event => setImageAlt(event.target.value)} />
                    </label>
                    <label>
                        Upload from computer
                        <input
                            type="file"
                            accept={imageMimeTypes.join(',')}
                            disabled={uploading || disabled}
                            onChange={event => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void uploadImage(file);
                            }}
                        />
                    </label>
                    <span className="rich-text-editor__image-hint">Or use an image URL</span>
                    <label>
                        Image URL
                        <input
                            ref={imageUrlInput}
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={imageUrl}
                            disabled={uploading || disabled}
                            onChange={event => setImageUrl(event.target.value)}
                        />
                    </label>
                    <button type="button" disabled={uploading || disabled} onClick={insertFromUrl}>Insert image URL</button>
                    {uploading && <p role="status">Uploading image...</p>}
                    {imageError && <p className="rich-text-editor__image-error" role="alert">{imageError}</p>}
                </div>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;