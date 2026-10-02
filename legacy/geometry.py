"""Vectorized Euclidean geometry. No game state or policy dependencies."""
import numpy as np
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist


def nearest_gap(p, circles, k=24):
    """Exact min over circles of |p - centre| - radius, for points p (N, 2).

    Uses the k nearest centres; a circle outside them is at least D_k away and
    so cannot beat D_k - r_max. Points where that bound fails fall back to a
    full scan, so the result equals the brute-force minimum.
    """
    p = np.asarray(p, float).reshape(-1, 2)
    if not len(circles):
        return np.full(len(p), np.inf)
    k = min(k, len(circles))
    dist, idx = cKDTree(circles[:, :2]).query(p, k)
    dist, idx = dist.reshape(len(p), k), idx.reshape(len(p), k)
    best = (dist-circles[idx, 2]).min(1)
    if k < len(circles):
        unsure = best > dist[:, -1]-circles[:, 2].max()
        if unsure.any():
            q = p[unsure]; exact = np.full(len(q), np.inf)
            for chunk in np.array_split(circles, max(1, (len(circles)+255)//256)):
                exact = np.minimum(exact, (cdist(q, chunk[:, :2])-chunk[:, 2]).min(1))
            best[unsure] = exact
    return best


def point_segment(p, a, b):
    v = b - a
    t = np.clip(np.sum((p-a)*v, axis=-1) / np.maximum(np.sum(v*v, axis=-1), 1e-12), 0, 1)
    return np.linalg.norm(p-a-t[..., None]*v, axis=-1)


def segment_distance(a, b, c, d):
    """Distance between broadcasting arrays of closed 2D segments, including crossings."""
    u, v, w = b-a, d-c, c-a
    cross = lambda x, y: x[..., 0]*y[..., 1]-x[..., 1]*y[..., 0]
    den = cross(u, v)
    nz = np.abs(den) > 1e-12
    div = np.where(nz, den, 1)
    s, t = cross(w, v)/div, cross(w, u)/div
    hit = nz & (s >= 0) & (s <= 1) & (t >= 0) & (t <= 1)
    dist = np.minimum.reduce([point_segment(a,c,d), point_segment(b,c,d),
                              point_segment(c,a,b), point_segment(d,a,b)])
    return np.where(hit, 0, dist)


def moving_distance(a, b, c, d):
    """Minimum synchronized separation during two linear movements over one tick."""
    return point_segment(np.zeros_like(a-c), a-c, b-d)
