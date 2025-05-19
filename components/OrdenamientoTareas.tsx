import { useState } from 'react';

type TipoOrdenamiento = 'orden' | 'alfabetico' | 'fecha';

type Props = {
  onCambioOrdenamiento: (tipo: TipoOrdenamiento) => void;
};

export default function OrdenamientoTareas({ onCambioOrdenamiento }: Props) {
  const [ordenActual, setOrdenActual] = useState<TipoOrdenamiento>('orden');

  const cambiarOrdenamiento = (nuevoOrden: TipoOrdenamiento) => {
    setOrdenActual(nuevoOrden);
    onCambioOrdenamiento(nuevoOrden);
  };

  return (
    <div className="flex flex-col mb-4">
      <span className="text-sm text-gray-700 dark:text-gray-300 mb-2">Ordenar por:</span>
      <div className="flex gap-2">
        <button
          onClick={() => cambiarOrdenamiento('orden')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'orden'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => cambiarOrdenamiento('alfabetico')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'alfabetico'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Alfabético
        </button>
        <button
          onClick={() => cambiarOrdenamiento('fecha')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'fecha'
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Fecha límite
        </button>
      </div>
    </div>
  );
} 