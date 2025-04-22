# Simulador de Evolução de Civilizações

Um jogo/simulação lowpoly em 3D que demonstra a evolução autônoma de várias civilizações que competem por território e recursos até que uma delas domine o mundo.

## Tecnologias Utilizadas

- **React**: Framework de interface de usuário
- **TypeScript**: Linguagem tipada para melhor desenvolvimento
- **Vite**: Ferramenta de build rápida
- **Tailwind CSS**: Framework CSS utilitário
- **Three.js**: Biblioteca de renderização 3D
- **@react-three/fiber**: Wrapper React para Three.js
- **@react-three/drei**: Componentes utilitários para React Three Fiber

## Como Executar

```bash
# Instalar dependências
npm install

# Iniciar o projeto em modo de desenvolvimento
npm run dev
```

## Funcionalidades

- Visualização 3D do mundo com civilizações evoluindo
- Controles para iniciar, pausar e reiniciar a simulação
- Exibição de estatísticas em tempo real
- Identificação da civilização dominante

## Algoritmo de Evolução Autônoma

O sistema de evolução das civilizações segue os seguintes princípios:

### 1. Inicialização

- Cada civilização começa com:
  - Uma posição aleatória no mapa de grid
  - Um estágio inicial primitivo
  - Uma população inicial de 100
  - Um nível básico de recursos (10)
  - Uma taxa de expansão inicial (0.1)
  - Uma cor única

### 2. Ciclo de Evolução

A cada iteração (ano na simulação), cada civilização passa por estas etapas:

#### Crescimento e Acumulação
- **Crescimento Populacional**: A população cresce a uma taxa que aumenta com o estágio da civilização
- **Acumulação de Recursos**: Recursos aumentam a uma taxa que também depende do estágio
- **Envelhecimento**: A idade da civilização aumenta

#### Expansão Territorial
- Cada civilização tenta expandir seu território para células vizinhas
- A chance de expansão é baseada na taxa de expansão e no estágio da civilização
- A expansão consome recursos

#### Evolução de Estágio
Uma civilização evolui para o próximo estágio quando atinge certos limiares:
- Idade mínima para o estágio
- População mínima para o estágio
- Nível de recursos mínimo para o estágio

Estágios de Evolução:
1. **Primitivo**: Tribal, tecnologia rudimentar
2. **Agrícola**: Agricultura, assentamentos permanentes
3. **Medieval**: Feudalismo, expansão militar
4. **Industrial**: Produção em massa, ciência moderna
5. **Moderno**: Tecnologia avançada, grande expansão

#### Conflitos e Dominação
- Quando duas civilizações tentam ocupar o mesmo território, ocorre um conflito
- A civilização com estágio mais avançado ou maior população vence
- Uma civilização sem territórios é eliminada
- A simulação termina quando uma civilização domina 75% do mundo ou é a última sobrevivente

### 3. Visualização

- Cada civilização é representada por blocos coloridos no mapa 3D
- A altura dos blocos indica o estágio evolutivo da civilização
- Uso de instâncias para otimização da renderização de muitos elementos

## Estrutura do Projeto

- `src/types`: Definições de tipos e interfaces
- `src/utils`: Utilitários para a simulação
- `src/models`: Lógica principal da simulação do mundo
- `src/hooks`: Hooks React para gerenciar o estado
- `src/components`: Componentes da interface e visualização

## Características Técnicas

- Algoritmo autônomo de evolução
- Renderização otimizada usando instâncias Three.js
- Grid de 100x100 para representar o mundo
- Mecanismo de resolução de conflitos baseado em estágios evolutivos
- Interface reativa que mostra estatísticas em tempo real

---

Desenvolvido como um exercício de simulação e visualização 3D usando tecnologias modernas de frontend.
