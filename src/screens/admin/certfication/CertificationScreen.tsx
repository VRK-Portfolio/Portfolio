'use client';
import Modal from "@/components/ui/modal/Modal";
import { useState } from "react";
import CertificationComponent from "@/components/site/certifications/Certification";
import AddEditCertification from "@/components/admin/certficiation/AddEditCertification";

const CertificationScreen = () => {
    const [isOpenModal, setOpenModal] = useState<{
        isOpen: boolean,
        mode: 'add' | 'edit',
        certificationId?: string | null,
    }>(
        {
            isOpen: false,
            mode: 'add',
            certificationId: null,
        }
    );

    return (
        <>
            <CertificationComponent modalOpen={(id?: string) => setOpenModal({ isOpen: true, mode: id ? 'edit' : 'add', certificationId: id ?? null })} type="admin" />

            {
                isOpenModal.isOpen && (
                    <Modal isOpen={isOpenModal.isOpen} onClose={() => setOpenModal({ isOpen: false, mode: 'add', certificationId: null })} title={isOpenModal.mode === 'add' ? 'Add Certification' : 'Edit Certification'}>
                        <AddEditCertification modalState={isOpenModal} setModalState={setOpenModal} />
                    </Modal>
                )
            }
        </>
    );
};

export default CertificationScreen;
