"""RL in the sim: behavior cloning from the planner (DAgger-style), then PPO fine-tuning.

  python train_rl.py --params runs/best_params.json --bc-steps 30000 --ppo-steps 300000 --envs 4 [--shield]
Writes runs/bc.zip (after cloning) and runs/ppo.zip (after PPO), logs to runs/train_rl.log.
"""
import argparse, json, time
import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv, VecMonitor
from sim import SlitherEnv

GAMMA = 0.995


def make_env(params, shield, seed):
    return lambda: SlitherEnv(params=params, shield=shield, seed=seed)


def collect(vec, n_steps, policy=None, beta=1.0, rng=None):
    """Roll out (expert with prob beta, else policy), label every state with the expert action and MC return."""
    obs = vec.reset()
    O, A, R, D = [], [], [], []
    for _ in range(n_steps // vec.num_envs):
        expert = np.array(vec.env_method('expert'))
        act = expert
        if policy is not None:
            mine = policy.predict(obs, deterministic=False)[0]
            act = np.where(rng.random(len(expert)) < beta, expert, mine)
        O.append(obs)
        A.append(expert)
        obs, r, done, _ = vec.step(act)
        R.append(r)
        D.append(done)
    R, D = np.array(R), np.array(D)
    G, g = np.zeros_like(R), np.zeros(vec.num_envs)
    for t in range(len(R) - 1, -1, -1):
        g = R[t] + GAMMA * g * (1 - D[t])
        G[t] = g
    return np.concatenate(O), np.concatenate(A), G.reshape(-1)


def clone(model, O, A, G, epochs=15, bs=512):
    pol = model.policy
    opt = torch.optim.Adam(pol.parameters(), lr=3e-4)
    o, a, g = torch.as_tensor(O), torch.as_tensor(A), torch.as_tensor(G, dtype=torch.float32)
    for _ in range(epochs):
        perm = torch.randperm(len(o))
        for i in range(0, len(o), bs):
            j = perm[i:i + bs]
            _, logp, _ = pol.evaluate_actions(o[j], a[j])
            v = pol.predict_values(o[j]).squeeze(-1)
            loss = -logp.mean() + 0.5 * ((v - g[j]) ** 2).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
    with torch.no_grad():
        acc = (pol.get_distribution(o).distribution.probs.argmax(-1) == a).float().mean().item()
    return acc


def main(a):
    torch.set_num_threads(2)
    params = json.load(open(a.params)) if a.params else None
    log = open('runs/train_rl.log', 'a')

    def say(s):
        print(s, flush=True)
        log.write(time.strftime('%F %T ') + s + '\n')
        log.flush()

    vec = VecMonitor(SubprocVecEnv([make_env(params, a.shield, 1000 + i) for i in range(a.envs)]))
    model = PPO('MlpPolicy', vec, n_steps=512, batch_size=256, n_epochs=5, learning_rate=1e-4, gamma=GAMMA,
                gae_lambda=0.95, clip_range=0.1, ent_coef=0.003, target_kl=0.02, device='cpu', verbose=0,
                policy_kwargs=dict(net_arch=dict(pi=[256, 256], vf=[256, 256])))
    rng = np.random.default_rng(0)
    if a.bc_steps:
        t0 = time.time()
        data = [collect(vec, a.bc_steps // 3)]
        acc = clone(model, *data[0])
        say(f'BC round 0 (expert rollouts): {len(data[0][0])} samples, acc {acc:.3f}, {time.time() - t0:.0f}s')
        for rnd, beta in enumerate([0.5, 0.2], 1):                  # DAgger: visit the policy's own states
            data.append(collect(vec, a.bc_steps // 3, model, beta, rng))
            acc = clone(model, *[np.concatenate(x) for x in zip(*data)])
            say(f'BC round {rnd} (beta {beta}): {sum(len(d[0]) for d in data)} samples, acc {acc:.3f}, {time.time() - t0:.0f}s')
        model.save('runs/bc.zip')
    if a.ppo_steps:
        t0 = time.time()
        chunk = min(20480, a.ppo_steps)
        for done in range(0, a.ppo_steps, chunk):
            model.learn(chunk, reset_num_timesteps=False)
            ep = [e['r'] for e in model.ep_info_buffer]
            ln = [e['l'] for e in model.ep_info_buffer]
            say(f'PPO {done + chunk} steps: ep_return {np.mean(ep) if ep else 0:.2f} ep_len {np.mean(ln) if ln else 0:.0f} '
                f'({time.time() - t0:.0f}s)')
            model.save('runs/ppo.zip')
    vec.close()


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--params')
    ap.add_argument('--bc-steps', type=int, default=30000)
    ap.add_argument('--ppo-steps', type=int, default=300000)
    ap.add_argument('--envs', type=int, default=4)
    ap.add_argument('--shield', action='store_true')
    main(ap.parse_args())
