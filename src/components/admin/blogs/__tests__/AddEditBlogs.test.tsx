import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import AddEditBlogs from '../AddEditBlogs';

vi.mock('@/hooks/useBlogListing', () => ({
    useBlogListing: () => ({ blogs: [], isLoading: false, isError: false }),
    useCreateBlog: () => ({ createBlog: vi.fn(), isCreating: false }),
    useUpdateBlog: () => ({ updateBlog: vi.fn(), isUpdating: false }),
}));
vi.mock('@/hooks/useSkills', () => ({
    useSkills: () => ({ skills: [], isSkillsLoading: false, isSkillsError: false }),
}));

const renderEditor = () => render(
    <AddEditBlogs modalState={{ isOpen: true, mode: 'add' }} setModalState={vi.fn()} />
);

describe('Blog editor toolbar', () => {
    test('uses accessible icon buttons without submitting the form', async () => {
        const { container } = renderEditor();
        const bold = await screen.findByRole('button', { name: 'Bold' });
        await waitFor(() => expect(bold).toBeEnabled());
        const buttons = within(screen.getByRole('group', { name: 'Text formatting' })).getAllByRole('button');
        for (const button of buttons) {
            expect(button).toHaveAttribute('type', 'button');
            expect(button).toHaveAttribute('title', button.getAttribute('aria-label'));
            expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
            expect(button).toHaveTextContent('');
        }
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

        const submit = vi.fn(event => event.preventDefault());
        container.querySelector('form')?.addEventListener('submit', submit);
        fireEvent.mouseDown(bold);
        fireEvent.click(bold);
        await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
        fireEvent.click(bold);
        await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'false'));
        expect(submit).not.toHaveBeenCalled();
    });

    test('switches between every heading level and paragraph using the dropdown', async () => {
        renderEditor();
        const dropdown = screen.getByRole('combobox', { name: 'Text style' });
        await waitFor(() => expect(dropdown).toBeEnabled());
        const content = screen.getByRole('textbox', { name: 'Blog content' });
        expect(dropdown).toHaveValue('paragraph');
        for (const level of [1, 2, 3, 4, 5, 6]) {
            fireEvent.change(dropdown, { target: { value: String(level) } });
            await waitFor(() => expect(content.querySelector(`h${level}`)).not.toBeNull());
            expect(dropdown).toHaveValue(String(level));
        }
        fireEvent.change(dropdown, { target: { value: 'paragraph' } });
        await waitFor(() => expect(content.querySelector('p')).not.toBeNull());
        expect(content.querySelector('h6')).toBeNull();
        expect(dropdown).toHaveValue('paragraph');
        expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        await waitFor(() => expect(dropdown).toHaveValue('paragraph'));
    });
});
