type TipoOrdenamiento = 'orden' | 'alfabetico' | 'fecha';

type Props = {
  tipoActual: TipoOrdenamiento;
  onCambiar: (tipo: TipoOrdenamiento) => void;
};

export default function OrdenamientoTareas({ tipoActual, onCambiar }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onCambiar('orden')}
        className={`px-2 py-1 rounded text-xs ${
          tipoActual === 'orden'
            ? 'bg-blue-600 dark:bg-blue-700 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        Manual
      </button>
      <button
        onClick={() => onCambiar('alfabetico')}
        className={`px-2 py-1 rounded text-xs ${
          tipoActual === 'alfabetico'
            ? 'bg-blue-600 dark:bg-blue-700 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        A-Z
      </button>
      <button
        onClick={() => onCambiar('fecha')}
        className={`px-2 py-1 rounded text-xs ${
          tipoActual === 'fecha'
            ? 'bg-blue-600 dark:bg-blue-700 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        Fecha
      </button>
    </div>
  );
} 