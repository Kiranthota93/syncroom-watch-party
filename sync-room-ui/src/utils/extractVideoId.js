const extractVideoId = (input) => {
  if (!input) return null;

  const trimmed = input.trim();

  // Bare 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);

    // youtube.com/watch?v=ID
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;

      // youtube.com/embed/ID  or  /v/ID  or  /shorts/ID
      const match = url.pathname.match(/\/(embed|v|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[2];
    }

    // youtu.be/ID
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("?")[0];
      if (id.length === 11) return id;
    }
  } catch {
    // Not a parseable URL — fall through
  }

  return null;
};

export default extractVideoId;
