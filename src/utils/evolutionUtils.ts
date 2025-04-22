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
export const BASE_TERRITORY_PRODUCTION = 10; // Produção base de recursos por território
export const RESOURCE_CONSUMPTION_PER_1000_POP = 2; // Consumo de recursos por 1000 habitantes
export const RESOURCE_DEPLETION_RATE = 0.02; // Taxa de esgotamento de recursos por território por turno

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
	return !civilizations.some((civ) =>
		civ.territories.some(
			(territory) => territory[0] === pos[0] && territory[1] === pos[1]
		)
	);
};

// Obtém posições vizinhas disponíveis
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

	civ.territories.forEach((territory) => {
		directions.forEach((dir) => {
			const newPos: Vector2 = [
				territory[0] + dir[0],
				territory[1] + dir[1],
			];
			if (
				isWithinBounds(newPos) &&
				isPositionFree(newPos, civilizations) &&
				!neighbors.some((n) => n[0] === newPos[0] && n[1] === newPos[1])
			) {
				neighbors.push(newPos);
			}
		});
	});

	return neighbors;
};

// Calcula o bônus de recursos com base nas fontes de recursos descobertas
export const calculateResourceBonus = (
	civ: Civilization,
	resourceSources: ResourceSource[]
): number => {
	if (
		!resourceSources ||
		resourceSources.length === 0 ||
		!civ.discoveredSources
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

// Atualiza uma civilização com base em suas características
export const updateCivilization = (
	civ: Civilization,
	civilizations: Civilization[],
	resourceSources: ResourceSource[] = []
): Civilization => {
	const newCiv = {
		...civ,
		// Garante que a propriedade territoryResources sempre exista
		territoryResources: civ.territoryResources || {},
		// Garante que a propriedade discoveredSources sempre exista
		discoveredSources: civ.discoveredSources || [],
		// Garante que as propriedades de produção e consumo existam
		resourceProduction: 0, // Será calculado nesta função
		resourceConsumption: 0, // Será calculado nesta função
	};

	// Envelhecer a civilização
	newCiv.age += 1;

	// ATUALIZAÇÃO DE POPULAÇÃO
	// Capacidade de suporte com base no número de territórios e estágio tecnológico
	// Estágios mais avançados permitem maior densidade populacional
	const techFactor = 0.5 + newCiv.stage * 0.5; // 0.5 para primitivo, 2.5 para moderno
	const carryingCapacity = Math.min(
		newCiv.territories.length * MAX_POPULATION_PER_TERRITORY * techFactor,
		GLOBAL_MAX_POPULATION
	);

	// Calcular crescimento da população usando um modelo logístico
	// A taxa diminui à medida que a civilização fica mais avançada (modelando taxa de fertilidade mais baixa em sociedades modernas)
	const modernizationFactor = 1 - newCiv.stage * 0.05;

	// Fator de densidade populacional (diminui o crescimento quando se aproxima da capacidade)
	const densityFactor = Math.max(0, 1 - newCiv.population / carryingCapacity);

	// Taxa efetiva de crescimento
	const effectiveGrowthRate =
		newCiv.birthRate * modernizationFactor * densityFactor;

	// Aplicar taxa de crescimento populacional usando o modelo logístico
	// Crescimento é proporcional à população atual e ao espaço disponível
	// Quando a população se aproxima da capacidade de suporte, o crescimento desacelera
	const populationGrowth = Math.floor(
		newCiv.population * effectiveGrowthRate
	);
	newCiv.population = Math.min(
		newCiv.population + populationGrowth,
		carryingCapacity
	);

	// ATUALIZAÇÃO DO SISTEMA DE RECURSOS
	// 1. Calcular o limite máximo de recursos baseado no território
	const resourceCapacity =
		newCiv.territories.length * MAX_RESOURCES_PER_TERRITORY;

	// 2. Produção de recursos: cada território produz recursos
	let totalResourceProduction = 0;

	// Inicializar territoryResources para novos territórios
	newCiv.territories.forEach((territory) => {
		const territoryKey = territory.toString();
		if (newCiv.territoryResources[territoryKey] === undefined) {
			newCiv.territoryResources[territoryKey] =
				MAX_RESOURCES_PER_TERRITORY;
		}
	});

	// Calcular produção de recursos por território com base na fertilidade
	for (const territory of newCiv.territories) {
		const territoryKey = territory.toString();
		const territoryFertility =
			newCiv.territoryResources[territoryKey] /
			MAX_RESOURCES_PER_TERRITORY;

		// Produção baseia-se na fertilidade restante do território
		const territoryProduction = Math.floor(
			BASE_TERRITORY_PRODUCTION *
				(0.5 + newCiv.stage * 0.2) * // Bônus de estágio
				territoryFertility * // Fator de fertilidade
				newCiv.resourceEfficiency // Eficiência de recursos
		);

		totalResourceProduction += territoryProduction;

		// Diminuir a fertilidade do território (esgotamento gradual)
		newCiv.territoryResources[territoryKey] = Math.max(
			MAX_RESOURCES_PER_TERRITORY * 0.2, // Mínimo de 20% de fertilidade
			newCiv.territoryResources[territoryKey] *
				(1 - RESOURCE_DEPLETION_RATE * (0.5 + newCiv.stage * 0.1))
		);
	}

	// 2.1 Adicionar bônus de produção de recursos com base nas fontes de recursos
	const resourceBonus = calculateResourceBonus(newCiv, resourceSources);
	totalResourceProduction += resourceBonus;

	// Armazenar a produção total de recursos por tick
	newCiv.resourceProduction = totalResourceProduction;

	// 3. Consumo de recursos baseado na população
	// Estágios mais avançados consomem mais recursos per capita
	const consumptionFactor = 0.8 + newCiv.stage * 0.4; // 0.8 para primitivo, 2.4 para moderno
	const resourceConsumption = Math.floor(
		(newCiv.population / 1000) *
			RESOURCE_CONSUMPTION_PER_1000_POP *
			consumptionFactor
	);

	// Armazenar o consumo total de recursos por tick
	newCiv.resourceConsumption = resourceConsumption;

	// 4. Calcular o balanço líquido de recursos
	const netResourceChange = totalResourceProduction - resourceConsumption;
	newCiv.resourceLevel = Math.max(
		0,
		Math.min(
			newCiv.resourceLevel + netResourceChange,
			resourceCapacity // Limite baseado no território
		)
	);

	// VERIFICAÇÃO DE EVOLUÇÃO
	// Verificar evolução para próximo estágio usando os requisitos definidos
	const nextStage = newCiv.stage + 1;

	if (
		nextStage <= CivilizationStage.MODERN && // Não pode evoluir além de MODERN
		newCiv.age >= STAGE_AGE_REQUIREMENTS[nextStage] * 0.9 && // Um pouco de flexibilidade na idade
		newCiv.resourceLevel >= STAGE_RESOURCE_REQUIREMENTS[nextStage] &&
		newCiv.population >= STAGE_POPULATION_REQUIREMENTS[nextStage]
	) {
		// Consumir recursos para evolução tecnológica
		const evolutionCost = STAGE_RESOURCE_REQUIREMENTS[nextStage] * 0.5;
		if (newCiv.resourceLevel >= evolutionCost) {
			newCiv.resourceLevel -= evolutionCost;
			newCiv.stage = nextStage as CivilizationStage;
			newCiv.resourceEfficiency *= 1.1; // Aumentar eficiência de recursos ao evoluir
		}
	}

	// Verificar também possível regressão tecnológica
	if (
		newCiv.stage > CivilizationStage.PRIMITIVE &&
		(newCiv.population <
			STAGE_POPULATION_REQUIREMENTS[newCiv.stage] * 0.5 ||
			newCiv.resourceLevel <
				STAGE_RESOURCE_REQUIREMENTS[newCiv.stage] * 0.4)
	) {
		// Regride estágio com penalidade de recursos
		newCiv.stage = (newCiv.stage - 1) as CivilizationStage;
		newCiv.resourceLevel = Math.floor(newCiv.resourceLevel * 0.8);
		newCiv.resourceEfficiency *= 0.9; // Diminuir eficiência ao regredir
	}

	// EXPANSÃO TERRITORIAL E BUSCA POR RECURSOS
	// Verificar expansão preferencial em direção a fontes de recursos
	const shouldExpand =
		newCiv.resourceLevel > calculateExpansionCost(newCiv) &&
		Math.random() < newCiv.expansionRate * (1 + newCiv.stage * 0.1);

	if (shouldExpand) {
		const availableNeighbors = getAvailableNeighbors(newCiv, civilizations);
		let targetPosition: Vector2 | null = null;

		// Priorizar expansão em direção a fontes de recursos não descobertas, se existirem
		if (resourceSources.length > 0 && availableNeighbors.length > 0) {
			// Filtrar fontes não descobertas por esta civilização
			const undiscoveredSources = resourceSources.filter(
				(_, index) => !newCiv.discoveredSources.includes(index)
			);

			if (undiscoveredSources.length > 0) {
				// Encontrar a fonte mais próxima de qualquer território atual
				let closestSource = null;
				let minDistance = Infinity;

				for (const source of undiscoveredSources) {
					for (const territory of newCiv.territories) {
						const distance = Math.sqrt(
							Math.pow(territory[0] - source.position[0], 2) +
								Math.pow(territory[1] - source.position[1], 2)
						);

						if (distance < minDistance) {
							minDistance = distance;
							closestSource = source;
						}
					}
				}

				// Se encontrou uma fonte próxima, tentar expandir em sua direção
				if (closestSource) {
					// Calcular o melhor vizinho para expandir em direção à fonte
					let bestNeighbor = null;
					let bestNeighborDistance = Infinity;

					for (const neighbor of availableNeighbors) {
						const distance = Math.sqrt(
							Math.pow(
								neighbor[0] - closestSource.position[0],
								2
							) +
								Math.pow(
									neighbor[1] - closestSource.position[1],
									2
								)
						);

						if (distance < bestNeighborDistance) {
							bestNeighborDistance = distance;
							bestNeighbor = neighbor;
						}
					}

					// Se encontrou um vizinho adequado, expandir para lá
					if (bestNeighbor) {
						targetPosition = bestNeighbor;
					}
				}
			}
		}

		// Se não encontrou um alvo específico, usar a lógica padrão
		if (!targetPosition && availableNeighbors.length > 0) {
			const randomIndex = Math.floor(
				Math.random() * availableNeighbors.length
			);
			targetPosition = availableNeighbors[randomIndex];
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

			// Custo de expansão baseado no estágio e tamanho
			const expansionCost = calculateExpansionCost(newCiv);
			newCiv.resourceLevel = Math.max(
				0,
				newCiv.resourceLevel - expansionCost
			);
		}
	}

	return newCiv;
};
