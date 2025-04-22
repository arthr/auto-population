import { useRef } from "react";
import {
	Instances,
	Instance,
	OrbitControls,
	GradientTexture,
	Stars,
	Cylinder,
	Html,
} from "@react-three/drei";
import * as THREE from "three";
import {
	CivilizationStage,
	Vector2,
	ResourceSourceType,
	ResourceSource,
} from "../types";
import { WORLD_SIZE } from "../utils/evolutionUtils";
import { useSimulationStore } from "../stores/simulationStore";

export function WorldMap() {
	const groupRef = useRef<THREE.Group>(null);

	// Usar o store zustand
	const { civilizations, conflicts, resourceSources, showAllTooltips } =
		useSimulationStore();

	const cellSize = 1;
	const gridSize = WORLD_SIZE * cellSize;
	const gridOffset = gridSize / 2 - 0.5;

	// Gera uma altura baseada no estágio da civilização
	const getHeightForStage = (stage: CivilizationStage): number => {
		return 0.5 + stage * 0.7; // Aumentamos a altura para um efeito mais visível
	};

	// Converte coordenadas do grid para coordenadas 3D
	const gridToWorld = (pos: Vector2): [number, number, number] => {
		return [
			pos[0] * cellSize - gridOffset,
			0, // A altura será aplicada na escala do objeto
			pos[1] * cellSize - gridOffset,
		];
	};

	// Gera todas as posições ocupadas para instanciamento eficiente
	const occupiedPositions: {
		position: [number, number, number];
		color: string;
		height: number;
		isCapital: boolean;
		stage: CivilizationStage;
	}[] = [];

	// Gera as capitais das civilizações
	const capitals: {
		position: [number, number, number];
		color: string;
		height: number;
		stage: CivilizationStage;
		civId: number;
		population: number;
		age: number;
		territories: number;
		resourceLevel: number;
		birthRate: number;
		mortalityRate: number;
		conflictCount: number;
		resourceProduction: number;
		resourceConsumption: number;
	}[] = [];

	// Gera pontos de conflito para visualização
	const conflictPositions: {
		position: [number, number, number];
		attackerColor: string;
		defenderColor: string;
	}[] = [];

	// Gera pontos de recursos para visualização
	const resourcePositions: {
		position: [number, number, number];
		type: ResourceSourceType;
		richness: number;
		radius: number;
		discovered: boolean;
		color: string;
		sourceIndex: number;
	}[] = [];

	// Cores para os diferentes tipos de recursos
	const resourceColors = {
		[ResourceSourceType.FOREST]: "#2d6a4f", // Verde escuro
		[ResourceSourceType.MINERALS]: "#787878", // Cinza
		[ResourceSourceType.OIL]: "#3d3d3d", // Preto acinzentado
		[ResourceSourceType.FERTILE_LAND]: "#e9c46a", // Amarelo mostarda
	};

	// Função para obter o nome do tipo de recurso
	const getResourceTypeName = (type: ResourceSourceType): string => {
		switch (type) {
			case ResourceSourceType.FOREST:
				return "Floresta";
			case ResourceSourceType.MINERALS:
				return "Minerais";
			case ResourceSourceType.OIL:
				return "Petróleo";
			case ResourceSourceType.FERTILE_LAND:
				return "Terra Fértil";
			default:
				return "Desconhecido";
		}
	};

	// Identificar posições ocupadas e conflitos
	civilizations.forEach((civ) => {
		// Primeiro adicionamos a capital (posição inicial) da civilização
		const capitalPos = gridToWorld(civ.position);
		capitals.push({
			position: capitalPos,
			color: civ.color,
			height: getHeightForStage(civ.stage) * 2, // Torres mais altas para as capitais
			stage: civ.stage,
			civId: civ.id,
			population: civ.population,
			age: civ.age,
			territories: civ.size,
			resourceLevel: civ.resourceLevel,
			birthRate: civ.birthRate,
			mortalityRate: civ.mortalityRate,
			conflictCount: civ.conflictCount,
			resourceProduction: civ.resourceProduction,
			resourceConsumption: civ.resourceConsumption,
		});

		// Depois adicionamos os outros territórios
		civ.territories.forEach((territory) => {
			// Ignoramos a capital que já foi adicionada
			if (
				territory[0] === civ.position[0] &&
				territory[1] === civ.position[1]
			)
				return;

			const worldPos = gridToWorld(territory);
			occupiedPositions.push({
				position: worldPos,
				color: civ.color,
				height: getHeightForStage(civ.stage),
				isCapital: false,
				stage: civ.stage,
			});
		});
	});

	// Processar conflitos para visualização
	conflicts.forEach((conflict) => {
		const attacker = civilizations.find(
			(civ) => civ.id === conflict.attacker
		);
		const defender = civilizations.find(
			(civ) => civ.id === conflict.defender
		);

		if (attacker && defender) {
			const conflictPos = gridToWorld(conflict.position);

			conflictPositions.push({
				position: conflictPos,
				attackerColor: attacker.color,
				defenderColor: defender.color,
			});
		}
	});

	// Processar recursos para visualização
	resourceSources.forEach((source: ResourceSource, index: number) => {
		const resourcePos = gridToWorld(source.position);
		resourcePositions.push({
			position: resourcePos,
			type: source.type,
			richness: source.richness,
			radius: source.radius,
			discovered: source.discovered,
			color: resourceColors[source.type as keyof typeof resourceColors],
			sourceIndex: index,
		});
	});

	// Função para obter o nome do estágio da civilização
	const getStageName = (stage: CivilizationStage): string => {
		return CivilizationStage[stage];
	};

	return (
		<>
			<OrbitControls
				enablePan={true}
				enableZoom={true}
				enableRotate={true}
				minDistance={10}
				maxDistance={200}
			/>

			{/* Terreno mais realista */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -0.1, 0]}
				receiveShadow>
				<planeGeometry args={[gridSize, gridSize, 32, 32]} />
				<meshStandardMaterial>
					<GradientTexture
						stops={[0, 0.2, 0.4, 0.6, 1]}
						colors={[
							"#193c3e",
							"#2d6a4f",
							"#40916c",
							"#52b788",
							"#74c69d",
						]}
						size={1024}
					/>
				</meshStandardMaterial>
			</mesh>

			{/* Grid sutil para orientação */}
			<mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
				<gridHelper
					args={[gridSize, WORLD_SIZE, "#666666", "#444444"]}
				/>
			</mesh>

			{/* Instâncias para territórios */}
			<group ref={groupRef}>
				<Instances limit={WORLD_SIZE * WORLD_SIZE}>
					<boxGeometry />
					<meshStandardMaterial />

					{occupiedPositions.map((data, i) => {
						return (
							<Instance
								key={i}
								position={[
									data.position[0],
									data.height / 2,
									data.position[2],
								]}
								scale={[
									cellSize * 0.85,
									data.height,
									cellSize * 0.85,
								]}
								color={data.color}
							/>
						);
					})}
				</Instances>
			</group>

			{/* Torres para capitais - Base */}
			<group>
				<Instances limit={capitals.length}>
					<boxGeometry />
					<meshStandardMaterial />

					{capitals.map((capital, i) => {
						return (
							<Instance
								key={`capital-base-${i}`}
								position={[
									capital.position[0],
									capital.height * 0.3,
									capital.position[2],
								]}
								scale={[
									cellSize * 0.9,
									capital.height * 0.6,
									cellSize * 0.9,
								]}
								color={capital.color}
							/>
						);
					})}
				</Instances>
			</group>

			{/* Torres para capitais - Parte central */}
			<group>
				<Instances limit={capitals.length}>
					<cylinderGeometry
						args={[cellSize * 0.3, cellSize * 0.4, 1, 8]}
					/>
					<meshStandardMaterial />

					{capitals.map((capital, i) => {
						return (
							<Instance
								key={`capital-middle-${i}`}
								position={[
									capital.position[0],
									capital.height * 0.7 + capital.height * 0.4,
									capital.position[2],
								]}
								scale={[1, capital.height * 0.8, 1]}
								color={capital.color}
							/>
						);
					})}
				</Instances>
			</group>

			{/* Torres para capitais - Topo */}
			<group>
				<Instances limit={capitals.length}>
					<cylinderGeometry args={[0, cellSize * 0.4, 1, 4]} />
					<meshStandardMaterial />

					{capitals.map((capital, i) => {
						return (
							<Instance
								key={`capital-top-${i}`}
								position={[
									capital.position[0],
									capital.height * 1.5 + capital.height * 0.2,
									capital.position[2],
								]}
								scale={[1, capital.height * 0.4, 1]}
								color={capital.color}
							/>
						);
					})}
				</Instances>
			</group>

			{/* Balões informativos para as capitais */}
			{capitals.map((capital) => (
				<group
					key={`info-${capital.civId}`}
					position={[
						capital.position[0],
						capital.height * 2 + 2,
						capital.position[2],
					]}>
					{/* Marcador da civilização sempre visível */}
					<Html distanceFactor={15} center zIndexRange={[100, 0]}>
						<div
							style={{
								background: capital.color,
								padding: "4px 8px",
								borderRadius: "10px",
								color: "#fff",
								fontWeight: "bold",
								transform: "translateY(-50%)",
								opacity: 0.8,
							}}>
							{capital.civId}
						</div>
					</Html>

					{/* Tooltip detalhado que aparece quando global ou localmente ativado */}
					{showAllTooltips && (
						<Html distanceFactor={10} center zIndexRange={[100, 0]}>
							<div
								style={{
									background: "rgba(0, 0, 0, 0.8)",
									padding: "12px",
									borderRadius: "8px",
									boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
									minWidth: "220px",
									transform: "translateY(-100%)",
									color: "#fff",
									pointerEvents: "none",
									border: `2px solid ${capital.color}`,
								}}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										marginBottom: "8px",
										borderBottom:
											"1px solid rgba(255,255,255,0.3)",
										paddingBottom: "4px",
									}}>
									<div
										style={{
											width: "12px",
											height: "12px",
											background: capital.color,
											borderRadius: "50%",
											marginRight: "8px",
										}}
									/>
									<span style={{ fontWeight: "bold" }}>
										Civilização #{capital.civId}
									</span>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "4px",
									}}>
									<div>Estágio:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{getStageName(capital.stage)}
									</div>

									<div>População:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{capital.population.toLocaleString()}
									</div>

									<div>Territórios:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{capital.territories}
									</div>

									<div>Idade:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{capital.age} anos
									</div>

									<div>Recursos:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{Math.floor(
											capital.resourceLevel
										).toLocaleString()}
									</div>

									<div>Produção:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
											color:
												capital.resourceProduction >
												capital.resourceConsumption
													? "#4ade80"
													: "#ef4444",
										}}>
										{capital.resourceProduction}/tick
									</div>

									<div>Consumo:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
											color:
												capital.resourceProduction >
												capital.resourceConsumption
													? "#4ade80"
													: "#ef4444",
										}}>
										{capital.resourceConsumption}/tick
									</div>

									<div>Balanço:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
											color:
												capital.resourceProduction >
												capital.resourceConsumption
													? "#4ade80"
													: "#ef4444",
										}}>
										{capital.resourceProduction -
											capital.resourceConsumption}
										/tick
									</div>

									<div>Natalidade:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{(capital.birthRate * 100).toFixed(1)}%
									</div>

									<div>Mortalidade:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{(capital.mortalityRate * 100).toFixed(
											1
										)}
										%
									</div>

									<div>Crescimento:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
											color:
												capital.birthRate >
												capital.mortalityRate
													? "#4ade80"
													: capital.birthRate <
													  capital.mortalityRate
													? "#ef4444"
													: "#ffffff",
										}}>
										{(
											(capital.birthRate -
												capital.mortalityRate) *
											100
										).toFixed(1)}
										%
									</div>

									<div>Conflitos:</div>
									<div
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}>
										{capital.conflictCount}
									</div>
								</div>
							</div>
						</Html>
					)}
				</group>
			))}

			{/* Visualização de fontes de recursos */}
			<group>
				{resourcePositions.map((resource, i) => (
					<group
						key={`resource-${i}`}
						position={[
							resource.position[0],
							0.2,
							resource.position[2],
						]}>
						{/* Marcador visual da fonte de recurso */}
						<mesh>
							<cylinderGeometry
								args={[
									resource.radius * 0.3,
									resource.radius * 0.15,
									0.3 + resource.richness * 0.1,
									8,
								]}
							/>
							<meshStandardMaterial
								color={resource.color}
								transparent={!resource.discovered}
								opacity={resource.discovered ? 1 : 0.4}
								emissive={resource.color}
								emissiveIntensity={
									resource.discovered ? 0.3 : 0.1
								}
							/>
						</mesh>

						{/* Indicador de área de influência */}
						<mesh
							rotation={[-Math.PI / 2, 0, 0]}
							position={[0, 0, 0]}>
							<ringGeometry
								args={[
									resource.radius * 0.3,
									resource.radius,
									16,
								]}
							/>
							<meshBasicMaterial
								color={resource.color}
								transparent={true}
								opacity={resource.discovered ? 0.2 : 0.05}
							/>
						</mesh>

						{/* Tooltip para fonte de recurso quando descoberta */}
						{resource.discovered && showAllTooltips && (
							<Html
								distanceFactor={10}
								center
								zIndexRange={[100, 0]}
								position={[0, 1.5, 0]}>
								<div
									style={{
										background: "rgba(0, 0, 0, 0.8)",
										padding: "10px",
										borderRadius: "6px",
										boxShadow:
											"0 0 10px rgba(0, 0, 0, 0.5)",
										minWidth: "180px",
										color: "#fff",
										pointerEvents: "none",
										border: `2px solid ${resource.color}`,
									}}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											marginBottom: "6px",
											borderBottom:
												"1px solid rgba(255,255,255,0.3)",
											paddingBottom: "4px",
										}}>
										<div
											style={{
												width: "10px",
												height: "10px",
												background: resource.color,
												borderRadius: "50%",
												marginRight: "8px",
											}}
										/>
										<span style={{ fontWeight: "bold" }}>
											{getResourceTypeName(resource.type)}
										</span>
									</div>

									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "4px",
										}}>
										<div>Riqueza:</div>
										<div
											style={{
												textAlign: "right",
												fontWeight: "bold",
											}}>
											{resource.richness}/10
										</div>

										<div>Raio:</div>
										<div
											style={{
												textAlign: "right",
												fontWeight: "bold",
											}}>
											{resource.radius} tiles
										</div>

										<div>Status:</div>
										<div
											style={{
												textAlign: "right",
												fontWeight: "bold",
											}}>
											Descoberto
										</div>
									</div>
								</div>
							</Html>
						)}

						{/* Pequeno marcador para fonte não descoberta */}
						{!resource.discovered && (
							<Html
								distanceFactor={15}
								center
								zIndexRange={[100, 0]}
								position={[0, 1, 0]}>
								<div
									style={{
										background: "rgba(0, 0, 0, 0.5)",
										padding: "4px 6px",
										borderRadius: "4px",
										color: "#fff",
										fontWeight: "bold",
										opacity: 0.5,
									}}>
									?
								</div>
							</Html>
						)}
					</group>
				))}
			</group>

			{/* Visualização de Conflitos */}
			{conflictPositions.map((conflict, i) => (
				<group
					key={`conflict-${i}`}
					position={[conflict.position[0], 2, conflict.position[2]]}>
					{/* Símbolo de conflito */}
					<Cylinder
						args={[0.1, 0.1, 1.5, 3]}
						position={[0, 0, 0]}
						rotation={[0, 0, Math.PI / 4]}>
						<meshStandardMaterial
							color="#ff0000"
							emissive="#ff0000"
							emissiveIntensity={0.5}
						/>
					</Cylinder>
					<Cylinder
						args={[0.1, 0.1, 1.5, 3]}
						position={[0, 0, 0]}
						rotation={[0, 0, -Math.PI / 4]}>
						<meshStandardMaterial
							color="#ff0000"
							emissive="#ff0000"
							emissiveIntensity={0.5}
						/>
					</Cylinder>

					{/* Indicador animado */}
					<Html distanceFactor={15}>
						<div className="conflict-marker">
							<div
								className="conflict-icon"
								style={{
									width: "20px",
									height: "20px",
									borderRadius: "50%",
									background: "rgba(255,0,0,0.8)",
									boxShadow: "0 0 10px #ff0000",
									animation: "pulse 1s infinite",
								}}
							/>
						</div>
					</Html>
				</group>
			))}

			{/* Iluminação */}
			<ambientLight intensity={0.6} color="#ffffff" />
			<directionalLight
				position={[10, 20, 10]}
				intensity={0.8}
				castShadow
			/>

			{/* Estrelas no fundo */}
			<Stars
				radius={100}
				depth={50}
				count={5000}
				factor={4}
				saturation={0}
			/>
		</>
	);
}
