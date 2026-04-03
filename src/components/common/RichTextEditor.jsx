import { useState, useRef, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiList } from 'react-icons/fi';
import { MdFormatListNumbered } from 'react-icons/md';
import DOMPurify from "dompurify";

export default function RichTextEditor({ value = '', onChange, placeholder = 'Enter text...', rows = 3 }) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initialize content when value changes from parent
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    // Handle formatting commands
    const applyFormat = (command) => {
        document.execCommand(command, false, null);
        editorRef.current.focus();
    };

    // Normalize editor HTML by removing pasted inline sizing/styles/classes.
    const normalizeEditorHtml = (html = '') => {
        if (!html) return '';

        const container = document.createElement('div');
        container.innerHTML = html;

        container.querySelectorAll('*').forEach((node) => {
            node.removeAttribute('style');
            node.removeAttribute('class');
            if (node.tagName === 'FONT') {
                // Unwrap legacy <font> tags while preserving content.
                const parent = node.parentNode;
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
            }
        });

        return container.innerHTML;
    };

    // Handle content change
    const handleInput = () => {
        if (editorRef.current) {
            const content = normalizeEditorHtml(editorRef.current.innerHTML);
            if (editorRef.current.innerHTML !== content) {
                editorRef.current.innerHTML = content;
            }
            onChange(content);
        }
    };

    // Handle paste: keep safe semantic formatting while removing custom sizing/styles.
    const handlePaste = (e) => {
        e.preventDefault();
        const pastedHtml = e.clipboardData.getData('text/html');
        const pastedText = e.clipboardData.getData('text/plain');

        const safeHtml = DOMPurify.sanitize(pastedHtml || pastedText || '', {
            ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span'],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
        });

        const cleanHTML = normalizeEditorHtml(safeHtml);
        document.execCommand('insertHTML', false, cleanHTML);
        handleInput();
    };

    // Check if a format is currently active
    const isFormatActive = (command) => {
        return document.queryCommandState(command);
    };

    return (
        <div className="w-full">
            {/* Toolbar */}
            <div className={`flex gap-1 p-2 border border-b-0 rounded-t-lg bg-gray-50 ${isFocused ? 'border-blue-500' : 'border-gray-300'}`}>
                <button
                    type="button"
                    onClick={() => applyFormat('bold')}
                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                        isFormatActive('bold') ? 'bg-gray-300' : ''
                    }`}
                    title="Bold (Ctrl+B)"
                >
                    <FiBold className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => applyFormat('italic')}
                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                        isFormatActive('italic') ? 'bg-gray-300' : ''
                    }`}
                    title="Italic (Ctrl+I)"
                >
                    <FiItalic className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => applyFormat('underline')}
                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                        isFormatActive('underline') ? 'bg-gray-300' : ''
                    }`}
                    title="Underline (Ctrl+U)"
                >
                    <FiUnderline className="w-4 h-4" />
                </button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button
                    type="button"
                    onClick={() => applyFormat('insertUnorderedList')}
                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                        isFormatActive('insertUnorderedList') ? 'bg-gray-300' : ''
                    }`}
                    title="Bullet List"
                >
                    <FiList className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => applyFormat('insertOrderedList')}
                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                        isFormatActive('insertOrderedList') ? 'bg-gray-300' : ''
                    }`}
                    title="Numbered List"
                >
                    <MdFormatListNumbered className="w-4 h-4" />
                </button>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`text-sm w-full border rounded-b-lg p-3 outline-none min-h-[${rows * 24}px] overflow-y-auto ${
                    isFocused ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{
                    minHeight: `${rows * 24}px`,
                    fontSize: '16px',
                    lineHeight: 1.6,
                }}
                suppressContentEditableWarning
                data-placeholder={placeholder}
            />

            <style>{`
                [contentEditable][data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #9CA3AF;
                    pointer-events: none;
                    position: absolute;
                }
                [contentEditable] {
                    position: relative;
                    font-size: 16px;
                    line-height: 1.6;
                }
                [contentEditable] * {
                    font-size: 16px !important;
                    line-height: 1.6;
                }
                [contentEditable] ul {
                    margin: 0.5em 0;
                    padding-left: 2em;
                    list-style-type: disc;
                    list-style-position: outside;
                }
                [contentEditable] ol {
                    margin: 0.5em 0;
                    padding-left: 2em;
                    list-style-type: decimal;
                    list-style-position: outside;
                }
                [contentEditable] li {
                    margin: 0.25em 0;
                    display: list-item;
                }
            `}</style>
        </div>
    );
}
