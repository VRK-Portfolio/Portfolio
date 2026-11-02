'use client';

import AddEditBlogs, { BlogModalState } from "@/components/admin/blogs/AddEditBlogs";
import RecentBlogsComponent from "@/components/site/recent-blogs/recent-blogs";
import Modal from "@/components/ui/modal/Modal";
import { useState } from "react";
import { useDeleteBlog } from "@/hooks/useBlogListing";

const BlogListingScreen = () => {
    const [isOpenModal, setOpenModal] = useState<BlogModalState>({ isOpen: false, mode: 'add', blogId: null });
    const { deleteBlog, isDeleting, deletingId, deleteError } = useDeleteBlog();
    return (
        <div>
            <RecentBlogsComponent
                type="admin"
                modalOpen={id => setOpenModal({ isOpen: true, mode: id ? 'edit' : 'add', blogId: id ?? null })}
                onDelete={id => deleteBlog(id)}
                isDeleting={isDeleting}
                deletingId={deletingId}
                deleteError={deleteError?.message}
            />
            
            {
                isOpenModal.isOpen && (
                    <Modal isOpen={isOpenModal.isOpen} onClose={() => setOpenModal({ isOpen: false, mode: 'add', blogId: null })} title={isOpenModal.mode === 'add' ? 'Add Blog' : 'Edit Blog'}>
                        <AddEditBlogs modalState={isOpenModal} setModalState={setOpenModal} />
                    </Modal>
                )
            }
        </div>
    );
};

export default BlogListingScreen;