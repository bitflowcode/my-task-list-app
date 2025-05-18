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
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm text-gray-600">Ordenar por:</span>
      <div className="flex gap-2">
        <button
          onClick={() => cambiarOrdenamiento('orden')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'orden'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => cambiarOrdenamiento('alfabetico')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'alfabetico'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alfabético
        </button>
        <button
          onClick={() => cambiarOrdenamiento('fecha')}
          className={`px-3 py-1 rounded text-sm ${
            ordenActual === 'fecha'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Fecha límite
        </button>
      </div>
    </div>
  );
} 