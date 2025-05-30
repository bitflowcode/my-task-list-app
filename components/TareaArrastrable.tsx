import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TareaItem from './TareaItem';

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
  orden: number;
};

type Props = {
  tarea: Tarea;
  index: number;
  onCompletar: () => void;
  onEditar: (id: string, nuevoTitulo: string, nuevaFecha?: string | null, nuevaCarpeta?: string) => void;
  onBorrar: () => void;
  carpetas: string[];
  onActualizarCarpetas: () => void;
};

export function TareaArrastrable(props: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: props.tarea.id,
    // Aumentamos sensibilidad para móvil y bloqueamos scroll vertical durante drag
    data: {
      type: 'tarea',
      tarea: props.tarea
    }
  });

  // Mejorar las transiciones con animaciones más suaves
  const style = {
    transform: CSS.Transform.toString(transform),
    // Transición personalizada para movimientos más suaves
    transition: transition ? 'transform 150ms cubic-bezier(0.2, 0, 0, 1)' : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
    // Usar transformaciones con aceleración por hardware
    willChange: isDragging ? 'transform' : 'auto',
    // Agregar una pequeña escala durante el arrastre para mejor feedback visual
    scale: isDragging ? 1.02 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`relative bg-white dark:bg-card-dark shadow dark:shadow-black/20 rounded p-1 mb-2 ${isDragging ? 'ring-2 ring-blue-400 dark:ring-primary-dark shadow-lg' : ''}`}
    >
      {/* Área de agarre visible para ayudar a identificar la funcionalidad */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-8 bg-gray-100 dark:bg-gray-800 rounded-l flex items-center justify-center cursor-grab active:cursor-grabbing"
        {...listeners}
      >
        <span className="text-gray-500 dark:text-gray-300">⋮⋮</span>
      </div>
      
      {/* Contenido principal con margen para el área de agarre */}
      <div className="relative ml-8">
        <TareaItem {...props} />
      </div>
    </div>
  );
} 