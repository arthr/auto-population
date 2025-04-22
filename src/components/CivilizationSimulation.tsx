import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { Stats } from "@react-three/drei";
import { useSimulationStore } from "../stores/simulationStore";
import { Controls } from "./Controls";
import { WorldMap } from "./WorldMap";

interface CivilizationSimulationProps {
	initialCivilizationsCount?: number;
	tickSpeed?: number;
}

export function CivilizationSimulation({
	initialCivilizationsCount = 10,
	tickSpeed = 200,
}: CivilizationSimulationProps) {
	// Usar o store zustand
	const { start, pause, reset, initialize, setTickSpeed } =
		useSimulationStore();

	// Inicializar a simulação quando o componente montar
	useEffect(() => {
		// Configurar velocidade de tick
		setTickSpeed(tickSpeed);

		// Inicializar o mundo
		initialize(initialCivilizationsCount);

		// Cleanup ao desmontar
		return () => {
			// Parar a simulação para limpar intervalos
			pause();
		};
	}, [initialCivilizationsCount, initialize, pause, setTickSpeed, tickSpeed]);

	return (
		<div className="relative w-full h-full">
			<Canvas
				camera={{
					position: [50, 80, 50],
					fov: 45,
					near: 0.1,
					far: 1000,
				}}
				linear
				shadows>
				{/* Monitor de performance */}
				<Stats className="stats-monitor" />

				<Suspense fallback={null}>
					<WorldMap />
				</Suspense>
			</Canvas>

			<Controls onStart={start} onPause={pause} onReset={reset} />
		</div>
	);
}
