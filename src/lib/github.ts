export type GhSettings = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  dir: string;
};

const KEY = "updatehero.github";

export const DEFAULT_SETTINGS: GhSettings = {
  token: "",
  owner: "HEROMODSS",
  repo: "UpdateHero",
  branch: "main",
  dir: "configs",
};

export function loadSettings(): GhSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GhSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: GhSettings) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSettings() {
  window.localStorage.removeItem(KEY);
}

export type UpdateConfig = {
  credit: string;
  enabled: boolean;
  title: string;
  points: string[];
  update_link: string;
  cancel_text: string;
  update_text: string;
  [k: string]: unknown;
};

export const DEFAULT_CONFIG: UpdateConfig = {
  credit: "HERO",
  enabled: true,
  title: "🚀 New Update is Live!",
  points: [
    "🔥 Faster performance and smoother UI",
    "🔒 Improved security and privacy handling",
  ],
  update_link: "https://t.me/heromodss",
  cancel_text: "NOT NOW",
  update_text: "UPDATE NOW",
};

export type VersionEntry = {
  version: string;
  path: string;
  sha: string;
  config: UpdateConfig;
};

export type AppEntry = {
  app: string;
  versions: VersionEntry[];
};

function b64encode(str: string) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function b64decode(b64: string) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function gh(s: GhSettings, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${s.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.status === 204 ? null : await res.json();
}

export function rawUrl(s: GhSettings, app: string, version: string) {
  return `https://raw.githubusercontent.com/${s.owner}/${s.repo}/refs/heads/${s.branch}/${s.dir}/${app}/${version}.json`;
}

export async function verifyRepo(s: GhSettings) {
  const r = await gh(s, `/repos/${s.owner}/${s.repo}`);
  return r as { full_name: string; private: boolean; default_branch: string };
}

type ContentItem = { name: string; path: string; sha: string; type: string };

async function listDir(s: GhSettings, dir: string): Promise<ContentItem[]> {
  try {
    const r = await gh(
      s,
      `/repos/${s.owner}/${s.repo}/contents/${encodeURI(dir)}?ref=${encodeURIComponent(s.branch)}`,
    );
    return Array.isArray(r) ? (r as ContentItem[]) : [];
  } catch (e) {
    if (String(e).includes("404")) return [];
    throw e;
  }
}

export async function loadTree(s: GhSettings): Promise<AppEntry[]> {
  const folders = (await listDir(s, s.dir)).filter((i) => i.type === "dir");
  const apps = await Promise.all(
    folders.map(async (folder) => {
      const files = (await listDir(s, folder.path)).filter(
        (f) => f.type === "file" && f.name.endsWith(".json"),
      );
      const versions = await Promise.all(
        files.map(async (f) => {
          const file = await gh(
            s,
            `/repos/${s.owner}/${s.repo}/contents/${encodeURI(f.path)}?ref=${encodeURIComponent(s.branch)}`,
          );
          let config: UpdateConfig = { ...DEFAULT_CONFIG };
          try {
            config = { ...DEFAULT_CONFIG, ...JSON.parse(b64decode(file.content)) };
          } catch {
            /* keep defaults on malformed json */
          }
          return {
            version: f.name.replace(/\.json$/, ""),
            path: f.path,
            sha: file.sha as string,
            config,
          };
        }),
      );
      versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
      return { app: folder.name, versions };
    }),
  );
  apps.sort((a, b) => a.app.localeCompare(b.app));
  return apps;
}

export async function putConfig(
  s: GhSettings,
  app: string,
  version: string,
  config: UpdateConfig,
  sha?: string,
) {
  const path = `${s.dir}/${app}/${version}.json`;
  const r = await gh(s, `/repos/${s.owner}/${s.repo}/contents/${encodeURI(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `${sha ? "update" : "add"} ${app} ${version}`,
      content: b64encode(JSON.stringify(config, null, 2)),
      branch: s.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  return r.content.sha as string;
}

export async function deleteConfig(s: GhSettings, path: string, sha: string) {
  await gh(s, `/repos/${s.owner}/${s.repo}/contents/${encodeURI(path)}`, {
    method: "DELETE",
    body: JSON.stringify({ message: `delete ${path}`, sha, branch: s.branch }),
  });
}

export function slugify(v: string) {
  return v.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
}
