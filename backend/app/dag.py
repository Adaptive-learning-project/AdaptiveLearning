"""
dag.py — Directed Acyclic Graph (DAG) for curriculum prerequisite structure.

No database, no FastAPI. Pure graph operations only.

Responsibilities:
  - Model the curriculum as a directed dependency graph where each node
    is a subtopic and each directed edge A → B means "A must be mastered
    before B can be presented."
  - Gate node access: a node is only unlocked when ALL its prerequisite
    parent nodes have P(L) >= MASTERY_THRESHOLD (0.85).
  - Support forward traversal: after mastering a node, find the next
    unlocked node(s) the student is ready for.
  - Support backward remediation: when a student is failing a downstream
    node and a parent node has P(L) < 0.85, walk the edges backward to
    find the first unmastered ancestor to re-teach.
  - Validate graph integrity at construction time (cycle detection).

Mastery threshold:
  Imported from bkt.py so the value is never duplicated.

Usage:
    dag = CurriculumDAG()
    dag.add_node("sub_001", "Introduction to Variables")
    dag.add_node("sub_002", "Loops", prerequisites=["sub_001"])
    dag.add_node("sub_003", "Functions", prerequisites=["sub_001", "sub_002"])
    dag.validate()  # raises ValueError on cycle

    mastery_map = {"sub_001": 0.90, "sub_002": 0.30, "sub_003": 0.10}
    dag.get_unlocked_nodes(mastery_map)          # ["sub_002"] — sub_001 mastered, sub_002 not yet
    dag.get_remediation_target("sub_003", mastery_map)  # "sub_002" — first unmastered parent
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.bkt import MASTERY_THRESHOLD


# ═════════════════════════════════════════════════════════════════════════════
# NODE MODEL
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class DAGNode:
    """A single concept node in the curriculum graph."""
    subtopic_id:   str
    name:          str
    prerequisites: List[str] = field(default_factory=list)  # parent subtopic_ids

    def is_root(self) -> bool:
        """Root nodes have no prerequisites — always unlockable."""
        return len(self.prerequisites) == 0


# ═════════════════════════════════════════════════════════════════════════════
# DAG CLASS
# ═════════════════════════════════════════════════════════════════════════════

class CurriculumDAG:
    """
    Directed Acyclic Graph representing the prerequisite structure of a
    curriculum unit.

    Nodes  = subtopics (learning concepts)
    Edges  = prerequisite relationships (parent → child)
             An edge A → B means "master A before attempting B."

    All operations are pure graph traversals. The caller is responsible
    for loading/persisting state to the database.
    """

    def __init__(self) -> None:
        # subtopic_id → DAGNode
        self._nodes: Dict[str, DAGNode] = {}

    # ── Construction ─────────────────────────────────────────────────────────

    def add_node(
        self,
        subtopic_id: str,
        name: str,
        prerequisites: Optional[List[str]] = None,
    ) -> None:
        """
        Register a concept node in the DAG.

        Args:
            subtopic_id:   Unique identifier matching subtopics_col._id.
            name:          Human-readable concept name.
            prerequisites: List of subtopic_ids that must be mastered first.
        """
        self._nodes[subtopic_id] = DAGNode(
            subtopic_id=subtopic_id,
            name=name,
            prerequisites=prerequisites or [],
        )

    def load_from_config(self, config: dict) -> None:
        """
        Populate the DAG from a dag_config_col document.

        Expected format:
            {
                "unit_id": "...",
                "nodes": [
                    {"subtopic_id": "sub_001", "name": "...", "prerequisites": []},
                    {"subtopic_id": "sub_002", "name": "...", "prerequisites": ["sub_001"]},
                ]
            }
        """
        self._nodes.clear()
        for node_data in config.get("nodes", []):
            self.add_node(
                subtopic_id=node_data["subtopic_id"],
                name=node_data.get("name", ""),
                prerequisites=node_data.get("prerequisites", []),
            )

    def to_config(self, unit_id: str) -> dict:
        """
        Serialize the DAG to a dag_config_col document for persistence.
        """
        return {
            "unit_id": unit_id,
            "nodes": [
                {
                    "subtopic_id":   n.subtopic_id,
                    "name":          n.name,
                    "prerequisites": n.prerequisites,
                }
                for n in self._nodes.values()
            ],
        }

    # ── Validation ────────────────────────────────────────────────────────────

    def validate(self) -> None:
        """
        Validate graph integrity. Raises ValueError if:
          - A cycle is detected.
          - A prerequisite references a node not in the graph.
        """
        self._check_missing_references()
        self._detect_cycle()

    def _check_missing_references(self) -> None:
        for node in self._nodes.values():
            for prereq_id in node.prerequisites:
                if prereq_id not in self._nodes:
                    raise ValueError(
                        f"Node '{node.subtopic_id}' references prerequisite "
                        f"'{prereq_id}' which does not exist in the DAG."
                    )

    def _detect_cycle(self) -> None:
        """
        DFS-based cycle detection. Raises ValueError if a cycle exists.

        Uses three-color marking:
          WHITE (0) = not visited
          GRAY  (1) = in current DFS path
          BLACK (2) = fully processed
        """
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {sid: WHITE for sid in self._nodes}

        def dfs(node_id: str) -> None:
            color[node_id] = GRAY
            node = self._nodes[node_id]
            # Traverse to children (nodes that have this node as a prerequisite)
            for child_id, child_node in self._nodes.items():
                if node_id in child_node.prerequisites:
                    if color[child_id] == GRAY:
                        raise ValueError(
                            f"Cycle detected in curriculum DAG involving "
                            f"nodes '{node_id}' and '{child_id}'. "
                            f"Prerequisite chains must be acyclic."
                        )
                    if color[child_id] == WHITE:
                        dfs(child_id)
            color[node_id] = BLACK

        for node_id in self._nodes:
            if color[node_id] == WHITE:
                dfs(node_id)

    # ── Topology ─────────────────────────────────────────────────────────────

    def topological_sort(self) -> List[str]:
        """
        Return subtopic_ids in a valid topological order — prerequisites
        always appear before the nodes that depend on them.

        Used for:
          - Ordering diagnostic questions
          - Determining the canonical learning sequence

        Returns:
            List of subtopic_ids in topological order.

        Raises:
            ValueError: If the graph contains a cycle.
        """
        self._detect_cycle()

        visited: set = set()
        order:   List[str] = []

        def dfs(node_id: str) -> None:
            if node_id in visited:
                return
            visited.add(node_id)
            node = self._nodes[node_id]
            for prereq_id in node.prerequisites:
                dfs(prereq_id)
            order.append(node_id)

        for node_id in self._nodes:
            dfs(node_id)

        return order

    # ── Mastery / gating ─────────────────────────────────────────────────────

    def is_mastered(self, subtopic_id: str, mastery_map: Dict[str, float]) -> bool:
        """
        Return True if P(L) for this node meets the mastery threshold (>= 0.85).

        Args:
            subtopic_id: Node to check.
            mastery_map: Dict mapping subtopic_id → current P(L).
        """
        return mastery_map.get(subtopic_id, 0.0) >= MASTERY_THRESHOLD

    def get_prerequisites(self, subtopic_id: str) -> List[str]:
        """
        Return the direct prerequisite subtopic_ids for a given node.

        Args:
            subtopic_id: Node whose prerequisites are requested.

        Returns:
            List of subtopic_ids that must be mastered before this node.
        """
        node = self._nodes.get(subtopic_id)
        if node is None:
            return []
        return list(node.prerequisites)

    def all_prerequisites_mastered(
        self,
        subtopic_id: str,
        mastery_map: Dict[str, float],
    ) -> bool:
        """
        Return True if every prerequisite of the given node has P(L) >= 0.85.

        Root nodes (no prerequisites) always return True.
        """
        prereqs = self.get_prerequisites(subtopic_id)
        if not prereqs:
            return True
        return all(self.is_mastered(p, mastery_map) for p in prereqs)

    def get_unlocked_nodes(self, mastery_map: Dict[str, float]) -> List[str]:
        """
        Return all nodes that are:
          1. Not yet mastered (P(L) < 0.85).
          2. All prerequisites mastered (P(L) >= 0.85 for each parent).

        These are the nodes the student is currently eligible to work on.
        Sorted by topological order for stable, deterministic selection.

        Args:
            mastery_map: Dict mapping subtopic_id → current P(L).

        Returns:
            List of subtopic_ids the student can currently access.
        """
        topo_order = self.topological_sort()
        unlocked = []
        for sid in topo_order:
            if not self.is_mastered(sid, mastery_map):
                if self.all_prerequisites_mastered(sid, mastery_map):
                    unlocked.append(sid)
        return unlocked

    def get_remediation_target(
        self,
        subtopic_id: str,
        mastery_map: Dict[str, float],
    ) -> Optional[str]:
        """
        Backward remediation: find the first unmastered prerequisite ancestor.

        Walk the prerequisite edges backward from the given node (BFS by
        proximity). Returns the closest unmastered parent that is itself
        fully unlocked (its own prerequisites are all mastered).

        This is triggered when a student is failing a downstream concept
        because they are missing foundational knowledge — the engine
        temporarily redirects the student to the remediation target.

        Args:
            subtopic_id: The node the student is currently struggling on.
            mastery_map: Dict mapping subtopic_id → current P(L).

        Returns:
            subtopic_id of the closest unmastered prerequisite, or None if
            all prerequisites are already mastered (failure is not due to
            a prerequisite gap).
        """
        from collections import deque

        visited = set()
        queue   = deque(self.get_prerequisites(subtopic_id))

        while queue:
            candidate_id = queue.popleft()
            if candidate_id in visited:
                continue
            visited.add(candidate_id)

            if not self.is_mastered(candidate_id, mastery_map):
                # Found an unmastered prerequisite.
                # Check it is itself accessible (its prerequisites are mastered).
                if self.all_prerequisites_mastered(candidate_id, mastery_map):
                    return candidate_id
                # Its prerequisites are also unmastered — keep walking back.
                queue.extend(self.get_prerequisites(candidate_id))

        return None  # No prerequisite gap — all ancestors are mastered

    def get_forward_target(
        self,
        current_subtopic_id: str,
        mastery_map: Dict[str, float],
    ) -> Optional[str]:
        """
        Forward traversal: after mastering the current node, return the next
        node the student should proceed to.

        Returns the first node in topological order that:
          - Is not the current node
          - Is not yet mastered
          - Has all prerequisites mastered (including the current node,
            which was just mastered)

        Args:
            current_subtopic_id: The node just mastered.
            mastery_map:         Dict mapping subtopic_id → current P(L).
                                 Should already include the current node's
                                 new P(L) >= 0.85 before calling this.

        Returns:
            subtopic_id of the next node, or None if all nodes are mastered.
        """
        topo_order = self.topological_sort()
        for sid in topo_order:
            if sid == current_subtopic_id:
                continue
            if not self.is_mastered(sid, mastery_map):
                if self.all_prerequisites_mastered(sid, mastery_map):
                    return sid
        return None  # All nodes mastered — unit complete

    # ── Introspection ─────────────────────────────────────────────────────────

    def get_node(self, subtopic_id: str) -> Optional[DAGNode]:
        """Return a node by subtopic_id, or None if not found."""
        return self._nodes.get(subtopic_id)

    def all_node_ids(self) -> List[str]:
        """Return all subtopic_ids registered in this DAG."""
        return list(self._nodes.keys())

    def __len__(self) -> int:
        return len(self._nodes)

    def __contains__(self, subtopic_id: str) -> bool:
        return subtopic_id in self._nodes

    def __repr__(self) -> str:
        edges = []
        for node in self._nodes.values():
            for prereq in node.prerequisites:
                edges.append(f"{prereq} → {node.subtopic_id}")
        return f"CurriculumDAG(nodes={len(self._nodes)}, edges={edges})"
