'use client';
import Modal from "@/components/ui/modal/Modal";
import { useState } from "react";
import { MyExperienceComponent } from "@/components/site/my-experience/MyExperience";
import AddEditExperience from "@/components/admin/experience/AddEditExperience";

const ExperienceScreen = () => {
    const [isOpenModal, setOpenModal] = useState<{
        isOpen: boolean,
        mode: 'add' | 'edit',
        experienceId?: string | null,
    }>(
        {
            isOpen: false,
            mode: 'add',
            experienceId: null,
        }
    );

    return (
        <>
            <MyExperienceComponent modalOpen={(id?: string) => setOpenModal({ isOpen: true, mode: id ? 'edit' : 'add', experienceId: id ?? null })} type="admin" />

            {
                isOpenModal.isOpen && (
                    <Modal className="min-w-lg max-w-3xl" isOpen={isOpenModal.isOpen} onClose={() => setOpenModal({ isOpen: false, mode: 'add', experienceId: null })} title={isOpenModal.mode === 'add' ? 'Add Experience' : 'Edit Experience'}>
                        <AddEditExperience modalState={isOpenModal} setModalState={setOpenModal} />
                    </Modal>
                )
            }
        </>
    );
};

export default ExperienceScreen;
