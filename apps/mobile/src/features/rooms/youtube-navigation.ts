/** Provider navigation is accepted only for exact HTTPS YouTube hosts and video IDs. */
export function youtubeVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (["youtu.be", "www.youtu.be"].includes(url.hostname)) id = parts[0] ?? null;
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (parts.length === 2 && ["shorts", "live", "embed"].includes(parts[0])) id = parts[1];
    }
    return id && /^[\w-]{11}$/.test(id) ? "https://www.youtube.com/watch?v=" + id : null;
  } catch { return null; }
}

export function youtubeBrowseUrl(query: string) {
  return query.trim() ? "https://m.youtube.com/results?search_query=" + encodeURIComponent(query.trim().slice(0, 200)) : "https://m.youtube.com/";
}

export function canBrowseYoutube(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "consent.youtube.com"].includes(url.hostname);
  } catch { return false; }
}
