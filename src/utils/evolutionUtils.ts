import {
	Civilization,
	CivilizationStage,
	ResourceSource,
	ResourceSourceType,
	Vector2,
} from "../types";

// Tamanho do mundo (grid)
export const WORLD_SIZE = 50;

// Cores para diferentes estágios de civilização
export const CIVILIZATION_COLORS = [
	"#94a3b8", // Primitiva - Cinza
	"#84cc16", // Agrícola - Verde
	"#eab308", // Medieval - Amarelo
	"#f97316", // Industrial - Laranja
	"#ec4899", // Moderna - Rosa
];

// Acrescentar constantes para controle populacional
export const MAX_POPULATION_PER_TERRITORY = 10000; // População máxima sustentável por território
export const GLOBAL_MAX_POPULATION = 50000000; // Limite máximo global de população para uma civilização

// Constantes para sistema de recursos
export const MAX_RESOURCES_PER_TERRITORY = 5000; // Recursos máximos por território
export const BASE_TERRITORY_PRODUCTION = 100; // Produção base de recursos por território
export const RESOURCE_CONSUMPTION_PER_1000_POP = 2; // Consumo de recursos por 1000 habitantes
export const RESOURCE_DEPLETION_RATE = 0.02; // Taxa de esgotamento de recursos por território por turno

// Requisitos de população para cada estágio
const STAGE_POPULATION_REQUIREMENTS = [
	0, // PRIMITIVE: não há requisito
	5000, // AGRICULTURAL: 5.000 habitantes
	20000, // MEDIEVAL: 20.000 habitantes
	100000, // INDUSTRIAL: 100.000 habitantes
	500000, // MODERN: 500.000 habitantes
];

// Requisitos de recursos para cada estágio
const STAGE_RESOURCE_REQUIREMENTS = [
	0, // PRIMITIVE: não há requisito
	500, // AGRICULTURAL: 500 recursos
	2000, // MEDIEVAL: 2.000 recursos
	10000, // INDUSTRIAL: 10.000 recursos
	50000, // MODERN: 50.000 recursos
];

// Requisitos de idade para cada estágio (em turnos)
const STAGE_AGE_REQUIREMENTS = [
	0, // PRIMITIVE: não há requisito
	30, // AGRICULTURAL: 30 turnos
	100, // MEDIEVAL: 100 turnos
	200, // INDUSTRIAL: 200 turnos
	350, // MODERN: 350 turnos
];

// Tamanho da célula para spatial hashing
const SPATIAL_CELL_SIZE = 5;

// Cache global de posições ocupadas
const occupiedPositionsCache = new Set<string>();

// Função para atualizar o cache de posições ocupadas
export const updateOccupiedPositionsCache = (
	civilizations: Civilization[]
): void => {
	occupiedPositionsCache.clear();

	civilizations.forEach((civ) => {
		civ.territories.forEach((territory) => {
			occupiedPositionsCache.add(`${territory[0]},${territory[1]}`);
		});
	});
};

// Classe para gerenciar o spatial hashing
class SpatialHash {
	private grid: Map<string, number[]> = new Map();

	constructor() {
		this.clear();
	}

	// Limpar o grid
	clear(): void {
		this.grid.clear();
	}

	// Converter posição para chave de célula
	private getCellKey(pos: Vector2): string {
		const cellX = Math.floor(pos[0] / SPATIAL_CELL_SIZE);
		const cellY = Math.floor(pos[1] / SPATIAL_CELL_SIZE);
		return `${cellX},${cellY}`;
	}

	// Adicionar entidade à hash
	add(pos: Vector2, id: number): void {
		const key = this.getCellKey(pos);
		if (!this.grid.has(key)) {
			this.grid.set(key, []);
		}
		this.grid.get(key)!.push(id);
	}

	// Obter entidades próximas a uma posição
	getNearby(pos: Vector2, radius: number = 1): number[] {
		const result = new Set<number>();
		const centerCellX = Math.floor(pos[0] / SPATIAL_CELL_SIZE);
		const centerCellY = Math.floor(pos[1] / SPATIAL_CELL_SIZE);
		const cellRadius = Math.ceil(radius / SPATIAL_CELL_SIZE);

		// Verificar células vizinhas dentro do raio especificado
		for (let dx = -cellRadius; dx <= cellRadius; dx++) {
			for (let dy = -cellRadius; dy <= cellRadius; dy++) {
				const key = `${centerCellX + dx},${centerCellY + dy}`;
				if (this.grid.has(key)) {
					this.grid.get(key)!.forEach((id) => result.add(id));
				}
			}
		}

		return Array.from(result);
	}
}

// Instância singleton para spatial hashing
const spatialHashCivs = new SpatialHash();
const spatialHashResources = new SpatialHash();

// Função para atualizar os spatial hashes
export const updateSpatialHashes = (
	civilizations: Civilization[],
	resourceSources: ResourceSource[]
): void => {
	// Limpar hashes
	spatialHashCivs.clear();
	spatialHashResources.clear();

	// Adicionar civilizações
	civilizations.forEach((civ) => {
		civ.territories.forEach((pos) => {
			spatialHashCivs.add(pos, civ.id);
		});
	});

	// Adicionar fontes de recursos
	resourceSources.forEach((source, index) => {
		spatialHashResources.add(source.position, index);
	});
};

// Função para gerar uma cor aleatória
export const getRandomColor = (): string => {
	return `#${Math.floor(Math.random() * 16777215)
		.toString(16)
		.padStart(6, "0")}`;
};

// Verifica se uma posição está dentro dos limites do mundo
export const isWithinBounds = (pos: Vector2): boolean => {
	return (
		pos[0] >= 0 && pos[0] < WORLD_SIZE && pos[1] >= 0 && pos[1] < WORLD_SIZE
	);
};

// Gera uma posição aleatória dentro do mundo
export const getRandomPosition = (): Vector2 => {
	return [
		Math.floor(Math.random() * WORLD_SIZE),
		Math.floor(Math.random() * WORLD_SIZE),
	];
};

// Verifica se uma posição está livre de outras civilizações
export const isPositionFree = (
	pos: Vector2,
	civilizations: Civilization[]
): boolean => {
	const posKey = `${pos[0]},${pos[1]}`;

	// Se o cache estiver vazio, inicializá-lo
	if (occupiedPositionsCache.size === 0) {
		updateOccupiedPositionsCache(civilizations);
	}

	// Verificar no cache - operação O(1)
	return !occupiedPositionsCache.has(posKey);
};

// Obtém posições vizinhas disponíveis (versão otimizada)
export const getAvailableNeighbors = (
	civ: Civilization,
	civilizations: Civilization[]
): Vector2[] => {
	const directions: Vector2[] = [
		[0, 1],
		[1, 0],
		[0, -1],
		[-1, 0],
		[1, 1],
		[-1, -1],
		[1, -1],
		[-1, 1],
	];

	const neighbors: Vector2[] = [];
	const checkedPositions = new Set<string>();

	// Se o cache estiver vazio, inicializá-lo
	if (occupiedPositionsCache.size === 0) {
		updateOccupiedPositionsCache(civilizations);
	}

	// Limitar a verificação a apenas 5 territórios aleatórios se a civ for grande
	const territoriesToCheck =
		civ.territories.length > 20
			? civ.territories.sort(() => 0.5 - Math.random()).slice(0, 20)
			: civ.territories;

	territoriesToCheck.forEach((territory) => {
		directions.forEach((dir) => {
			const newPos: Vector2 = [
				territory[0] + dir[0],
				territory[1] + dir[1],
			];
			const posKey = `${newPos[0]},${newPos[1]}`;

			// Evitar verificar a mesma posição duas vezes
			if (!checkedPositions.has(posKey)) {
				checkedPositions.add(posKey);

				if (
					isWithinBounds(newPos) &&
					!occupiedPositionsCache.has(posKey) &&
					!neighbors.some(
						(n) => n[0] === newPos[0] && n[1] === newPos[1]
					)
				) {
					neighbors.push(newPos);
				}
			}
		});
	});

	return neighbors;
};

// Função para calcular o quadrado da distância euclidiana entre dois pontos
// É mais eficiente que Math.sqrt para comparações
export const distanceSquared = (a: Vector2, b: Vector2): number => {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
};

// Calcula o bônus de recursos com base nas fontes de recursos descobertas
export const calculateResourceBonus = (
	civ: Civilization,
	resourceSources: ResourceSource[]
): number => {
	if (
		!resourceSources ||
		resourceSources.length === 0 ||
		!civ.discoveredSources ||
		civ.discoveredSources.length === 0
	) {
		return 0;
	}

	let totalBonus = 0;

	// Para cada fonte de recurso descoberta pela civilização
	civ.discoveredSources.forEach((sourceIndex) => {
		if (sourceIndex >= 0 && sourceIndex < resourceSources.length) {
			const source = resourceSources[sourceIndex];

			// Calcular o multiplicador baseado no tipo de fonte e no estágio da civilização
			let typeMultiplier = 1.0;

			switch (source.type) {
				case ResourceSourceType.FOREST:
					// Florestas beneficiam mais civilizações primitivas e agrícolas
					typeMultiplier =
						civ.stage <= CivilizationStage.AGRICULTURAL ? 2.0 : 1.0;
					break;

				case ResourceSourceType.MINERALS:
					// Minerais beneficiam mais civilizações medievais e industriais
					typeMultiplier =
						civ.stage === CivilizationStage.MEDIEVAL ||
						civ.stage === CivilizationStage.INDUSTRIAL
							? 2.0
							: 1.0;
					break;

				case ResourceSourceType.OIL:
					// Petróleo beneficia mais civilizações industriais e modernas
					typeMultiplier =
						civ.stage >= CivilizationStage.INDUSTRIAL ? 2.0 : 0.5;
					break;

				case ResourceSourceType.FERTILE_LAND:
					// Terra fértil beneficia todas as civilizações
					typeMultiplier = 1.5;
					break;
			}

			// Calcular bônus total para esta fonte
			// Fórmula: Riqueza da fonte * Multiplicador de tipo * (1 + bônus de estágio)
			const stageBonus = 0.1 * civ.stage; // 0 para primitivo, 0.4 para moderno
			const sourceBonus =
				source.richness * typeMultiplier * (1 + stageBonus);

			totalBonus += sourceBonus;
		}
	});

	return totalBonus;
};

// Encontra fontes de recursos próximas a uma civilização (versão otimizada)
export const findNearbyResourceSources = (
	civ: Civilization,
	resourceSources: ResourceSource[],
	maxDistance: number = 5
): ResourceSource[] => {
	// Se a civ não tiver territórios, retornar vazio
	if (civ.territories.length === 0) return [];

	// Conjunto para armazenar IDs únicos de fontes próximas
	const nearbySourceIds = new Set<number>();

	// Para limitar o número de territórios verificados em civs grandes
	const MAX_TERRITORIES_TO_CHECK = 10;

	// Selecionar territórios para verificar (todos se poucos, amostra se muitos)
	const territoriesToCheck =
		civ.territories.length > MAX_TERRITORIES_TO_CHECK
			? civ.territories
					.sort(() => 0.5 - Math.random())
					.slice(0, MAX_TERRITORIES_TO_CHECK)
			: civ.territories;

	// Para cada território selecionado, verificar fontes próximas
	territoriesToCheck.forEach((territory) => {
		// Obter IDs de recursos próximos usando spatial hash
		const nearbyIds = spatialHashResources.getNearby(
			territory,
			maxDistance
		);

		// Adicionar ao conjunto para garantir unicidade
		nearbyIds.forEach((id) => nearbySourceIds.add(id));
	});

	// Mapear IDs para objetos ResourceSource
	return Array.from(nearbySourceIds)
		.map((id) => resourceSources[id])
		.filter((source) => source !== undefined);
};

// Cria uma nova civilização
export const createCivilization = (
	id: number,
	position: Vector2
): Civilization => {
	const color = getRandomColor();

	return {
		id,
		position,
		color,
		stage: CivilizationStage.PRIMITIVE,
		size: 1,
		population: 1000, // Aumentando a população inicial para 1.000 (um pequeno clã ou vila)
		resourceLevel: 50, // Aumentando recursos iniciais para 50
		expansionRate: 0.1,
		territories: [position],
		age: 0,
		birthRate: 0.03, // Taxa de natalidade inicial mais realista (3%)
		mortalityRate: 0.015, // Taxa de mortalidade inicial (1.5%)
		conflictCount: 0, // Sem conflitos iniciais
		resourceEfficiency: 1.0, // Nova propriedade: eficiência de produção/consumo de recursos
		territoryResources: {
			[position.toString()]: MAX_RESOURCES_PER_TERRITORY,
		}, // Inicializar recursos do território
		discoveredSources: [], // Inicializar com nenhuma fonte descoberta
		resourceProduction: 0, // Inicializar produção de recursos
		resourceConsumption: 0, // Inicializar consumo de recursos
	};
};

// Calcular custo de expansão baseado no estágio e tamanho atual
export const calculateExpansionCost = (civ: Civilization): number => {
	// Base: 50 recursos
	// Fator de estágio: aumenta 50% por estágio
	// Fator de tamanho: escala logaritmicamente com o tamanho
	const baseCost = 50;
	const stageFactor = 1 + civ.stage * 0.5;
	const sizeFactor = Math.log10(civ.size + 10) / Math.log10(10);

	return Math.floor(baseCost * stageFactor * sizeFactor);
};

// Função para atualizar a população de uma civilização
export const updatePopulation = (civ: Civilization): Civilization => {
	const newCiv = structuredClone(civ);

	// Capacidade de suporte com base no número de territórios e estágio tecnológico
	const techFactor = 0.5 + newCiv.stage * 0.5; // 0.5 para primitivo, 2.5 para moderno
	const carryingCapacity = Math.min(
		newCiv.territories.length * MAX_POPULATION_PER_TERRITORY * techFactor,
		GLOBAL_MAX_POPULATION
	);

	// CÁLCULO DA TAXA DE NATALIDADE EFETIVA
	const modernizationFactor = 1 - newCiv.stage * 0.05;
	const densityFactor = Math.max(0, 1 - newCiv.population / carryingCapacity);
	const resourceFactor = Math.min(
		1,
		newCiv.resourceLevel / (newCiv.population / 1000) / 10
	);

	const effectiveBirthRate =
		newCiv.birthRate * modernizationFactor * densityFactor * resourceFactor;

	// CÁLCULO DA TAXA DE MORTALIDADE EFETIVA
	const baseMortalityReduction = newCiv.stage * 0.15;
	const resourceMortalityFactor = Math.max(
		1,
		1.5 - newCiv.resourceLevel / (newCiv.population / 500)
	);
	const recentConflictFactor = Math.min(2, 1 + newCiv.conflictCount * 0.001);
	const overpopulationFactor =
		newCiv.population > carryingCapacity * 0.8
			? 1 + (newCiv.population / carryingCapacity - 0.8) * 2
			: 1;

	const effectiveMortalityRate = Math.max(
		0.005,
		newCiv.mortalityRate *
			(1 - baseMortalityReduction) *
			resourceMortalityFactor *
			recentConflictFactor *
			overpopulationFactor
	);

	// CÁLCULO DA ALTERAÇÃO DE POPULAÇÃO
	const populationGrowth = Math.floor(newCiv.population * effectiveBirthRate);
	const populationDecline = Math.floor(
		newCiv.population * effectiveMortalityRate
	);
	const netPopulationChange = populationGrowth - populationDecline;

	// Atualizar população
	newCiv.population = Math.max(
		1,
		Math.min(newCiv.population + netPopulationChange, carryingCapacity)
	);

	// Atualizar taxas de natalidade e mortalidade
	if (resourceFactor < 0.8 || densityFactor < 0.7) {
		newCiv.birthRate = Math.max(0.01, newCiv.birthRate * 0.99);
	} else if (newCiv.resourceProduction > newCiv.resourceConsumption * 1.5) {
		newCiv.birthRate = Math.min(0.04, newCiv.birthRate * 1.01);
	}

	if (recentConflictFactor > 1.3) {
		newCiv.mortalityRate = Math.min(0.03, newCiv.mortalityRate * 1.02);
	} else if (resourceMortalityFactor > 1.2) {
		newCiv.mortalityRate = Math.min(0.025, newCiv.mortalityRate * 1.01);
	} else {
		newCiv.mortalityRate = Math.max(0.005, newCiv.mortalityRate * 0.995);
	}

	return newCiv;
};

// Função para atualizar os recursos de uma civilização
export const updateResources = (
	civ: Civilization,
	resourceSources: ResourceSource[]
): Civilization => {
	const newCiv = structuredClone(civ);

	// Calcular capacidade máxima de recursos
	const resourceCapacity =
		newCiv.territories.length * MAX_RESOURCES_PER_TERRITORY;

	// Inicializar a produção de recursos
	let totalResourceProduction = 0;

	// Garantir que novos territórios tenham recursos inicializados
	newCiv.territories.forEach((territory) => {
		const territoryKey = territory.toString();
		if (newCiv.territoryResources[territoryKey] === undefined) {
			newCiv.territoryResources[territoryKey] =
				MAX_RESOURCES_PER_TERRITORY;
		}
	});

	// Calcular produção por território
	for (const territory of newCiv.territories) {
		const territoryKey = territory.toString();
		const territoryFertility =
			newCiv.territoryResources[territoryKey] /
			MAX_RESOURCES_PER_TERRITORY;

		// Calcular produção
		const territoryProduction = Math.floor(
			BASE_TERRITORY_PRODUCTION *
				(0.5 + newCiv.stage * 0.2) *
				territoryFertility *
				newCiv.resourceEfficiency
		);

		totalResourceProduction += territoryProduction;

		// Aplicar esgotamento do território
		newCiv.territoryResources[territoryKey] = Math.max(
			MAX_RESOURCES_PER_TERRITORY * 0.2,
			newCiv.territoryResources[territoryKey] *
				(1 - RESOURCE_DEPLETION_RATE * (0.5 + newCiv.stage * 0.1))
		);
	}

	// Adicionar bônus de fontes de recursos descobertas
	const resourceBonus = calculateResourceBonus(newCiv, resourceSources);
	totalResourceProduction += resourceBonus;

	// Armazenar produção total
	newCiv.resourceProduction = totalResourceProduction;

	// Calcular consumo de recursos
	const consumptionFactor = 0.8 + newCiv.stage * 0.4;
	const resourceConsumption = Math.floor(
		(newCiv.population / 1000) *
			RESOURCE_CONSUMPTION_PER_1000_POP *
			consumptionFactor
	);

	// Armazenar consumo total
	newCiv.resourceConsumption = resourceConsumption;

	// Atualizar nível de recursos
	const netResourceChange = totalResourceProduction - resourceConsumption;
	newCiv.resourceLevel = Math.max(
		0,
		Math.min(newCiv.resourceLevel + netResourceChange, resourceCapacity)
	);

	return newCiv;
};

// Função para verificar e aplicar evolução ou regressão tecnológica
export const updateEvolution = (civ: Civilization): Civilization => {
	const newCiv = structuredClone(civ);

	// Verificar evolução para próximo estágio
	const nextStage = newCiv.stage + 1;

	if (
		nextStage <= CivilizationStage.MODERN &&
		newCiv.age >= STAGE_AGE_REQUIREMENTS[nextStage] * 0.9 &&
		newCiv.resourceLevel >= STAGE_RESOURCE_REQUIREMENTS[nextStage] &&
		newCiv.population >= STAGE_POPULATION_REQUIREMENTS[nextStage]
	) {
		// Consumir recursos para evolução
		const evolutionCost = STAGE_RESOURCE_REQUIREMENTS[nextStage] * 0.5;
		if (newCiv.resourceLevel >= evolutionCost) {
			newCiv.resourceLevel -= evolutionCost;
			newCiv.stage = nextStage as CivilizationStage;
			newCiv.resourceEfficiency *= 1.1;
		}
	}

	// Verificar possível regressão
	if (
		newCiv.stage > CivilizationStage.PRIMITIVE &&
		(newCiv.population <
			STAGE_POPULATION_REQUIREMENTS[newCiv.stage] * 0.5 ||
			newCiv.resourceLevel <
				STAGE_RESOURCE_REQUIREMENTS[newCiv.stage] * 0.4)
	) {
		newCiv.stage = (newCiv.stage - 1) as CivilizationStage;
		newCiv.resourceLevel = Math.floor(newCiv.resourceLevel * 0.8);
		newCiv.resourceEfficiency *= 0.9;
	}

	return newCiv;
};

// Função para verificar e aplicar expansão territorial
export const updateExpansion = (
	civ: Civilization,
	civilizations: Civilization[],
	resourceSources: ResourceSource[]
): Civilization => {
	const newCiv = structuredClone(civ);

	// Verificar se deve expandir
	const shouldExpand =
		newCiv.resourceLevel > calculateExpansionCost(newCiv) &&
		Math.random() < newCiv.expansionRate * (1 + newCiv.stage * 0.1);

	if (!shouldExpand) return newCiv;

	// Obter vizinhos disponíveis (otimizado)
	const availableNeighbors = getAvailableNeighbors(newCiv, civilizations);
	if (availableNeighbors.length === 0) return newCiv;

	let targetPosition: Vector2 | null = null;

	// Encontrar recursos próximos não descobertos (otimizado)
	const nearbyResources = findNearbyResourceSources(
		newCiv,
		resourceSources,
		10
	);

	// Filtrar apenas recursos não descobertos
	const undiscoveredResources = nearbyResources.filter(
		(source) =>
			!newCiv.discoveredSources.includes(
				resourceSources.findIndex(
					(s) =>
						s.position[0] === source.position[0] &&
						s.position[1] === source.position[1]
				)
			)
	);

	// Se há recursos não descobertos próximos, tentar expandir em sua direção
	if (undiscoveredResources.length > 0) {
		// Escolher um recurso aleatório entre os 3 mais próximos
		// (para adicionar variedade nas escolhas de expansão)
		const closestResources = undiscoveredResources
			.map((source) => {
				// Encontrar distância mínima ao quadrado a qualquer território atual
				let minDistSquared = Infinity;
				for (const territory of newCiv.territories) {
					const distSquared = distanceSquared(
						territory,
						source.position
					);
					minDistSquared = Math.min(minDistSquared, distSquared);
				}
				return { source, distanceSquared: minDistSquared };
			})
			.sort((a, b) => a.distanceSquared - b.distanceSquared)
			.slice(0, Math.min(3, undiscoveredResources.length));

		// Escolher um recurso aleatoriamente entre os mais próximos
		const targetResource =
			closestResources[
				Math.floor(Math.random() * closestResources.length)
			].source;

		// Encontrar o melhor vizinho para chegar a este recurso
		let bestNeighbor = null;
		let bestDistanceSquared = Infinity;

		for (const neighbor of availableNeighbors) {
			const distSquared = distanceSquared(
				neighbor,
				targetResource.position
			);

			if (distSquared < bestDistanceSquared) {
				bestDistanceSquared = distSquared;
				bestNeighbor = neighbor;
			}
		}

		if (bestNeighbor) {
			targetPosition = bestNeighbor;
		}
	}

	// Se não escolheu um alvo específico, escolher aleatoriamente
	if (!targetPosition) {
		// Limitar número de vizinhos considerados para melhorar performance
		const candidateNeighbors =
			availableNeighbors.length > 10
				? availableNeighbors
						.sort(() => 0.5 - Math.random())
						.slice(0, 10)
				: availableNeighbors;

		const randomIndex = Math.floor(
			Math.random() * candidateNeighbors.length
		);
		targetPosition = candidateNeighbors[randomIndex];
	}

	// Realizar a expansão
	if (targetPosition) {
		// Adicionar novo território
		newCiv.territories.push(targetPosition);
		newCiv.size = newCiv.territories.length;

		// Inicializar recursos do novo território
		const newTerritoryKey = targetPosition.toString();
		newCiv.territoryResources[newTerritoryKey] =
			MAX_RESOURCES_PER_TERRITORY;

		// Custo de expansão
		const expansionCost = calculateExpansionCost(newCiv);
		newCiv.resourceLevel = Math.max(
			0,
			newCiv.resourceLevel - expansionCost
		);
	}

	return newCiv;
};

// Função principal que atualiza uma civilização (refatorada)
export const updateCivilization = (
	civ: Civilization,
	civilizations: Civilization[],
	resourceSources: ResourceSource[] = []
): Civilization => {
	// Criar nova instância da civilização com clone profundo
	let newCiv = structuredClone(civ);

	// Garantir que as propriedades sempre existam
	if (!newCiv.territoryResources) {
		newCiv.territoryResources = {};
	}

	if (!newCiv.discoveredSources) {
		newCiv.discoveredSources = [];
	}

	// Resetar contadores de produção e consumo
	newCiv.resourceProduction = 0;
	newCiv.resourceConsumption = 0;

	// Incrementar idade
	newCiv.age += 1;

	// Atualizar população
	newCiv = updatePopulation(newCiv);

	// Atualizar recursos
	newCiv = updateResources(newCiv, resourceSources);

	// Verificar evolução
	newCiv = updateEvolution(newCiv);

	// Verificar expansão
	newCiv = updateExpansion(newCiv, civilizations, resourceSources);

	return newCiv;
};
