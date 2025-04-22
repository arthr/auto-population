import { create } from "zustand";
import { World } from "../models/World";
import { Civilization, Conflict, ResourceSource } from "../types";

interface SimulationState {
	// Estado da simulação
	world: World | null;
	civilizations: Civilization[];
	dominantCivilization: Civilization | null;
	tickCount: number;
	isRunning: boolean;
	conflicts: Conflict[];
	resourceSources: ResourceSource[];

	// Configurações
	initialCivilizationsCount: number;
	tickSpeed: number;
	showAllTooltips: boolean;

	// Intervalo para atualização
	intervalId: number | null;

	// Ações
	initialize: (civilizationsCount?: number) => void;
	start: () => void;
	pause: () => void;
	reset: () => void;
	tick: () => void;
	updateState: () => void;
	setTickSpeed: (speed: number) => void;
	toggleAllTooltips: () => void;
}

// Criando o store
export const useSimulationStore = create<SimulationState>((set, get) => ({
	// Estado Inicial
	world: null,
	civilizations: [],
	dominantCivilization: null,
	tickCount: 0,
	isRunning: false,
	conflicts: [],
	resourceSources: [],
	initialCivilizationsCount: 10,
	tickSpeed: 200,
	intervalId: null,
	showAllTooltips: false,

	// Métodos
	initialize: (civilizationsCount) => {
		const count = civilizationsCount ?? get().initialCivilizationsCount;

		// Criar e inicializar o mundo
		const world = new World(count);
		world.initialize();

		set({
			world,
			initialCivilizationsCount: count,
			civilizations: [...world.civilizations],
			dominantCivilization: world.dominantCivilization,
			tickCount: world.tickCount,
			isRunning: world.isRunning,
			conflicts: [...world.conflicts],
			resourceSources: [...world.resourceSources],
		});
	},

	updateState: () => {
		const { world } = get();
		if (!world) return;

		set({
			civilizations: [...world.civilizations],
			dominantCivilization: world.dominantCivilization,
			tickCount: world.tickCount,
			isRunning: world.isRunning,
			conflicts: [...world.conflicts],
			resourceSources: [...world.resourceSources],
		});
	},

	tick: () => {
		const { world } = get();
		if (!world) return;

		world.tick();
		get().updateState();
	},

	start: () => {
		const { world, intervalId, tickSpeed, tick } = get();
		if (!world) return;

		// Iniciar a simulação
		world.start();

		// Limpar intervalo existente
		if (intervalId !== null) {
			window.clearInterval(intervalId);
		}

		// Configurar novo intervalo
		const newIntervalId = window.setInterval(() => {
			tick();
		}, tickSpeed);

		set({
			intervalId: newIntervalId,
			isRunning: true,
		});

		get().updateState();
	},

	pause: () => {
		const { world, intervalId } = get();
		if (!world) return;

		world.pause();

		if (intervalId !== null) {
			window.clearInterval(intervalId);
		}

		set({
			intervalId: null,
			isRunning: false,
		});

		get().updateState();
	},

	reset: () => {
		const { world, intervalId } = get();
		if (!world) return;

		world.reset();

		if (intervalId !== null) {
			window.clearInterval(intervalId);
		}

		set({
			intervalId: null,
			isRunning: false,
		});

		get().updateState();
	},

	setTickSpeed: (speed) => {
		const { isRunning, intervalId, tick } = get();

		set({ tickSpeed: speed });

		// Se estiver rodando, reconfigurar o intervalo com a nova velocidade
		if (isRunning && intervalId !== null) {
			window.clearInterval(intervalId);

			const newIntervalId = window.setInterval(() => {
				tick();
			}, speed);

			set({ intervalId: newIntervalId });
		}
	},

	toggleAllTooltips: () => {
		set((state) => ({ showAllTooltips: !state.showAllTooltips }));
	},
}));
