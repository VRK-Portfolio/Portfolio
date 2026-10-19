import { useRef, useEffect } from "react";
import './modal.css';

interface ModalProps {
    onClose?: () => void;
    children?: React.ReactNode;
    className?: string;
    isOpen?: boolean;
    title?: string;
}
const Modal = ({ onClose, children, className, isOpen, title }: ModalProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }
    }, [isOpen]);


    return (
        <dialog className={`cmp-modal ${className ?? ''}`} ref={dialogRef} onClose={onClose}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 font-semibold text-xl"
                >
                    &times;
                </button>
            </div>
            <div>{children}</div>
        </dialog>
    );
}

export default Modal;