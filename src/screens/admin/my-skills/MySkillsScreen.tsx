'use client';
import MySkillsComponent from "@/components/site/my-skills/My-Skills";
import Modal from "@/components/ui/modal/Modal";
import AddEditSkills from "../../../components/admin/add-skills/AddEditSkills";
import { useState } from "react";

const MySkillsScreen = () => {
    const [isOpenModal, setOpenModal] = useState<{
        isOpen: boolean,
        mode: 'add' | 'edit',
        skillId?: string | null,
    }>(
        {
            isOpen: false,
            mode: 'add',
            skillId: null,
        }
    );

    return (
        <>
            <MySkillsComponent modalOpen={(id?: string) => setOpenModal({ isOpen: true, mode: id ? 'edit' : 'add', skillId: id ?? null })} type="admin" />

            {
                isOpenModal.isOpen && (
                    <Modal isOpen={isOpenModal.isOpen} onClose={() => setOpenModal({ isOpen: false, mode: 'add', skillId: null })} title={isOpenModal.mode === 'add' ? 'Add Skill' : 'Edit Skill'}>
                        <AddEditSkills modalState={isOpenModal} setModalState={setOpenModal} />
                    </Modal>
                )
            }
        </>
    );
};

export default MySkillsScreen;
