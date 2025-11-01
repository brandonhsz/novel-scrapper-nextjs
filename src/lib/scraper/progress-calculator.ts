/**
 * Estima el número máximo de iteraciones basado en la condición de parada
 * Retorna null si no se puede determinar
 */
export function estimateMaxIterations(stopCondition: string): number | null {
  try {
    // Patrones comunes para estimar el máximo
    // counter < N -> máximo ~N-1
    const lessThanMatch = stopCondition.match(/counter\s*<\s*(\d+)/i);
    if (lessThanMatch) {
      const max = parseInt(lessThanMatch[1], 10);
      return Math.max(1, max - 1);
    }

    // counter <= N -> máximo N
    const lessEqualMatch = stopCondition.match(/counter\s*<=\s*(\d+)/i);
    if (lessEqualMatch) {
      const max = parseInt(lessEqualMatch[1], 10);
      return Math.max(1, max);
    }

    // counter == N -> máximo N
    const equalMatch = stopCondition.match(/counter\s*==\s*(\d+)/i);
    if (equalMatch) {
      const max = parseInt(equalMatch[1], 10);
      return Math.max(1, max);
    }

    // counter != N -> no se puede determinar fácilmente
    // counter > N -> no tiene máximo claro
    // Para estos casos, retornamos null y usamos un estimado conservador

    return null;
  } catch {
    return null;
  }
}

/**
 * Calcula el porcentaje de progreso
 */
export function calculateProgress(
  currentCounter: number,
  stopCondition: string,
): number {
  const maxIterations = estimateMaxIterations(stopCondition);

  if (maxIterations === null) {
    // Si no podemos determinar el máximo, mostramos un progreso basado en el counter
    // Usamos un límite conservador de 1000 para calcular el porcentaje
    return Math.min(100, (currentCounter / 1000) * 100);
  }

  return Math.min(100, (currentCounter / maxIterations) * 100);
}

