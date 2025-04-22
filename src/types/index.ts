export enum CivilizationStage {
	PRIMITIVE = 0,
	AGRICULTURAL = 1,
	MEDIEVAL = 2,
	INDUSTRIAL = 3,
	MODERN = 4,
}

export type Vector2 = [number, number];

// Tipos de fontes de recursos
export enum ResourceSourceType {
	FOREST = 0, // Fornece recursos extras para civilizações primitivas/agrícolas
	MINERALS = 1, // Fornece recursos extras para civilizações medievais/industriais
	OIL = 2, // Fornece recursos extras para civilizações industriais/modernas
	FERTILE_LAND = 3, // Maior produção de recursos para todas as civilizações
}

// Interface para representar fontes de recursos no mapa
export interface ResourceSource {
	position: Vector2;
	type: ResourceSourceType;
	richness: number; // 1-10, indica a riqueza da fonte
	radius: number; // Raio de influência (em tiles)
	discovered: boolean; // Se já foi descoberta por alguma civilização
}

export interface Civilization {
	id: number;
	position: Vector2;
	color: string;
	stage: CivilizationStage;
	size: number;
	population: number;
	resourceLevel: number;
	expansionRate: number;
	territories: Vector2[];
	age: number;
	birthRate: number;
	mortalityRate: number; // Taxa de mortalidade da população
	conflictCount: number;
	resourceEfficiency: number;
	territoryResources: { [territoryKey: string]: number };
	discoveredSources: number[]; // IDs das fontes de recursos descobertas por esta civilização
	resourceProduction: number; // Quantidade de recursos produzidos por tick
	resourceConsumption: number; // Quantidade de recursos consumidos por tick
}

export interface Conflict {
	position: Vector2;
	attacker: number;
	defender: number;
}
