(function (root) {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const entryKey = entry => entry.reference ?? entry.interestMonth ?? (entry.type === 'account opening' ? entry.type : entry.id);

  // Only apply changes made since this device last read the server.
  function merge(base, local, remote, path = []) {
    if (equal(base, local)) return remote;
    if (path.at(-1) === 'ledger' && Array.isArray(local)) {
      const toMap = list => Object.fromEntries((list || []).map(entry => [entryKey(entry), entry]));
      const before = toMap(base), latest = toMap(remote);
      for (const [key, entry] of Object.entries(toMap(local))) {
        if (!equal(entry, before[key])) latest[key] = entry;
      }
      return Object.values(latest).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    }
    // Score entries and job definitions are edited as whole records.
    const score = path[0] === 'daily' && path.length >= 4 && object(local) && ('score' in local || 'state' in local);
    const job = path.length === 3 && path[0] === 'settings' && path[1] === 'taskOverrides';
    if (object(local) && !score && !job) {
      const result = { ...remote };
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local)])) {
        const value = merge(base?.[key], local[key], remote?.[key], [...path, key]);
        if (value === undefined) delete result[key];
        else Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
      }
      return result;
    }
    return local;
  }

  function reconcile(base, local, remote, dayScore) {
    const result = merge(base, local, remote);
    if (result === remote) return result;
    for (const girl of ['abby', 'olivia']) {
      const wallet = result.wallets?.[girl];
      if (!wallet?.ledger) continue;
      const remoteEntries = new Map((remote.wallets?.[girl]?.ledger || []).map(entry => [entry.reference, entry]));
      // A day can contain changes from both phones. Its ledger entry must reflect both.
      result.wallets = { ...result.wallets, [girl]: {
        ...wallet,
        ledger: wallet.ledger.map(entry => {
          const key = /^routine:(\d{4}-\d{2}-\d{2})$/.exec(entry.reference || '')?.[1];
          if (!key || equal(base.daily?.[key], local.daily?.[key])) return entry;
          const current = remoteEntries.get(entry.reference);
          const points = dayScore(result, girl, key);
          return { ...entry, points: current ? current.points + points - dayScore(remote, girl, key) : points };
        })
      } };
    }
    return result;
  }

  root.routineMerge = { equal, reconcile };
})(globalThis);
