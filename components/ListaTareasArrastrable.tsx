import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MouseSensor,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TareaArrastrable } from '../components/TareaArrastrable';
import { useState } from 'react';

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
  orden: number;
};

type Props = {
  tareas: Tarea[];
  onReordenar: (nuevasTareas: Tarea[]) => void;
  onCompletar: (id: string) => void;
  onEditar: (id: string, nuevoTitulo: string, nuevaFecha?: string | null, nuevaCarpeta?: string) => void;
  onBorrar: (id: string) => void;
  carpetas: string[];
  onActualizarCarpetas: () => void;
};

export default function ListaTareasArrastrable({
  tareas,
  onReordenar,
  onCompletar,
  onEditar,
  onBorrar,
  carpetas,
  onActualizarCarpetas,
}: Props) {
  // Para móvil, necesitamos sensores optimizados:
  const sensors = useSensors(
    // Sensor personalizado de mouse con mayor delay para evitar clicks
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 12, // Reducido para una activación más rápida
      }
    }),
    // Sensor táctil optimizado para móvil
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Reducido para una activación más rápida
        tolerance: 5,
      }
    }),
    // Mantener el sensor de teclado para accesibilidad
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Estado para la tarea que está siendo arrastrada
  const [activeTarea, setActiveTarea] = useState<Tarea | null>(null);

  // Configuración de animación de arrastre personalizada
  const dropAnimationConfig = {
    ...defaultDropAnimation,
    duration: 200, // Más rápida pero aún suave
    easing: 'cubic-bezier(0.2, 0, 0, 1)', // Curva de aceleración suave
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const tarea = tareas.find(t => t.id === active.id);
    if (tarea) {
      setActiveTarea(tarea);
      // Añadir feedback táctil si está disponible (para dispositivos móviles)
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(40); // Vibración sutil de 40ms
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTarea(null);

    if (over && active.id !== over.id) {
      const oldIndex = tareas.findIndex((t) => t.id === active.id);
      const newIndex = tareas.findIndex((t) => t.id === over.id);
      
      const nuevasTareas = arrayMove(tareas, oldIndex, newIndex).map((tarea, index) => ({
        ...tarea,
        orden: index + 1,
      }));
      
      onReordenar(nuevasTareas);
      
      // Feedback táctil al completar la reordenación
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(80);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // Configurar animaciones optimizadas
      autoScroll={{
        enabled: true,
        threshold: {
          x: 0,
          y: 0.2, // Umbral de autoscroll más sensible
        }
      }}
    >
      <SortableContext
        items={tareas.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2 pb-4 touch-pan-y">
          {tareas.map((tarea, index) => (
            activeTarea?.id !== tarea.id && (
              <TareaArrastrable
                key={tarea.id}
                tarea={tarea}
                index={index}
                onCompletar={() => onCompletar(tarea.id)}
                onEditar={onEditar}
                onBorrar={() => onBorrar(tarea.id)}
                carpetas={carpetas}
                onActualizarCarpetas={onActualizarCarpetas}
              />
            )
          ))}
        </ul>
      </SortableContext>
      
      {/* Overlay visual durante el arrastre */}
      <DragOverlay 
        adjustScale={true} 
        dropAnimation={dropAnimationConfig}
      >
        {activeTarea ? (
          <div className="pointer-events-none bg-white dark:bg-gray-800 rounded shadow-2xl dark:shadow-gray-900 scale-105 opacity-90 p-3 w-full max-w-md mx-auto">
            <div className="text-gray-900 dark:text-gray-100 font-semibold text-base truncate">
              {activeTarea.titulo}
            </div>
            {activeTarea.carpeta && (
              <div className="text-sm text-gray-500 dark:text-gray-300 mt-1 truncate">
                Carpeta: {activeTarea.carpeta}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
} 