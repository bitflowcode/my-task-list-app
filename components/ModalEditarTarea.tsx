"use client";

import Modal from "./Modal";
import FormularioTarea from "./FormularioTarea";

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tarea: Tarea | null;
  onEditar: (id: string, titulo: string, fechaLimite: string | null, carpeta?: string) => void;
};

export default function ModalEditarTarea({ isOpen, onClose, tarea, onEditar }: Props) {
  const manejarEdicion = async (id: string, titulo: string, fechaLimite: string | null, carpeta?: string) => {
    await onEditar(id, titulo, fechaLimite, carpeta);
    onClose(); // Cerrar modal después de editar tarea
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Tarea"
    >
      {tarea && (
        <FormularioTarea
          modoEdicion={true}
          tareaParaEditar={tarea}
          onEditar={manejarEdicion}
        />
      )}
    </Modal>
  );
} 