import {
	Civilization,
	Vector2,
	Conflict,
	ResourceSource,
	ResourceSourceType,
} from "../types";
import {
	WORLD_SIZE,
	createCivilization,
	getRandomPosition,
	isPositionFree,
	updateCivilization,
	MAX_RESOURCES_PER_TERRITORY,
} from "../utils/evolutionUtils";

export class World {
	civilizations: Civilization[] = [];
	dominantCivilization: Civilization | null = null;
	tickCount: number = 0;
	isRunning: boolean = false;
	// Array para armazenar os conflitos atuais
	conflicts: Conflict[] = [];
	// Mapa para busca rápida de civilizações por posição: key: "x,y", value: civId
	private territoryMap: Map<string, number> = new Map();
	// Fontes de recursos espalhadas pelo mapa
	resourceSources: ResourceSource[] = [];

	constructor(
		private initialCivilizationsCount: number = 10,
		private resourceSourcesCount: number = 20
	) {}

	initialize(): void {
		this.civilizations = [];
		this.dominantCivilization = null;
		this.tickCount = 0;
		this.conflicts = [];
		this.territoryMap.clear();
		this.resourceSources = [];

		// Criar fontes de recursos
		this.generateResourceSources();

		// Criar civilizações iniciais
		for (let i = 0; i < this.initialCivilizationsCount; i++) {
			let position: Vector2;
			let attempts = 0;
			const MAX_ATTEMPTS = 100; // Limite máximo de tentativas para encontrar posição livre

			do {
				position = getRandomPosition();
				attempts++;

				// Se exceder o número máximo de tentativas, forçar uma solução
				if (attempts > MAX_ATTEMPTS) {
					console.warn(
						"Não foi possível encontrar posição livre após várias tentativas"
					);

					// Estratégia 1: Reduzir o número de civilizações restantes
					if (i > this.initialCivilizationsCount / 2) {
						console.warn(
							`Reduzindo o número de civilizações de ${this.initialCivilizationsCount} para ${i}`
						);
						this.initialCivilizationsCount = i;
						break;
					}

					// Estratégia 2: Forçar uma posição, mesmo que ocupada
					// Isso pode criar sobreposições iniciais, mas o sistema de conflitos resolverá
					console.warn(
						"Forçando uma posição para a civilização " + i
					);
					break;
				}
			} while (!isPositionFree(position, this.civilizations));

			const civilization = createCivilization(i, position);
			this.civilizations.push(civilization);

			// Adicionar ao mapa de territórios
			this.territoryMap.set(
				`${position[0]},${position[1]}`,
				civilization.id
			);
		}
	}

	// Gera fontes de recursos aleatórias no mapa
	private generateResourceSources(): void {
		const MIN_DISTANCE_BETWEEN_SOURCES = 5; // Distância mínima entre fontes de recursos

		for (let i = 0; i < this.resourceSourcesCount; i++) {
			let position: Vector2;
			let attempts = 0;
			const MAX_ATTEMPTS = 50;
			let isTooClose = false;

			do {
				position = getRandomPosition();
				attempts++;
				isTooClose = false;

				// Verificar distância das outras fontes
				for (const source of this.resourceSources) {
					const dist = Math.sqrt(
						Math.pow(position[0] - source.position[0], 2) +
							Math.pow(position[1] - source.position[1], 2)
					);
					if (dist < MIN_DISTANCE_BETWEEN_SOURCES) {
						isTooClose = true;
						break;
					}
				}

				if (attempts > MAX_ATTEMPTS) {
					console.warn(
						"Não foi possível posicionar todas as fontes de recursos"
					);
					break;
				}
			} while (isTooClose);

			if (attempts <= MAX_ATTEMPTS) {
				// Determinar tipo de fonte de recursos
				const resourceType = Math.floor(
					Math.random() * 4
				) as ResourceSourceType;

				// Determinar riqueza (1-10)
				const richness = Math.floor(Math.random() * 10) + 1;

				// Determinar raio de influência (1-3)
				const radius = Math.floor(Math.random() * 3) + 1;

				this.resourceSources.push({
					position,
					type: resourceType,
					richness,
					radius,
					discovered: false,
				});
			}
		}
	}

	tick(): void {
		if (!this.isRunning) return;

		this.tickCount++;

		// Atualizar cada civilização, passando as fontes de recursos
		this.civilizations = this.civilizations.map((civ) =>
			updateCivilization(civ, this.civilizations, this.resourceSources)
		);

		// Atualizar o mapa de territórios após a atualização das civilizações
		this.updateTerritoryMap();

		// Verificar quais fontes de recursos foram descobertas
		this.updateResourceSourceDiscovery();

		// Verificar conflitos e conquistas
		this.detectConflicts();
		this.resolveConflicts();

		// Verificar se há uma civilização dominante
		this.checkDominance();
	}

	// Método para atualizar o mapa de territórios
	private updateTerritoryMap(): void {
		this.territoryMap.clear();
		this.civilizations.forEach((civ) => {
			civ.territories.forEach((territory) => {
				this.territoryMap.set(
					`${territory[0]},${territory[1]}`,
					civ.id
				);
			});
		});
	}

	// Método para verificar fontes de recursos descobertas
	private updateResourceSourceDiscovery(): void {
		this.resourceSources.forEach((source, sourceIndex) => {
			// Pular se já foi descoberta
			if (source.discovered) return;

			// Verificar se alguma civilização está no raio da fonte
			this.civilizations.forEach((civ) => {
				// Pular se a civilização já descobriu esta fonte
				if (civ.discoveredSources.includes(sourceIndex)) return;

				// Verificar cada território da civilização
				for (const territory of civ.territories) {
					const distance = Math.sqrt(
						Math.pow(territory[0] - source.position[0], 2) +
							Math.pow(territory[1] - source.position[1], 2)
					);

					// Se dentro do raio, marcar como descoberta
					if (distance <= source.radius) {
						source.discovered = true;
						civ.discoveredSources.push(sourceIndex);

						// Inicializar território da fonte de recursos com valor máximo
						// para que a civilização que descobriu receba um bônus imediato
						const key = source.position.toString();
						if (civ.territoryResources[key] === undefined) {
							civ.territoryResources[key] =
								MAX_RESOURCES_PER_TERRITORY * 2;
						}

						break;
					}
				}
			});
		});
	}

	// Detectar conflitos entre territórios adjacentes
	private detectConflicts(): void {
		// Limpar conflitos antigos
		this.conflicts = [];

		// Para cada civilização
		this.civilizations.forEach((attacker) => {
			// Para cada território da civilização atacante
			attacker.territories.forEach((attackerTerritory) => {
				// Verificar territórios adjacentes
				const adjacentPositions =
					this.getAdjacentPositions(attackerTerritory);

				// Verificar se algum território adjacente pertence a outra civilização
				adjacentPositions.forEach((adjacentPos) => {
					// Encontrar o dono do território adjacente, se houver
					const defender =
						this.getCivilizationAtPosition(adjacentPos);

					// Se houver um dono diferente do atacante, criar um conflito
					if (defender && defender.id !== attacker.id) {
						// Verificar se este conflito já existe (na mesma posição ou invertido)
						const conflictExists = this.conflicts.some(
							(conflict) =>
								(conflict.position[0] === adjacentPos[0] &&
									conflict.position[1] === adjacentPos[1]) ||
								(conflict.attacker === defender.id &&
									conflict.defender === attacker.id)
						);

						if (!conflictExists) {
							this.conflicts.push({
								position: adjacentPos,
								attacker: attacker.id,
								defender: defender.id,
							});
						}
					}
				});
			});
		});
	}

	// Obter posições adjacentes a uma dada posição
	private getAdjacentPositions(position: Vector2): Vector2[] {
		const [x, y] = position;
		const directions = [
			[0, 1],
			[1, 0],
			[0, -1],
			[-1, 0], // Apenas cardeais: norte, leste, sul, oeste
		];

		return directions
			.map(([dx, dy]) => [x + dx, y + dy] as Vector2)
			.filter(
				([nx, ny]) =>
					nx >= 0 && nx < WORLD_SIZE && ny >= 0 && ny < WORLD_SIZE
			);
	}

	// Encontrar a civilização em uma determinada posição usando o mapa de territórios
	private getCivilizationAtPosition(position: Vector2): Civilization | null {
		const key = `${position[0]},${position[1]}`;
		const civId = this.territoryMap.get(key);

		if (civId !== undefined) {
			return this.civilizations.find((civ) => civ.id === civId) || null;
		}
		return null;
	}

	private resolveConflicts(): void {
		// Mapeamento de posições para civilizações
		const territoryMap = new Map<string, Civilization>();

		// Mapa para rastrear as perdas populacionais de cada civilização durante os conflitos
		const populationLosses = new Map<number, number>();

		// Mapa para rastrear quantos conflitos cada civilização está envolvida
		const conflictInvolvement = new Map<number, number>();

		// Identificar conflitos (mesma posição)
		this.civilizations.forEach((civ) => {
			// Inicializar perdas populacionais como zero
			populationLosses.set(civ.id, 0);
			// Inicializar envolvimento em conflitos como zero
			conflictInvolvement.set(civ.id, 0);

			civ.territories.forEach((territory) => {
				const key = `${territory[0]},${territory[1]}`;

				if (territoryMap.has(key)) {
					// Conflito detectado - a civilização mais forte vence
					const existingCiv = territoryMap.get(key)!;

					// Registrar envolvimento em conflito para ambas as civilizações
					conflictInvolvement.set(
						existingCiv.id,
						(conflictInvolvement.get(existingCiv.id) || 0) + 1
					);
					conflictInvolvement.set(
						civ.id,
						(conflictInvolvement.get(civ.id) || 0) + 1
					);

					if (
						civ.stage > existingCiv.stage ||
						(civ.stage === existingCiv.stage &&
							civ.population > existingCiv.population)
					) {
						// A civilização atual é mais forte - conquista o território
						territoryMap.set(key, civ);

						// Calcular perdas populacionais
						// Perdedor perde mais população que o vencedor
						const existingLoss = Math.min(
							Math.floor(existingCiv.population * 0.08), // Perdedor perde 8%
							20000 // Limite máximo de perdas por conflito
						);
						const attackerLoss = Math.min(
							Math.floor(civ.population * 0.03), // Vencedor perde 3%
							8000 // Limite máximo de perdas por conflito
						);

						populationLosses.set(
							existingCiv.id,
							(populationLosses.get(existingCiv.id) || 0) +
								existingLoss
						);
						populationLosses.set(
							civ.id,
							(populationLosses.get(civ.id) || 0) + attackerLoss
						);
					}
				} else {
					territoryMap.set(key, civ);
				}
			});
		});

		// Resolver os conflitos de territórios adjacentes
		this.conflicts.forEach((conflict) => {
			const attacker = this.civilizations.find(
				(civ) => civ.id === conflict.attacker
			);
			const defender = this.civilizations.find(
				(civ) => civ.id === conflict.defender
			);

			if (attacker && defender) {
				// Registrar envolvimento em conflito para ambas as civilizações
				conflictInvolvement.set(
					attacker.id,
					(conflictInvolvement.get(attacker.id) || 0) + 1
				);
				conflictInvolvement.set(
					defender.id,
					(conflictInvolvement.get(defender.id) || 0) + 1
				);

				// Determinar vencedor baseado em estágio, população e um elemento aleatório
				const attackerStrength =
					attacker.stage * 3 +
					Math.log10(attacker.population) +
					Math.random() * 2;
				const defenderStrength =
					defender.stage * 2 +
					Math.log10(defender.population) +
					Math.random() * 3; // Defensor tem vantagem de terreno

				// Posição do conflito
				const key = `${conflict.position[0]},${conflict.position[1]}`;

				// Calcular perdas populacionais com base na intensidade do conflito
				const conflictIntensity = Math.min(
					(attackerStrength + defenderStrength) / 20, // Reduzir a intensidade total
					2.0 // Limitar intensidade máxima
				);
				let attackerLoss = 0;
				let defenderLoss = 0;

				if (attackerStrength > defenderStrength) {
					// Atacante vence
					territoryMap.set(key, attacker);
					// Perdedor (defensor) perde mais população
					attackerLoss = Math.min(
						Math.floor(
							attacker.population * (0.02 + Math.random() * 0.02)
						), // 2-4%
						attacker.population * 0.05, // No máximo 5% da população total
						10000 // Limite máximo absoluto
					);
					defenderLoss = Math.min(
						Math.floor(
							defender.population * (0.05 + Math.random() * 0.05)
						), // 5-10%
						defender.population * 0.15, // No máximo 15% da população total
						25000 // Limite máximo absoluto
					);
				} else {
					// Defensor vence ou mantém o território
					if (territoryMap.has(key)) {
						// Manter o defensor atual
					} else {
						territoryMap.set(key, defender);
					}
					// Perdedor (atacante) perde mais população
					attackerLoss = Math.min(
						Math.floor(
							attacker.population * (0.05 + Math.random() * 0.05)
						), // 5-10%
						attacker.population * 0.15, // No máximo 15% da população total
						25000 // Limite máximo absoluto
					);
					defenderLoss = Math.min(
						Math.floor(
							defender.population * (0.02 + Math.random() * 0.02)
						), // 2-4%
						defender.population * 0.05, // No máximo 5% da população total
						10000 // Limite máximo absoluto
					);
				}

				// Multiplicar pelo fator de intensidade do conflito
				attackerLoss = Math.floor(attackerLoss * conflictIntensity);
				defenderLoss = Math.floor(defenderLoss * conflictIntensity);

				// Registrar perdas populacionais para cada civilização
				populationLosses.set(
					attacker.id,
					(populationLosses.get(attacker.id) || 0) + attackerLoss
				);
				populationLosses.set(
					defender.id,
					(populationLosses.get(defender.id) || 0) + defenderLoss
				);
			}
		});

		// Reconstruir territórios para cada civilização
		const newTerritories = new Map<number, Vector2[]>();

		territoryMap.forEach((civ, posKey) => {
			const [x, y] = posKey.split(",").map(Number);
			const pos: Vector2 = [x, y];

			if (!newTerritories.has(civ.id)) {
				newTerritories.set(civ.id, []);
			}

			newTerritories.get(civ.id)!.push(pos);
		});

		// Atualizar os territórios e aplicar perdas populacionais de cada civilização
		this.civilizations.forEach((civ) => {
			// Atualizar territórios
			if (newTerritories.has(civ.id)) {
				civ.territories = newTerritories.get(civ.id)!;
				civ.size = civ.territories.length;
			} else {
				civ.territories = [];
				civ.size = 0;
			}

			// Aplicar perdas populacionais dos conflitos
			const populationLoss = populationLosses.get(civ.id) || 0;
			civ.population = Math.max(1, civ.population - populationLoss); // Garantir que não chegue a zero

			// Atualizar contador de conflitos da civilização
			const conflictsThisTurn = conflictInvolvement.get(civ.id) || 0;
			civ.conflictCount += conflictsThisTurn;

			// Reduzir a taxa de natalidade com base nos conflitos recentes
			// Fórmula: Cada conflito reduz a taxa de natalidade em 0.2% (0.002), com recuperação gradual
			if (conflictsThisTurn > 0) {
				// Reduzir taxa de natalidade (máximo de 50% de redução)
				const reductionFactor = Math.min(
					0.5,
					conflictsThisTurn * 0.002
				);
				civ.birthRate = Math.max(
					0.01,
					civ.birthRate * (1 - reductionFactor)
				);
			} else {
				// Recuperação gradual da taxa de natalidade quando não há conflitos (0.1% por turno)
				civ.birthRate = Math.min(0.05, civ.birthRate + 0.001);
			}
		});

		// Remover civilizações sem territórios
		this.civilizations = this.civilizations.filter((civ) => civ.size > 0);

		// Transferir descobertas de fontes de recursos quando uma civilização é conquistada
		this.handleResourceSourceTransferAfterConflicts();

		// Atualizar o mapa de territórios após resolver os conflitos
		this.updateTerritoryMap();
	}

	// Transferir fontes de recursos descobertas para civilizações conquistadoras
	private handleResourceSourceTransferAfterConflicts(): void {
		// Para cada fonte de recursos, verificar se alguma civilização a possui
		// Se não, verificar quais civilizações estão próximas e transferir a descoberta
		this.resourceSources.forEach((source, sourceIndex) => {
			if (!source.discovered) return;

			// Verificar se alguma civilização que conhecia a fonte foi eliminada
			let sourceHasOwner = false;

			// Conjunto para armazenar civilizações próximas à fonte
			const nearbyCivilizations = new Set<number>();

			this.civilizations.forEach((civ) => {
				if (civ.discoveredSources.includes(sourceIndex)) {
					sourceHasOwner = true;
				}

				// Verificar se a civilização está próxima à fonte
				for (const territory of civ.territories) {
					const distance = Math.sqrt(
						Math.pow(territory[0] - source.position[0], 2) +
							Math.pow(territory[1] - source.position[1], 2)
					);

					if (distance <= source.radius * 1.5) {
						nearbyCivilizations.add(civ.id);
						break;
					}
				}
			});

			// Se nenhuma civilização conhece a fonte, transferir para as próximas
			if (!sourceHasOwner && source.discovered) {
				nearbyCivilizations.forEach((civId) => {
					const civ = this.civilizations.find((c) => c.id === civId);
					if (civ && !civ.discoveredSources.includes(sourceIndex)) {
						civ.discoveredSources.push(sourceIndex);

						// Adicionar bônus de recurso para a civilização que descobriu
						const key = source.position.toString();
						if (civ.territoryResources[key] === undefined) {
							civ.territoryResources[key] =
								MAX_RESOURCES_PER_TERRITORY * 1.5;
						}
					}
				});
			}
		});
	}

	private checkDominance(): void {
		const totalTerritory = this.civilizations.reduce(
			(sum, civ) => sum + civ.size,
			0
		);
		const worldArea = WORLD_SIZE * WORLD_SIZE;

		// Encontrar a civilização com mais territórios
		let maxSize = 0;
		let dominantCiv: Civilization | null = null;

		for (const civ of this.civilizations) {
			if (civ.size > maxSize) {
				maxSize = civ.size;
				dominantCiv = civ;
			}
		}

		// Verificar dominância com critérios mais precisos:
		if (dominantCiv) {
			// 1. Civilização controla mais de 50% do mapa total
			if (maxSize / worldArea >= 0.5) {
				this.dominantCivilization = dominantCiv;
				this.isRunning = false;
			}
			// 2. Civilização controla mais de 75% do território ocupado
			// e o território ocupado é significativo (>25% do mapa)
			else if (
				maxSize / totalTerritory > 0.75 &&
				totalTerritory / worldArea > 0.25
			) {
				this.dominantCivilization = dominantCiv;
				this.isRunning = false;
			}
		}

		// Parar a simulação se restar apenas uma civilização com território significativo
		if (
			this.civilizations.length === 1 &&
			totalTerritory / worldArea > 0.1
		) {
			this.dominantCivilization = this.civilizations[0];
			this.isRunning = false;
		}
	}

	start(): void {
		this.isRunning = true;
	}

	pause(): void {
		this.isRunning = false;
	}

	reset(): void {
		this.isRunning = false;
		this.initialize();
	}
}
