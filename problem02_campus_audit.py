import sys
from collections import deque

sys.setrecursionlimit(200000)


def read_input():
    tokens = sys.stdin.read().split()
    if not tokens:
        return 0, 0, [], 0, 0, []

    n = int(tokens[0])
    m = int(tokens[1])

    index = 2
    adj = []
    for i in range(n):
        adj.append([])

    for i in range(m):
        u = int(tokens[index])
        v = int(tokens[index + 1])
        adj[u].append(v)
        adj[v].append(u)
        index = index + 2

    s = int(tokens[index])
    q = int(tokens[index + 1])
    index = index + 2

    targets = []
    for i in range(q):
        targets.append(int(tokens[index]))
        index = index + 1

    # Sort each adjacency list ascending to break ties deterministically
    for u in range(n):
        adj[u].sort()

    return n, m, adj, s, q, targets


def dfs_component(u, label, adj, component_label):
    component_label[u] = label
    for v in adj[u]:
        if component_label[v] == -1:
            dfs_component(v, label, adj, component_label)


def dfs_order(u, adj, visited, traversal_order):
    visited[u] = True
    traversal_order.append(u)
    for v in adj[u]:
        if not visited[v]:
            dfs_order(v, adj, visited, traversal_order)


def bfs(s, n, adj):
    dist = [-1] * n
    parent = [-1] * n
    traversal_order = []
    queue = deque()

    # Mark source immediately on enqueue
    dist[s] = 0
    parent[s] = s
    queue.append(s)

    while len(queue) > 0:
        u = queue.popleft()
        traversal_order.append(u)
        for v in adj[u]:
            # Mark when enqueueing so vertices are not queued multiple times
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)

    return traversal_order, dist, parent


def build_path(s, target, parent):
    path = []
    current_vertex = target
    while current_vertex != s:
        path.append(current_vertex)
        current_vertex = parent[current_vertex]
    path.append(s)
    path.reverse()
    return path


def main():
    n, m, adj, s, q, targets = read_input()
    if n == 0:
        return

    # 1. Connected components
    component_label = [-1] * n
    num_components = 0
    for i in range(n):
        if component_label[i] == -1:
            num_components = num_components + 1
            dfs_component(i, i, adj, component_label)

    # 2. Source DFS traversal
    visited = [False] * n
    dfs_traversal = []
    dfs_order(s, adj, visited, dfs_traversal)

    # 3. Source BFS traversal
    bfs_traversal, dist, parent = bfs(s, n, adj)

    # Output results
    print("COMPONENTS " + str(num_components))
    print("LABELS " + " ".join(str(x) for x in component_label))
    print("DFS " + " ".join(str(x) for x in dfs_traversal))
    print("BFS " + " ".join(str(x) for x in bfs_traversal))

    for target in targets:
        if dist[target] == -1:
            print("ROUTE " + str(target) + " UNREACHABLE")
        else:
            path = build_path(s, target, parent)
            print("ROUTE " + str(target) + " " + str(dist[target]) + " " + " ".join(str(x) for x in path))


main()
