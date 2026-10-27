# Campus Reachability and Emergency Route Audit
**DAA Hackathon Project — Semester #3**

---

## 📁 Project Structure

```text
├── problem02_campus_audit.py   # Primary solution script (stdin -> stdout)
├── run_tests.py                # Automated test runner
├── visualizer.py               # Optional localhost interactive web visualizer
├── web/                        # Web dashboard assets (HTML, CSS, JS)
└── tests/                      # Test cases (inputs and expected outputs)
    ├── Sample1.in / .out       # Sample test case 1 from problem spec
    ├── Sample2.in / .out       # Sample test case 2 from problem spec
    ├── tie_shortest_route.in   # Custom test (a): tie in shortest paths
    ├── single_vertex.in        # Custom test (b): n=1, m=0 base case
    └── source_not_smallest.in  # Custom test (c): disconnected component
```

---

## 🚀 How to Run

### 1. Automated Test Suite
Run all test cases using:
```bash
python run_tests.py
```

### 2. Run Solution Directly
Pipe any test case into standard input:
```bash
python problem02_campus_audit.py < tests/Sample1.in
```
*(On Windows PowerShell: `Get-Content tests\Sample1.in | python problem02_campus_audit.py`)*

### 3. (Bonus) Launch Localhost Interactive Visualizer
To interactively visualize the graph, animate DFS/BFS step-by-step, and inspect emergency routes in your browser:
```bash
python visualizer.py
```
Open **[http://localhost:8000](http://localhost:8000)** in any browser.

---

## 📊 Complexity Analysis

- **Time Complexity**: $\mathcal{O}(n + m \log n + q \cdot n)$
  - *Adjacency Sorting*: Sorting neighbor lists for each vertex takes $\mathcal{O}(\sum \text{deg}(v) \log \text{deg}(v)) = \mathcal{O}(m \log (\max \text{deg})) \subseteq \mathcal{O}(m \log m)$.
  - *Graph Traversals*: Recursive DFS component labeling, source DFS, and queue BFS each visit each vertex and traverse each edge once: $\mathcal{O}(n + m)$.
  - *Path Reconstruction*: Backtracking through `parent[]` for $q$ targets takes $\mathcal{O}(d) \le \mathcal{O}(n)$ per target, giving $\mathcal{O}(q \cdot n)$ total.
- **Space Complexity**: $\mathcal{O}(n + m)$
  - *Graph Storage*: Adjacency lists store $2m$ directed edges across $n$ vertices.
  - *Auxiliary Structures*: Distance, parent, component label arrays, BFS queue, and DFS recursion stack each take $\mathcal{O}(n)$.
