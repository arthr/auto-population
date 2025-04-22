import { CivilizationStage } from "../types";
import { CIVILIZATION_COLORS } from "../utils/evolutionUtils";
import { useSimulationStore } from "../stores/simulationStore";

interface ControlsProps {
	onStart: () => void;
	onPause: () => void;
	onReset: () => void;
}

export function Controls({ onStart, onPause, onReset }: ControlsProps) {
	// Usar o store zustand
	const {
		civilizations,
		dominantCivilization,
		tickCount,
		isRunning,
		conflicts,
		showAllTooltips,
		toggleAllTooltips,
	} = useSimulationStore();

	// Cálculo simplificado para estágios
	const stageCount: Record<number, number> = {};

	if (dominantCivilization) {
		// Adiciona o estágio da civilização dominante como exemplo
		stageCount[dominantCivilization.stage] = 1;
	}

	return (
		<div className="absolute top-0 left-0 p-4 bg-gray-900 bg-opacity-80 text-white rounded-br-lg max-w-xs">
			<h2 className="text-xl font-bold mb-2">
				Simulação de Civilizações
			</h2>

			<div className="space-y-2 mb-4">
				<div className="flex justify-between">
					<span>Civilizações:</span>
					<span>{civilizations.length}</span>
				</div>
				<div className="flex justify-between">
					<span>Tempo:</span>
					<span>{tickCount} anos</span>
				</div>
				<div className="flex justify-between">
					<span>Conflitos Ativos:</span>
					<span className="text-red-400">{conflicts.length}</span>
				</div>
			</div>

			<div className="flex space-x-2 mb-4">
				{isRunning ? (
					<button
						onClick={onPause}
						className="bg-amber-500 hover:bg-amber-600 text-white py-1 px-3 rounded flex-1">
						Pausar
					</button>
				) : (
					<button
						onClick={onStart}
						className="bg-emerald-500 hover:bg-emerald-600 text-white py-1 px-3 rounded flex-1">
						Iniciar
					</button>
				)}

				<button
					onClick={onReset}
					className="bg-sky-500 hover:bg-sky-600 text-white py-1 px-3 rounded flex-1">
					Reiniciar
				</button>
			</div>

			{/* Botão para exibir/ocultar tooltips */}
			<div className="mb-4">
				<button
					onClick={toggleAllTooltips}
					className={`w-full py-1 px-3 rounded text-white ${
						showAllTooltips
							? "bg-purple-500 hover:bg-purple-600"
							: "bg-gray-600 hover:bg-gray-700"
					}`}>
					{showAllTooltips
						? "Ocultar Informações"
						: "Mostrar Informações"}
				</button>
			</div>

			{dominantCivilization && (
				<div className="p-2 bg-gray-800 rounded">
					<h3 className="text-lg font-semibold mb-1">
						Civilização Dominante
					</h3>
					<div className="space-y-1">
						<div className="flex items-center">
							<div
								className="w-4 h-4 mr-2 rounded-full"
								style={{
									backgroundColor: dominantCivilization.color,
								}}
							/>
							<span>ID: {dominantCivilization.id}</span>
						</div>
						<div className="flex justify-between">
							<span>Estágio:</span>
							<span>
								{CivilizationStage[dominantCivilization.stage]}
							</span>
						</div>
						<div className="flex justify-between">
							<span>População:</span>
							<span>
								{dominantCivilization.population.toLocaleString()}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Territórios:</span>
							<span>{dominantCivilization.size}</span>
						</div>
						<div className="flex justify-between">
							<span>Idade:</span>
							<span>{dominantCivilization.age} anos</span>
						</div>
						<div className="flex justify-between">
							<span>Recursos:</span>
							<span>
								{Math.floor(
									dominantCivilization.resourceLevel
								).toLocaleString()}
							</span>
						</div>
					</div>
				</div>
			)}

			<div className="mt-4">
				<h3 className="text-sm font-semibold mb-1">Legenda</h3>
				<div className="grid grid-cols-2 gap-1">
					{Object.values(CivilizationStage)
						.filter((v) => typeof v === "number")
						.map((stage) => (
							<div key={stage} className="flex items-center">
								<div
									className="w-3 h-3 mr-1 rounded-sm"
									style={{
										backgroundColor:
											CIVILIZATION_COLORS[
												stage as number
											],
									}}
								/>
								<span className="text-xs">
									{CivilizationStage[stage as number]}
								</span>
							</div>
						))}
				</div>
				<div className="mt-2 text-xs">
					<p>🏛️ Capitais são representadas por torres mais altas</p>
					<p>
						⚔️ <span className="text-red-400">Conflitos</span> são
						indicados por símbolos vermelhos
					</p>
				</div>
			</div>
		</div>
	);
}
