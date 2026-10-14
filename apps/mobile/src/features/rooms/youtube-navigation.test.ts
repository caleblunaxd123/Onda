import { describe, expect, it } from "vitest";
import { canBrowseYoutube, youtubeBrowseUrl, youtubeVideoUrl } from "./youtube-navigation";
import { roomPlayerHtml } from "./player-html";

describe("YouTube navigation", () => {
  it("normalizes selected videos and drops unrelated tracking parameters", () => {
    for (const value of ["https://m.youtube.com/watch?v=M7lc1UVf-VE&list=PLtest", "https://youtu.be/M7lc1UVf-VE?t=15", "https://www.youtube.com/shorts/M7lc1UVf-VE"])
      expect(youtubeVideoUrl(value)).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  });
  it("rejects lookalike hosts, credentials, invalid IDs and non HTTPS navigation", () => {
    for (const value of ["http://youtube.com/watch?v=M7lc1UVf-VE", "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE", "https://user@youtube.com/watch?v=M7lc1UVf-VE", "https://youtube.com:444/watch?v=M7lc1UVf-VE", "https://youtube.com/watch?v=short", "javascript:alert(1)"])
      expect(youtubeVideoUrl(value)).toBeNull();
    expect(canBrowseYoutube("https://m.youtube.com/results?search_query=music")).toBe(true);
    expect(canBrowseYoutube("https://accounts.google.com/")).toBe(false);
    expect(youtubeBrowseUrl("rock & pop")).toContain("rock%20%26%20pop");
  });
  function player(host: boolean) {
    let id = "M7lc1UVf-VE", status = 1, position = 12;
    const sent: {kind: string; url?: string}[] = [];
    let events: {onReady: () => void; onStateChange: (event: {data: number}) => void};
    let tick: () => void;
    const mock = {
      getVideoUrl: () => "https://www.youtube.com/watch?v=" + id,
      getCurrentTime: () => position, getPlayerState: () => status, getDuration: () => 100,
      seekTo: (value: number) => { position = value; },
      playVideo: () => { status = 1; }, pauseVideo: () => { status = 2; }, mute() {}, unMute() {},
      loadVideoById: (value: {videoId: string; startSeconds: number}) => { id = value.videoId; position = value.startSeconds; status = 1; },
    };
    const context = {
      URL, Date, parent: {},
      window: { ReactNativeWebView: {postMessage: (value: string) => sent.push(JSON.parse(value))}, addEventListener() {}, onYouTubeIframeAPIReady: () => {}, setRoomPlayback: (_: unknown) => {} },
      YT: {Player: function (_: string, options: {events: typeof events}) {events = options.events; return mock;}},
      document: {createElement: () => ({}), head: {appendChild() {}}},
      setInterval: (callback: () => void) => {tick = callback;},
    };
    const html = roomPlayerHtml({kind: "youtube", title: "Prueba", url: "https://www.youtube.com/watch?v=" + id, videoId: id, station: null}, host, "https://onda-api.lunalav.pe");
    // Execute the actual embedded protocol with controlled provider/browser objects.
    const script = html.slice(html.indexOf("<script>") + 8, html.indexOf("</script>"));
    new Function(...Object.keys(context), script)(...Object.values(context));
    context.window.onYouTubeIframeAPIReady(); events!.onReady();
    return {sent, tick: () => tick!(), state: () => events!.onStateChange({data: status}), playback: context.window.setRoomPlayback,
      select: (value: string) => {id = value; position = 0;}, id: () => id, status: () => status};
  }
  it("broadcasts one source change instead of playback events for the old video", () => {
    const p = player(true); p.select("aqz-KE-bpKQ"); p.state(); p.tick(); p.state();
    expect(p.sent.filter(x => x.kind === "source")).toEqual([{kind: "source", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", position: 0, playing: true}]);
    expect(p.sent.some(x => x.kind === "control")).toBe(false);
  });
  it("restores a guest's local navigation to the shared video and pause state", () => {
    const p = player(false); p.playback({playing: false, position: 12, muted: false});
    p.select("aqz-KE-bpKQ"); p.state(); p.state();
    expect(p.id()).toBe("M7lc1UVf-VE"); expect(p.status()).toBe(2);
    expect(p.sent.some(x => x.kind === "source" || x.kind === "control")).toBe(false);
  });
});
