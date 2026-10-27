import http.server
import json
import os
import socketserver
import subprocess
import sys
import webbrowser
from collections import deque
from urllib.parse import urlparse

PORT = 8000
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
TESTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests")
SOLUTION_SCRIPT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "problem02_campus_audit.py"
)


def solve_campus_audit(raw_input_text):
    tokens = raw_input_text.split()
    if not tokens or len(tokens) < 2:
        return {"error": "Input is too short or empty."}

    try:
        n = int(tokens[0])
        m = int(tokens[1])
        idx = 2
        edges = []
        adj = [[] for _ in range(n)]
        for _ in range(m):
            u = int(tokens[idx])
            v = int(tokens[idx + 1])
            edges.append((u, v))
            adj[u].append(v)
            adj[v].append(u)
            idx += 2

        s = int(tokens[idx])
        q = int(tokens[idx + 1])
        idx += 2

        targets = [int(tokens[idx + i]) for i in range(q)]
    except Exception as e:
        return {"error": f"Failed to parse input: {str(e)}"}

    # Sort adjacency lists ascending
    for u in range(n):
        adj[u].sort()

    # 1. Connected components
    component_label = [-1] * n
    num_components = 0

    def comp_dfs(u, label):
        component_label[u] = label
        for v in adj[u]:
            if component_label[v] == -1:
                comp_dfs(v, label)

    for i in range(n):
        if component_label[i] == -1:
            num_components += 1
            comp_dfs(i, i)

    # 2. DFS traversal step-by-step
    dfs_visited = [False] * n
    dfs_order = []
    dfs_steps = []

    def dfs(u, p):
        dfs_visited[u] = True
        dfs_order.append(u)
        dfs_steps.append(
            {
                "type": "visit",
                "vertex": u,
                "from": p,
                "visited": [i for i, val in enumerate(dfs_visited) if val],
                "traversal": list(dfs_order),
                "message": (
                    f"Start DFS at source vertex {u}"
                    if p is None
                    else f"DFS entered vertex {u} from neighbor {p}"
                ),
            }
        )
        for v in adj[u]:
            if not dfs_visited[v]:
                dfs(v, u)
            else:
                dfs_steps.append(
                    {
                        "type": "check_visited",
                        "vertex": v,
                        "from": u,
                        "visited": [i for i, val in enumerate(dfs_visited) if val],
                        "traversal": list(dfs_order),
                        "message": f"Neighbor {v} of vertex {u} is already visited. Skipping.",
                    }
                )

    dfs(s, None)

    # 3. BFS traversal step-by-step
    dist = [-1] * n
    parent = [-1] * n
    bfs_order = []
    bfs_steps = []

    dist[s] = 0
    parent[s] = s
    queue = deque([s])

    bfs_steps.append(
        {
            "type": "enqueue",
            "vertex": s,
            "from": None,
            "dist": list(dist),
            "parent": list(parent),
            "queue": list(queue),
            "traversal": list(bfs_order),
            "message": f"Enqueue source vertex {s} (distance 0)",
        }
    )

    while queue:
        u = queue.popleft()
        bfs_order.append(u)
        bfs_steps.append(
            {
                "type": "dequeue",
                "vertex": u,
                "from": parent[u] if u != s else None,
                "dist": list(dist),
                "parent": list(parent),
                "queue": list(queue),
                "traversal": list(bfs_order),
                "message": f"Dequeued vertex {u} (distance {dist[u]})",
            }
        )
        for v in adj[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)
                bfs_steps.append(
                    {
                        "type": "enqueue",
                        "vertex": v,
                        "from": u,
                        "dist": list(dist),
                        "parent": list(parent),
                        "queue": list(queue),
                        "traversal": list(bfs_order),
                        "message": f"Discovered unvisited neighbor {v} from {u}. Set distance={dist[v]}, parent={u}, and enqueue.",
                    }
                )
            else:
                bfs_steps.append(
                    {
                        "type": "already_marked",
                        "vertex": v,
                        "from": u,
                        "dist": list(dist),
                        "parent": list(parent),
                        "queue": list(queue),
                        "traversal": list(bfs_order),
                        "message": f"Neighbor {v} already discovered (distance={dist[v]}). Skipping enqueue.",
                    }
                )

    # Reconstruct routes
    routes = []
    for t in targets:
        if dist[t] == -1:
            routes.append(
                {"target": t, "reachable": False, "distance": -1, "path": []}
            )
        else:
            path = []
            curr = t
            while curr != s:
                path.append(curr)
                curr = parent[curr]
            path.append(s)
            path.reverse()
            routes.append(
                {
                    "target": t,
                    "reachable": True,
                    "distance": dist[t],
                    "path": path,
                }
            )

    # Execute problem02_campus_audit.py directly for raw official stdout
    proc = subprocess.run(
        [sys.executable, SOLUTION_SCRIPT],
        input=raw_input_text,
        text=True,
        capture_output=True,
    )
    raw_stdout = proc.stdout

    return {
        "n": n,
        "m": m,
        "edges": edges,
        "source": s,
        "q": q,
        "targets": targets,
        "components": {
            "count": num_components,
            "labels": component_label,
        },
        "dfs": {
            "order": dfs_order,
            "steps": dfs_steps,
        },
        "bfs": {
            "order": bfs_order,
            "dist": dist,
            "parent": parent,
            "steps": bfs_steps,
        },
        "routes": routes,
        "raw_stdout": raw_stdout,
    }


class VisualizerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/samples":
            sample_files = []
            if os.path.exists(TESTS_DIR):
                for f in sorted(os.listdir(TESTS_DIR)):
                    if f.endswith(".in"):
                        case_name = f[:-3]
                        with open(
                            os.path.join(TESTS_DIR, f), "r", encoding="utf-8"
                        ) as fp:
                            content = fp.read()
                        sample_files.append({"name": case_name, "data": content})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(sample_files).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/audit":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                raw_input = data.get("input", "")
            except Exception:
                raw_input = body

            result = solve_campus_audit(raw_input)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        self.send_error(404, "Endpoint not found")


def run_server():
    port = PORT
    server = None
    while port < PORT + 20:
        try:
            server = socketserver.TCPServer(("", port), VisualizerHandler)
            break
        except OSError:
            port += 1

    if not server:
        print("Could not bind to any port in range 8000-8020.")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print(f"\n=======================================================")
    print(f"🚀 Campus Reachability Visualizer running at: {url}")
    print(f"   Press Ctrl+C to stop the local server.")
    print(f"=======================================================\n")

    try:
        webbrowser.open_new_tab(url)
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()


if __name__ == "__main__":
    run_server()
