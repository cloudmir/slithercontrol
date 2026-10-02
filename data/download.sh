#!/bin/sh
# MaleCNS v1.0 flat connectome (CC BY 4.0, Male CNS Connectome Project: FlyEM/HHMI Janelia, Cambridge, MRC LMB, Google Research)
cd "$(dirname "$0")"
BASE=https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome
for f in body-annotations-male-cns-v1.0-minconf-0.5.feather body-neurotransmitters-male-cns-v1.0.feather connectome-weights-male-cns-v1.0-minconf-0.5.feather; do
  [ -f "$f" ] || curl -sSL --fail --retry 3 -o "$f.part" "$BASE/$f" && mv "$f.part" "$f"
done
ls -la *.feather
