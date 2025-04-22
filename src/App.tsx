import { CivilizationSimulation } from "./components/CivilizationSimulation";

function App() {
	return (
		<div className="w-screen h-screen overflow-hidden">
			<CivilizationSimulation
				initialCivilizationsCount={5}
				tickSpeed={100}
			/>
		</div>
	);
}

export default App;
